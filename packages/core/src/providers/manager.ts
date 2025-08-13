/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Provider Manager - Bridge between Warpio CLI and Vercel AI SDK
 *
 * This manager provides a transition layer between the existing ContentGenerator
 * interface and the new Vercel AI SDK provider system.
 */

import { generateText, streamText, tool, embed, jsonSchema } from 'ai';
import type { LanguageModel, CoreMessage } from 'ai';
import { z } from 'zod';
import {
  getLanguageModel,
  parseProviderConfig,
  type ProviderConfig,
} from './registry.js';
import type { ContentGenerator } from '../core/contentGenerator.js';
import { UserTierId } from '../code_assist/types.js';
import {
  FinishReason,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
} from '@google/genai';

/**
 * AI SDK Provider Manager - Implements ContentGenerator interface using Vercel AI SDK
 */
export class AISDKProviderManager implements ContentGenerator {
  private model: LanguageModel;
  private config: ProviderConfig;
  private fallbackModel?: LanguageModel;
  private isProviderAvailable: boolean = true;

  constructor(config?: Partial<ProviderConfig>) {
    this.config = { ...parseProviderConfig(), ...config };
    this.model = getLanguageModel(this.config);

    // Set up fallback to Gemini if not already using Gemini
    if (this.config.provider !== 'gemini') {
      this.fallbackModel = getLanguageModel({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      });
    }
  }

  /**
   * Check if the current provider is available
   */
  private async checkProviderAvailability(): Promise<boolean> {
    try {
      // Quick test with minimal generation
      await generateText({
        model: this.model,
        messages: [{ role: 'user' as const, content: 'test' }],
        maxOutputTokens: 1,
        temperature: 0,
      });
      this.isProviderAvailable = true;
      return true;
    } catch (error: unknown) {
      // Check if it's a connection error
      if (this.isConnectionError(error)) {
        this.isProviderAvailable = false;
        return false;
      }
      // Other errors (like auth) should throw
      throw error;
    }
  }

  /**
   * Check if an error is a connection error
   */
  private isConnectionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    
    const errorObj = error as { code?: string; message?: string };
    const errorMessage = errorObj.message || String(error);
    const errorCode = errorObj.code;
    
    return (
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ECONNRESET' ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('Connection refused') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('connect ETIMEDOUT')
    );
  }

  /**
   * Get the active model, with fallback if needed
   */
  private async getActiveModel(): Promise<LanguageModel> {
    // Simply return the current model - fallback is handled in error cases
    // Checking availability here causes double generation calls
    return this.model;
  }

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    console.debug(`[${this.config.provider}] Generating content for prompt ID: ${userPromptId}`);
    try {
      // Get the active model (with fallback if needed)
      const activeModel = await this.getActiveModel();
      // Check if JSON mode is requested
      const isJsonMode =
        request.config?.responseMimeType === 'application/json' ||
        request.config?.responseJsonSchema;

      // Build the generation config
      const convertedTools = this.convertTools(request.config?.tools);

      const messages = this.convertContentsToMessages(request.contents);

      const genConfig: {
        model: LanguageModel;
        messages: CoreMessage[];
        tools?: Record<string, unknown>;
        temperature?: number;
        maxOutputTokens?: number;
        maxRetries?: number;
        system?: string;
        stop?: string[];
        topP?: number;
        responseFormat?: { type: string };
      } = {
        model: activeModel,
        messages,
        tools: convertedTools,
        temperature: request.config?.temperature,
        maxOutputTokens: request.config?.maxOutputTokens,
        maxRetries: 3,
        system: this.extractSystemMessage(request.config?.systemInstruction),
      };

      // Apply model-specific configurations for LM Studio
      if (this.config.provider === 'lmstudio') {
        const modelId =
          typeof activeModel === 'string' ? activeModel : activeModel.modelId;
        const modelConfig = this.getLMStudioModelConfig(modelId);

        // Apply stop tokens
        if (modelConfig.stop) {
          genConfig.stop = modelConfig.stop;
        }

        // Apply temperature if not explicitly set
        if (!genConfig.temperature && modelConfig.temperature) {
          genConfig.temperature = modelConfig.temperature;
        }

        // Apply other model-specific settings
        if (modelConfig.top_p) {
          genConfig.topP = modelConfig.top_p;
        }
      }

      // Handle JSON mode for OpenAI-compatible models
      if (isJsonMode && this.config.provider !== 'gemini') {
        // For OpenAI-compatible models, add JSON mode instruction
        const jsonSchema = request.config?.responseJsonSchema;
        const schemaDescription = jsonSchema
          ? `\n\nYou must respond with valid JSON that matches this schema:\n${JSON.stringify(jsonSchema, null, 2)}`
          : '\n\nYou must respond with valid JSON.';

        // Append JSON instruction to the last user message
        const messages = genConfig.messages;
        if (messages && messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.role === 'user') {
            lastMessage.content = lastMessage.content + schemaDescription;
          } else {
            // Add a new user message with JSON instruction
            messages.push({
              role: 'user' as const,
              content: `Please format your response as JSON.${schemaDescription}`,
            });
          }
        }

        // Some providers support response_format
        if (
          this.config.provider === 'openai' ||
          this.config.provider === 'lmstudio'
        ) {
          genConfig.responseFormat = { type: 'json_object' };
        }
      }

      const result = await generateText(genConfig);

      // Mark provider as available if successful
      if (activeModel === this.model) {
        this.isProviderAvailable = true;
      }

      // If JSON mode, ensure the response is valid JSON
      let finalText = result.text;
      if (isJsonMode) {
        try {
          // Validate that the response is JSON
          JSON.parse(finalText);
        } catch (e) {
          // Try to extract JSON from the response
          const jsonMatch = finalText.match(/\{[\s\S]*\}/m);
          if (jsonMatch) {
            finalText = jsonMatch[0];
          }
        }
      }

      return this.convertToGenerateContentResponse({
        ...result,
        text: finalText,
      });
    } catch (error: unknown) {
      console.error(
        `[${this.config.provider}] Error in generateContent:`,
        error.message || error,
      );

      // If it's a connection error and we have a fallback, try with fallback
      if (
        this.isConnectionError(error) &&
        this.fallbackModel &&
        !this.isProviderAvailable
      ) {
        this.isProviderAvailable = false;

        // Rebuild config with fallback model
        const fallbackConfig = {
          model: this.fallbackModel,
          messages: this.convertContentsToMessages(request.contents),
          tools: this.convertTools(request.config?.tools),
          temperature: request.config?.temperature,
          maxOutputTokens: request.config?.maxOutputTokens,
          maxRetries: 3,
          system: this.extractSystemMessage(request.config?.systemInstruction),
        };
        const result = await generateText(fallbackConfig);
        return this.convertToGenerateContentResponse(result);
      }

      throw error;
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this._generateContentStream(request, userPromptId);
  }

  private async *_generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): AsyncGenerator<GenerateContentResponse> {
    console.debug(`[${this.config.provider}] Streaming content for prompt ID: ${userPromptId}`);
    try {
      const activeModel = await this.getActiveModel();

      const convertedToolsStream = this.convertTools(request.config?.tools);

      const streamConfig: {
        model: LanguageModel;
        messages: CoreMessage[];
        tools?: Record<string, unknown>;
        temperature?: number;
        maxOutputTokens?: number;
        maxRetries?: number;
        system?: string;
        stop?: string[];
        topP?: number;
      } = {
        model: activeModel,
        messages: this.convertContentsToMessages(request.contents),
        tools: convertedToolsStream,
        temperature: request.config?.temperature,
        maxOutputTokens: request.config?.maxOutputTokens,
        maxRetries: 3,
        system: this.extractSystemMessage(request.config?.systemInstruction),
      };

      // Apply model-specific configurations for LM Studio
      if (this.config.provider === 'lmstudio') {
        const modelId =
          typeof activeModel === 'string' ? activeModel : activeModel.modelId;
        const modelConfig = this.getLMStudioModelConfig(modelId);

        // Apply stop tokens
        if (modelConfig.stop) {
          streamConfig.stop = modelConfig.stop;
        }

        // Apply temperature if not explicitly set
        if (!streamConfig.temperature && modelConfig.temperature) {
          streamConfig.temperature = modelConfig.temperature;
        }

        // Apply other model-specific settings
        if (modelConfig.top_p) {
          streamConfig.topP = modelConfig.top_p;
        }
      }

      const result = streamText(streamConfig);

      // Stream text chunks as Gemini-format responses
      for await (const textPart of result.textStream) {
        const response = new GenerateContentResponse();
        response.candidates = [
          {
            content: {
              role: 'model',
              parts: [{ text: textPart }],
            },
            finishReason: FinishReason.STOP,
            index: 0,
            safetyRatings: [],
          },
        ];
        response.usageMetadata = {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
        };
        yield response;
      }

      // Final response with usage info (but no duplicate text)
      const finalResult = await result;
      const finalResponse = new GenerateContentResponse();
      finalResponse.candidates = [
        {
          content: {
            role: 'model',
            parts: [], // Empty parts to avoid duplicating text
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: [],
        },
      ];
      const usage = await finalResult.usage;
      const usageData = usage as { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
      finalResponse.usageMetadata = {
        promptTokenCount: usageData?.promptTokens || 0,
        candidatesTokenCount: usageData?.completionTokens || 0,
        totalTokenCount: usageData?.totalTokens || 0,
      };
      yield finalResponse;
    } catch (error) {
      throw error;
    }
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // Use a quick inference call to get accurate token counts
    try {
      const messages = this.convertContentsToMessages(request.contents);

      // Make a minimal call with max_tokens=1 to get token count without generating much
      const result = await generateText({
        model: this.model,
        messages,
        maxOutputTokens: 1,
        temperature: 0,
      });

      const usage = await result.usage;

      return {
        totalTokens: usage.inputTokens || 0,
      };
    } catch (error) {
      // Fallback to estimation if the model doesn't support minimal generation
      let text = '';
      if (request.contents) {
        if (typeof request.contents === 'string') {
          text = request.contents;
        } else if (Array.isArray(request.contents)) {
          text = request.contents
            .map(
              (c: { parts?: { text?: string }[] }) =>
                c.parts
                  ?.map((p: { text?: string }) => p.text || '')
                  .join(' ') || '',
            )
            .join(' ');
        }
      }

      // Use a more accurate estimation based on common tokenization patterns
      // Average English word is ~1.3 tokens, average character is ~0.25 tokens
      const words = text.split(/\s+/).length;
      const estimatedTokens = Math.ceil(words * 1.3);

      return {
        totalTokens: estimatedTokens,
      };
    }
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    try {
      // Extract text from the request
      let textToEmbed = '';
      if (request.contents) {
        if (typeof request.contents === 'string') {
          textToEmbed = request.contents;
        } else if (Array.isArray(request.contents)) {
          textToEmbed = request.contents
            .map((part: string | { text?: string }) => {
              if (typeof part === 'string') return part;
              if (typeof part === 'object' && part.text) return part.text;
              return '';
            })
            .join(' ');
        } else if (
          typeof request.contents === 'object' &&
          (request.contents as { text?: string }).text
        ) {
          textToEmbed = (request.contents as { text: string }).text;
        }
      }

      // Check if the model supports embeddings
      // For providers that don't have embedding models, fall back to a simple hash-based approach
      const provider = this.config.provider || 'gemini';

      if (provider === 'gemini') {
        // Gemini doesn't use the standard embed function, return a placeholder
        // The actual Gemini embedding would be handled by the Google SDK
        const hashCode = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
          }
          return hash;
        };

        // Generate a deterministic embedding based on text hash
        const baseHash = hashCode(textToEmbed);
        const embedding = new Array(768).fill(0).map((_, i) => {
          // Create a pseudo-random but deterministic value
          const seed = baseHash + i;
          return (Math.sin(seed) * Math.cos(seed * 2) * Math.sin(seed * 3)) / 3;
        });

        return {
          embeddings: [
            {
              values: embedding,
            },
          ],
        };
      }

      // For OpenAI-compatible providers (LMStudio, Ollama), use the embed function
      // Note: We're using the language model as an embedding model - this may need proper typing
      const { embedding } = await embed({
        model: this.model as unknown as Parameters<typeof embed>[0]['model'],
        value: textToEmbed,
      });

      return {
        embeddings: [
          {
            values: embedding,
          },
        ],
      };
    } catch (error) {
      // If embedding fails, provide a fallback

      // Simple fallback: create a fixed-size array based on text characteristics
      const text =
        typeof request.contents === 'string'
          ? request.contents
          : JSON.stringify(request.contents);
      const embedding = new Array(768).fill(0).map((_, i) => {
        const charCode = text.charCodeAt(i % text.length) || 0;
        return (charCode / 255 - 0.5) * 2; // Normalize to [-1, 1]
      });

      return {
        embeddings: [
          {
            values: embedding,
          },
        ],
      };
    }
  }

  userTier?: UserTierId;

  /**
   * Convert Gemini Content format to AI SDK messages format
   */
  private convertContentsToMessages(contents: unknown): CoreMessage[] {
    if (!contents) return [];
    if (typeof contents === 'string') {
      return [{ role: 'user', content: contents }];
    }
    if (!Array.isArray(contents)) return [];

    return (contents as Array<{ role: string; parts: Array<{ text?: string; functionCall?: { name: string }; functionResponse?: unknown }> }>).map((content) => ({
      role:
        content.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: content.parts
        .map(
          (part: {
            text?: string;
            functionCall?: { name: string; [key: string]: unknown };
            functionResponse?: unknown;
          }) => {
            if ('text' in part) return part.text;
            if ('functionCall' in part)
              return `[Function Call: ${part.functionCall.name}]`;
            if ('functionResponse' in part)
              return `[Function Response: ${JSON.stringify(part.functionResponse)}]`;
            return '';
          },
        )
        .join('\n'),
    }));
  }

  /**
   * Convert Gemini tools to AI SDK tools format
   */
  private convertTools(geminiTools?: any[]): Record<string, any> | undefined {
    if (!geminiTools || geminiTools.length === 0) return undefined;

    const tools: Record<string, any> = {};

    for (const geminiTool of geminiTools) {
      if (geminiTool.functionDeclarations) {
        for (const func of geminiTool.functionDeclarations) {
          // Get the schema and ensure it has proper type fields for LMStudio
          const paramSchema = func.parameters ||
            func.parametersJsonSchema || { type: 'object', properties: {} };

          // Fix schema by ensuring ALL objects have type: 'object' (recursive)
          this.ensureObjectTypes(paramSchema);

          // Provider-specific handling for OpenAI-compatible providers (LMStudio/Ollama)
          // These providers need JSON Schema wrapped with jsonSchema() for proper serialization
          if (
            this.config.provider === 'lmstudio' ||
            this.config.provider === 'ollama'
          ) {
            // For OpenAI-compatible providers, use jsonSchema() wrapper
            // This ensures the schema is properly serialized with type: 'object'
            tools[func.name] = tool({
              description: func.description || `Tool: ${func.name}`,
              inputSchema: jsonSchema(paramSchema),
              execute: async (args) =>
                // Return args for Gemini's tool execution system to handle
                ({ toolCallId: func.name, args }),
            });
          } else {
            // For Gemini and other providers, use Zod schema as before
            const inputSchema = this.jsonSchemaToZod(paramSchema);

            tools[func.name] = tool({
              description: func.description || `Tool: ${func.name}`,
              inputSchema,
              execute: async (args) =>
                // Return args for Gemini's tool execution system to handle
                ({ toolCallId: func.name, args }),
            });
          }
        }
      }
    }

    return Object.keys(tools).length > 0 ? tools : undefined;
  }

  /**
   * Recursively ensure all objects in JSON schema have type: 'object'
   */
  private ensureObjectTypes(schema: any): void {
    if (!schema || typeof schema !== 'object') return;

    // Normalize type to lowercase (handles OBJECT -> object, STRING -> string, etc.)
    if (schema.type && typeof schema.type === 'string') {
      schema.type = schema.type.toLowerCase();
    }

    // If it has properties but no type, it's an object
    if (schema.properties && !schema.type) {
      schema.type = 'object';
    }

    // Recursively fix all properties
    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) {
        this.ensureObjectTypes(prop);
      }
    }

    // Handle array items
    if (schema.items) {
      this.ensureObjectTypes(schema.items);
    }
  }

  /**
   * Convert JSON Schema to Zod schema with proper OpenAI serialization
   */
  private jsonSchemaToZod(jsonSchema: any): z.ZodSchema {
    if (!jsonSchema) {
      return z.object({});
    }

    // Ensure we always have an object schema at the root
    if (!jsonSchema.type || jsonSchema.type === 'object') {
      if (jsonSchema.properties) {
        const shape: Record<string, z.ZodSchema> = {};
        for (const [key, value] of Object.entries(jsonSchema.properties)) {
          let fieldSchema = this.jsonSchemaToZod(value as any);
          // Make field optional if not in required array
          if (!jsonSchema.required || !jsonSchema.required.includes(key)) {
            fieldSchema = fieldSchema.optional();
          }
          shape[key] = fieldSchema;
        }
        return z.object(shape);
      }
      return z.object({});
    }

    // Handle other types
    switch (jsonSchema.type) {
      case 'array':
        if (jsonSchema.items) {
          return z.array(this.jsonSchemaToZod(jsonSchema.items));
        }
        return z.array(z.any());

      case 'string':
        const stringSchema = z.string();
        if (jsonSchema.enum) {
          return z.enum(jsonSchema.enum as [string, ...string[]]);
        }
        return stringSchema;

      case 'number':
        return z.number();

      case 'integer':
        return z.number().int();

      case 'boolean':
        return z.boolean();

      default:
        return z.any();
    }
  }

  /**
   * Convert AI SDK result to Gemini response format
   */
  private convertToGenerateContentResponse(
    result: any,
  ): GenerateContentResponse {
    const response = new GenerateContentResponse();
    response.candidates = [
      {
        content: {
          role: 'model',
          parts:
            result.toolCalls && result.toolCalls.length > 0
              ? result.toolCalls.map((tc: any) => ({
                  functionCall: {
                    name: tc.toolName,
                    args: tc.args,
                  },
                }))
              : [{ text: result.text }],
        },
        finishReason: this.mapFinishReason(result.finishReason || 'stop'),
        index: 0,
        safetyRatings: [],
      },
    ];
    response.usageMetadata = {
      promptTokenCount: (result.usage as any)?.promptTokens || 0,
      candidatesTokenCount: (result.usage as any)?.completionTokens || 0,
      totalTokenCount: (result.usage as any)?.totalTokens || 0,
    };
    return response;
  }

  /**
   * Get model-specific configuration for LM Studio models
   */
  private getLMStudioModelConfig(modelId: string) {
    const model = modelId.toLowerCase();

    if (model.includes('gpt-oss') || model.includes('20b')) {
      // gpt-oss:20b Harmony format requirements
      return {
        temperature: 1.0,
        stop: ['<|endoftext|>', '<|return|>'],
        top_p: 0.95,
        max_tokens: 2048,
      };
    } else if (model.includes('qwen')) {
      // qwen3:4b standard OpenAI format
      return {
        temperature: 0.7,
        stop: ['<|im_end|>', '<|endoftext|>'],
        top_p: 0.9,
        max_tokens: 2048,
      };
    }

    // Default configuration for unknown models
    return {
      temperature: 0.7,
      stop: ['<|endoftext|>'],
      max_tokens: 2048,
    };
  }

  /**
   * Map AI SDK finish reasons to Gemini format
   */
  private mapFinishReason(aiFinishReason: string | undefined): FinishReason {
    switch (aiFinishReason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.MAX_TOKENS;
      case 'content-filter':
        return FinishReason.SAFETY;
      case 'tool-calls':
        return FinishReason.STOP;
      default:
        return FinishReason.OTHER;
    }
  }

  /**
   * Extract system message from various formats
   */
  private extractSystemMessage(systemInstruction: any): string | undefined {
    if (!systemInstruction) return undefined;
    if (typeof systemInstruction === 'string') return systemInstruction;
    if (Array.isArray(systemInstruction)) {
      // Handle PartUnion[]
      const firstPart = systemInstruction[0];
      if (firstPart && typeof firstPart === 'object' && 'text' in firstPart) {
        return firstPart.text;
      }
    }
    if (typeof systemInstruction === 'object') {
      // Handle Content or Part
      if (
        'parts' in systemInstruction &&
        Array.isArray(systemInstruction.parts)
      ) {
        const firstPart = systemInstruction.parts[0];
        if (firstPart && 'text' in firstPart) {
          return firstPart.text;
        }
      }
      if ('text' in systemInstruction) {
        return systemInstruction.text;
      }
    }
    return undefined;
  }
}
