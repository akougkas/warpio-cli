/**
 * Provider Manager - Bridge between Warpio CLI and Vercel AI SDK
 * 
 * This manager provides a transition layer between the existing ContentGenerator
 * interface and the new Vercel AI SDK provider system.
 */

import { generateText, streamText } from 'ai';
import type { LanguageModel, CoreMessage } from 'ai';
import { getLanguageModel, parseProviderConfig, type ProviderConfig } from './registry.js';
import type { 
  GenerateContentParameters, 
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  ContentGenerator,
  UserTierId 
} from '../core/contentGenerator.js';
import { FinishReason, GenerateContentResponse as GeminiResponse } from '@google/genai';

/**
 * AI SDK Provider Manager - Implements ContentGenerator interface using Vercel AI SDK
 */
export class AISDKProviderManager implements ContentGenerator {
  private model: LanguageModel;
  private config: ProviderConfig;
  
  constructor(config?: Partial<ProviderConfig>) {
    this.config = { ...parseProviderConfig(), ...config };
    this.model = getLanguageModel(this.config);
  }

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    try {
      const result = await generateText({
        model: this.model,
        messages: this.convertContentsToMessages(request.contents),
        tools: this.convertTools(request.config?.tools),
        temperature: request.config?.temperature,
        maxOutputTokens: request.config?.maxOutputTokens,
        maxRetries: 3,
        // Add system message if present
        system: this.extractSystemMessage(request.config?.systemInstruction),
      });

      return this.convertToGeminiResponse(result);
    } catch (error) {
      console.error('AI SDK generateText error:', error);
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
    try {
      const result = streamText({
        model: this.model,
        messages: this.convertContentsToMessages(request.contents),
        tools: this.convertTools(request.config?.tools),
        temperature: request.config?.temperature,
        maxOutputTokens: request.config?.maxOutputTokens,
        maxRetries: 3,
        system: this.extractSystemMessage(request.config?.systemInstruction),
      });

      // Stream text chunks as Gemini-format responses
      for await (const textPart of result.textStream) {
        const response = new GeminiResponse();
        response.candidates = [{
          content: {
            role: 'model',
            parts: [{ text: textPart }]
          },
          finishReason: FinishReason.STOP,
          index: 0,
          safetyRatings: []
        }];
        response.usageMetadata = {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0
        };
        yield response;
      }

      // Final response with usage info
      const finalResult = await result;
      const finalResponse = new GeminiResponse();
      finalResponse.candidates = [{
        content: {
          role: 'model',
          parts: [{ text: await finalResult.text }]
        },
        finishReason: FinishReason.STOP,
        index: 0,
        safetyRatings: []
      }];
      const usage = await finalResult.usage;
      finalResponse.usageMetadata = {
        promptTokenCount: (usage as any)?.promptTokens || 0,
        candidatesTokenCount: (usage as any)?.completionTokens || 0,
        totalTokenCount: (usage as any)?.totalTokens || 0
      };
      yield finalResponse;
    } catch (error) {
      console.error('AI SDK streamText error:', error);
      throw error;
    }
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // For now, provide estimated counts
    // TODO: Implement proper token counting when AI SDK supports it
    let text = '';
    if (request.contents) {
      if (typeof request.contents === 'string') {
        text = request.contents;
      } else if (Array.isArray(request.contents)) {
        text = request.contents.map((c: any) => 
          c.parts?.map((p: any) => 'text' in p ? p.text : '').join(' ') || ''
        ).join(' ');
      }
    }
    
    const estimatedTokens = Math.ceil(text.length / 4); // Rough estimate
    
    return {
      totalTokens: estimatedTokens
    };
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    // TODO: Implement embedding using AI SDK when needed
    throw new Error('Embedding not yet implemented in AI SDK provider manager');
  }

  public userTier?: UserTierId;

  /**
   * Convert Gemini Content format to AI SDK messages format
   */
  private convertContentsToMessages(contents: any): CoreMessage[] {
    if (!contents) return [];
    if (typeof contents === 'string') {
      return [{ role: 'user', content: contents }];
    }
    if (!Array.isArray(contents)) return [];
    
    return contents.map(content => ({
      role: content.role === 'user' ? 'user' as const : 'assistant' as const,
      content: content.parts.map((part: { text?: string; functionCall?: any; functionResponse?: any }) => {
        if ('text' in part) return part.text;
        if ('functionCall' in part) return `[Function Call: ${part.functionCall.name}]`;
        if ('functionResponse' in part) return `[Function Response: ${JSON.stringify(part.functionResponse)}]`;
        return '';
      }).join('\n')
    }));
  }

  /**
   * Convert Gemini tools to AI SDK tools format
   */
  private convertTools(geminiTools?: any[]): Record<string, { description: string; parameters: any }> | undefined {
    if (!geminiTools || geminiTools.length === 0) return undefined;
    
    const tools: Record<string, { description: string; parameters: any }> = {};
    
    for (const tool of geminiTools) {
      if (tool.functionDeclarations) {
        for (const func of tool.functionDeclarations) {
          tools[func.name] = {
            description: func.description,
            parameters: func.parameters,
            // Note: Actual tool execution will need to be handled by the calling code
          };
        }
      }
    }
    
    return Object.keys(tools).length > 0 ? tools : undefined;
  }

  /**
   * Convert AI SDK result to Gemini response format
   */
  private convertToGeminiResponse(result: any): GenerateContentResponse {
    const response = new GeminiResponse();
    response.candidates = [{
      content: {
        role: 'model',
        parts: result.toolCalls && result.toolCalls.length > 0 
          ? result.toolCalls.map((tc: any) => ({
              functionCall: {
                name: tc.toolName,
                args: tc.args
              }
            }))
          : [{ text: result.text }]
      },
      finishReason: this.mapFinishReason(result.finishReason || 'stop'),
      index: 0,
      safetyRatings: []
    }];
    response.usageMetadata = {
      promptTokenCount: (result.usage as any)?.promptTokens || 0,
      candidatesTokenCount: (result.usage as any)?.completionTokens || 0,
      totalTokenCount: (result.usage as any)?.totalTokens || 0
    };
    return response;
  }

  /**
   * Map AI SDK finish reasons to Gemini format
   */
  private mapFinishReason(aiFinishReason: string | undefined): FinishReason {
    switch (aiFinishReason) {
      case 'stop': return FinishReason.STOP;
      case 'length': return FinishReason.MAX_TOKENS;
      case 'content-filter': return FinishReason.SAFETY;
      case 'tool-calls': return FinishReason.STOP;
      default: return FinishReason.OTHER;
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
      if ('parts' in systemInstruction && Array.isArray(systemInstruction.parts)) {
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