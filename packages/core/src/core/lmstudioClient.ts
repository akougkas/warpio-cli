/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import {
  Content,
  PartListUnion,
  GenerateContentResponse,
  SendMessageParameters,
  PartUnion,
  FinishReason,
  FunctionCall,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
} from '@google/genai';
import { Config } from '../config/config.js';
import { Turn, ServerGeminiStreamEvent, GeminiEventType } from './turn.js';
import { GeminiChat } from './geminiChat.js';
import { ContentGenerator } from './contentGenerator.js';

export interface LMStudioConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// ContentGenerator implementation for LM Studio models
class LMStudioContentGenerator implements ContentGenerator {
  constructor(private lmStudioClient: LMStudioModelClient) {}

  async generateContent(
    request: unknown,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const prompt = this.extractPromptFromRequest(request);
    const content = await this.lmStudioClient.generateContent(prompt);

    const response = {
      candidates: [
        {
          content: {
            parts: [{ text: content }],
            role: 'model',
          },
          finishReason: FinishReason.STOP,
          index: 0,
        },
      ],
      promptFeedback: {},
      usageMetadata: {
        promptTokenCount: 0,
        candidatesTokenCount: content.length,
        totalTokenCount: content.length,
      },
      get text(): string | undefined {
        return content;
      },
      get data(): string | undefined {
        return undefined;
      },
      get functionCalls(): FunctionCall[] | undefined {
        return [];
      },
      get executableCode(): string | undefined {
        return undefined;
      },
      get codeExecutionResult(): string | undefined {
        return undefined;
      },
    } as GenerateContentResponse;

    return response;
  }

  async generateContentStream(
    request: unknown,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const prompt = this.extractPromptFromRequest(request);
    const stream = await this.lmStudioClient.generateContentStream(prompt);

    return (async function* () {
      for await (const chunk of stream) {
      const response = {
        candidates: [
          {
            content: {
              parts: [{ text: chunk }],
              role: 'model',
            },
            finishReason: FinishReason.STOP,
            index: 0,
          },
        ],
        promptFeedback: {},
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: chunk.length,
          totalTokenCount: chunk.length,
        },
        get text(): string | undefined {
          return chunk;
        },
        get data(): string | undefined {
          return undefined;
        },
        get functionCalls(): FunctionCall[] | undefined {
          return [];
        },
        get executableCode(): string | undefined {
          return undefined;
        },
        get codeExecutionResult(): string | undefined {
          return undefined;
        },
      } as GenerateContentResponse;
        yield response;
      }
    })();
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // Simplified token counting - not accurate but sufficient for basic usage
    const prompt = this.extractPromptFromRequest(request);
    const totalTokens = Math.ceil(prompt.length / 4); // Rough estimate: 1 token ≈ 4 characters
    
    return {
      totalTokens,
      cachedContentTokenCount: 0,
    };
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    // LM Studio supports embeddings through OpenAI-compatible API
    const text = this.extractPromptFromRequest(request);
    
    try {
      const response = await this.lmStudioClient.createEmbedding(text);
      return {
        embeddings: [{ values: response }],
      };
    } catch (_error) {
      // If embeddings aren't supported by current model, return a basic hash-based embedding
      const hash = this.simpleHash(text);
      const embedding = new Array(768).fill(0).map((_, i) => Math.sin(hash * (i + 1)) * 0.1);
      return {
        embeddings: [{ values: embedding }],
      };
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private extractPromptFromRequest(request: unknown): string {
    const requestObj = request as { contents?: Content[]; parts?: PartUnion[] };
    if (requestObj?.contents) {
      return requestObj.contents
        .map(
          (content: Content) =>
            content.parts?.map((part) => (part as { text?: string }).text || '').join('') || '',
        )
        .join('\n');
    }
    if (requestObj?.parts) {
      return requestObj.parts.map((part) => (part as { text?: string }).text || '').join('');
    }
    return '';
  }
}

// LMStudioGeminiChat implementation that extends GeminiChat
export class LMStudioGeminiChat extends GeminiChat {
  constructor(
    private lmStudioClient: LMStudioModelClient,
    config: Config,
  ) {
    const contentGenerator = new LMStudioContentGenerator(lmStudioClient);
    super(config, contentGenerator, {}, []);
  }

  async sendMessageStream(
    params: SendMessageParameters,
    _prompt_id: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    let prompt: string;
    if (typeof params.message === 'string') {
      prompt = params.message;
    } else if (Array.isArray(params.message)) {
      prompt = params.message
        .map((part: PartUnion) =>
          typeof part === 'string'
            ? part
            : (part as { text?: string })?.text || '',
        )
        .join('');
    } else {
      prompt =
        typeof params.message === 'string'
          ? params.message
          : (params.message as { text?: string })?.text || '';
    }

    const stream = await this.lmStudioClient.generateContentStream(prompt);

    return (async function* () {
      for await (const chunk of stream) {
        const response = {
          candidates: [
            {
              content: {
                parts: [{ text: chunk }],
                role: 'model',
              },
              finishReason: FinishReason.STOP,
              index: 0,
            },
          ],
          promptFeedback: {},
          usageMetadata: {
            promptTokenCount: 0,
            candidatesTokenCount: chunk.length,
            totalTokenCount: chunk.length,
          },
          get text(): string | undefined {
            return chunk;
          },
          get data(): string | undefined {
            return undefined;
          },
          get functionCalls(): FunctionCall[] | undefined {
            return [];
          },
          get executableCode(): string | undefined {
            return undefined;
          },
          get codeExecutionResult(): string | undefined {
            return undefined;
          },
        } as GenerateContentResponse;
        yield response;
      }
    })();
  }
}

export class LMStudioModelClient {
  private client: OpenAI;
  private config: LMStudioConfig;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private chat: {
    addHistory: (content: Content) => void;
    getHistory: () => Content[];
    setHistory: (history: Content[]) => void;
    setTools: () => void;
  };

  constructor(config: Config, modelConfig: LMStudioConfig) {
    this.config = modelConfig;

    // Use OpenAI SDK for LM Studio's OpenAI-compatible API
    this.client = new OpenAI({
      baseURL: modelConfig.baseUrl,
      apiKey: modelConfig.apiKey || 'lm-studio',
    });

    // Initialize with system prompt if provided
    if (modelConfig.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: modelConfig.systemPrompt,
      });
    }

    // Initialize chat object for compatibility
    this.chat = {
      addHistory: (content: Content) => this.convertHistory([content]),
      getHistory: () => this.getHistoryAsContent(),
      setHistory: (history: Content[]) => this.setHistoryFromContent(history),
      setTools: () => {}, // No-op for local models
    };
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: prompt });

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: this.conversationHistory,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 4096,
        stream: false,
      });

      const content = response.choices[0]?.message?.content || '';

      // Add response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content,
      });

      return content;
    } catch (error) {
      throw new Error(
        `LM Studio error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async generateContentStream(prompt: string): Promise<AsyncIterable<string>> {
    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: prompt });

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: this.conversationHistory,
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 4096,
      stream: true,
    });

    // Build accumulated response for history
    let accumulatedContent = '';

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      [Symbol.asyncIterator]: async function* () {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            accumulatedContent += content;
            yield content;
          }
        }
        // After stream completes, add to history
        if (accumulatedContent) {
          self.conversationHistory.push({
            role: 'assistant',
            content: accumulatedContent,
          });
        }
      },
    };
  }

  // Convert from Gemini format to OpenAI format
  convertHistory(geminiHistory: Content[]): void {
    this.conversationHistory = [
      // Keep system prompt if exists
      ...this.conversationHistory.filter((msg) => msg.role === 'system'),
      // Convert Gemini history
      ...(geminiHistory
        .map((content) => this.convertMessage(content))
        .filter(Boolean) as OpenAI.Chat.ChatCompletionMessageParam[]),
    ];
  }

  private convertMessage(content: Content): OpenAI.Chat.ChatCompletionMessageParam | null {
    if (!content.parts || content.parts.length === 0) return null;

    const textParts = content.parts
      .filter((part) => 'text' in part)
      .map((part) => (part as { text: string }).text)
      .join('\n');

    if (!textParts) return null;

    return {
      role: content.role === 'model' ? 'assistant' : 'user',
      content: textParts,
    };
  }

  getHistoryAsContent(): Content[] {
    return this.conversationHistory
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content as string }],
      }));
  }

  setHistoryFromContent(history: Content[]): void {
    const systemPrompt = this.conversationHistory.find(
      (msg) => msg.role === 'system',
    );
    this.conversationHistory = systemPrompt ? [systemPrompt] : [];
    
    for (const content of history) {
      const message = this.convertMessage(content);
      if (message) {
        this.conversationHistory.push(message);
      }
    }
  }

  getHistory(): Content[] {
    return this.getHistoryAsContent();
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.config.model,
        input: text,
      });
      
      if (response.data && response.data.length > 0) {
        return response.data[0].embedding;
      }
      
      // Fallback to empty embedding if no data
      return new Array(768).fill(0);
    } catch (_error) {
      // If embeddings fail, generate a deterministic pseudo-embedding
      // This allows the system to continue functioning even without proper embeddings
      const hash = this.simpleHash(text);
      return new Array(768).fill(0).map((_, i) => Math.sin(hash * (i + 1)) * 0.1);
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Add sendMessageStream method to make LMStudioModelClient compatible with GeminiClient interface
  async *sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string,
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    // Convert PartListUnion to string for LM Studio model
    const prompt = Array.isArray(request)
      ? request
          .map((part) => (part as unknown as { text?: string })?.text || '')
          .join('')
      : (request as unknown as { text?: string })?.text || '';

    try {
      // Stream response from LM Studio model
      const stream = await this.generateContentStream(prompt || 'Hello');

      for await (const chunk of stream) {
        if (signal.aborted) {
          break;
        }

        // Emit content event
        yield {
          type: GeminiEventType.Content,
          value: chunk,
        };
      }

      // Return a proper Turn object with LMStudioGeminiChat
      const lmStudioChat = new LMStudioGeminiChat(
        this,
        this.config as unknown as Config,
      );
      return new Turn(lmStudioChat, prompt_id);
    } catch (error) {
      // Emit error event
      yield {
        type: GeminiEventType.Error,
        value: {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      };

      // Return a turn with the chat for error handling
      const lmStudioChat = new LMStudioGeminiChat(
        this,
        this.config as unknown as Config,
      );
      return new Turn(lmStudioChat, prompt_id);
    }
  }
}