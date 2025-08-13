/**
 * Provider Manager - Bridge between Warpio CLI and Vercel AI SDK
 * 
 * This manager provides a transition layer between the existing ContentGenerator
 * interface and the new Vercel AI SDK provider system.
 */

import { generateText, streamText } from 'ai';
import type { LanguageModel } from 'ai';
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
        tools: this.convertTools(request.tools),
        temperature: request.generationConfig?.temperature,
        maxTokens: request.generationConfig?.maxOutputTokens,
        // Add system message if present
        system: request.systemInstruction?.parts?.[0]?.text,
      });

      return this.convertToGeminiResponse(result);
    } catch (error) {
      console.error('AI SDK generateText error:', error);
      throw error;
    }
  }

  async *generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    try {
      const result = streamText({
        model: this.model,
        messages: this.convertContentsToMessages(request.contents),
        tools: this.convertTools(request.tools),
        temperature: request.generationConfig?.temperature,
        maxTokens: request.generationConfig?.maxOutputTokens,
        system: request.systemInstruction?.parts?.[0]?.text,
      });

      // Stream text chunks as Gemini-format responses
      for await (const textPart of result.textStream) {
        yield {
          candidates: [{
            content: {
              role: 'model',
              parts: [{ text: textPart }]
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: []
          }],
          usageMetadata: {
            promptTokenCount: 0,
            candidatesTokenCount: 0,
            totalTokenCount: 0
          }
        };
      }

      // Final response with usage info
      const finalResult = await result;
      yield {
        candidates: [{
          content: {
            role: 'model',
            parts: [{ text: finalResult.text }]
          },
          finishReason: 'STOP',
          index: 0,
          safetyRatings: []
        }],
        usageMetadata: {
          promptTokenCount: finalResult.usage.promptTokens,
          candidatesTokenCount: finalResult.usage.completionTokens,
          totalTokenCount: finalResult.usage.totalTokens
        }
      };
    } catch (error) {
      console.error('AI SDK streamText error:', error);
      throw error;
    }
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // For now, provide estimated counts
    // TODO: Implement proper token counting when AI SDK supports it
    const text = request.contents?.map(c => 
      c.parts.map(p => 'text' in p ? p.text : '').join(' ')
    ).join(' ') || '';
    
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
  private convertContentsToMessages(contents: any[]): any[] {
    if (!contents) return [];
    
    return contents.map(content => ({
      role: content.role === 'user' ? 'user' : 'assistant',
      content: content.parts.map((part: any) => {
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
  private convertTools(geminiTools?: any[]): Record<string, any> | undefined {
    if (!geminiTools || geminiTools.length === 0) return undefined;
    
    const tools: Record<string, any> = {};
    
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
    return {
      candidates: [{
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
        finishReason: this.mapFinishReason(result.finishReason),
        index: 0,
        safetyRatings: []
      }],
      usageMetadata: {
        promptTokenCount: result.usage.promptTokens,
        candidatesTokenCount: result.usage.completionTokens,
        totalTokenCount: result.usage.totalTokens
      }
    };
  }

  /**
   * Map AI SDK finish reasons to Gemini format
   */
  private mapFinishReason(aiFinishReason: string): string {
    switch (aiFinishReason) {
      case 'stop': return 'STOP';
      case 'length': return 'MAX_TOKENS';
      case 'content-filter': return 'SAFETY';
      case 'tool-calls': return 'STOP';
      default: return 'OTHER';
    }
  }
}