/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import { ServerGeminiStreamEvent, GeminiEventType } from './turn.js';
import { WarpioThinkingProcessor, ThinkingToken } from '../reasoning/thinkingProcessor.js';
import { LocalProvider } from './providers/index.js';
import { LocalToolManager } from './localToolManager.js';

/**
 * Processes OpenAI streams and converts them to Gemini-compatible events.
 * Handles thinking token detection and tool calling.
 */
export class LocalStreamProcessor {
  constructor(
    private thinkingProcessor: WarpioThinkingProcessor,
    private provider: LocalProvider
  ) {}

  /**
   * Process OpenAI completion stream and yield Gemini-compatible events
   */
  async *processOpenAIStream(
    stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
    toolManager: LocalToolManager
  ): AsyncIterable<ServerGeminiStreamEvent> {
    let accumulatedContent = '';
    let currentToolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
    let isThinkingMode = false;
    let thinkingBuffer = '';

    try {
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;
        
        // Handle content streaming
        if (delta.content) {
          accumulatedContent += delta.content;
          
          // Process content through thinking detector
          const thinkingTokens = await this.processContentForThinking(delta.content);
          
          for (const token of thinkingTokens) {
            if (token.type === 'thinking') {
              if (!isThinkingMode) {
                isThinkingMode = true;
                thinkingBuffer = '';
              }
              thinkingBuffer += token.text;
              
              yield {
                type: GeminiEventType.Thought,
                value: {
                  thought: token.text,
                  metadata: token.metadata
                }
              };
            } else {
              // Content token
              if (isThinkingMode) {
                // End of thinking, emit accumulated thinking
                if (thinkingBuffer) {
                  yield {
                    type: GeminiEventType.Thought,
                    value: {
                      thought: `<thinking>\n${thinkingBuffer}\n</thinking>`,
                      metadata: { 
                        level: 'complete',
                        tokens: thinkingBuffer.length 
                      }
                    }
                  };
                  thinkingBuffer = '';
                }
                isThinkingMode = false;
              }
              
              yield {
                type: GeminiEventType.Content,
                value: token.text
              };
            }
          }
        }
        
        // Handle tool calls
        if (delta.tool_calls) {
          // Accumulate tool calls (they may come in chunks)
          for (const toolCall of delta.tool_calls) {
            const existingCall = currentToolCalls.find(call => call.id === toolCall.id);
            
            if (existingCall) {
              // Update existing call
              if (toolCall.function?.arguments) {
                existingCall.function.arguments += toolCall.function.arguments;
              }
            } else {
              // New tool call
              currentToolCalls.push({
                id: toolCall.id,
                type: 'function',
                function: {
                  name: toolCall.function?.name || '',
                  arguments: toolCall.function?.arguments || ''
                }
              });
            }
          }
        }
        
        // Handle completion with tool calls
        if (choice.finish_reason === 'tool_calls' && currentToolCalls.length > 0) {
          yield {
            type: GeminiEventType.ToolCall,
            value: {
              toolCalls: currentToolCalls,
              executing: true
            }
          };
          
          try {
            // Execute tool calls
            const toolResults = await toolManager.handleToolCalls(currentToolCalls);
            
            yield {
              type: GeminiEventType.ToolResult,
              value: {
                toolCalls: currentToolCalls,
                results: toolResults,
                executed: true
              }
            };
            
            // Continue conversation with tool results
            yield* this.continueAfterToolCalls(toolResults, currentToolCalls, toolManager);
            
          } catch (error) {
            console.error('Tool execution error:', error);
            yield {
              type: GeminiEventType.Error,
              value: {
                error: `Tool execution failed: ${error.message}`,
                toolCalls: currentToolCalls
              }
            };
          }
          
          // Reset tool calls for next iteration
          currentToolCalls = [];
        }
        
        // Handle other completion reasons
        if (choice.finish_reason && choice.finish_reason !== 'tool_calls') {
          // Final thinking cleanup if needed
          if (isThinkingMode && thinkingBuffer) {
            yield {
              type: GeminiEventType.Thought,
              value: {
                thought: `<thinking>\n${thinkingBuffer}\n</thinking>`,
                metadata: { 
                  level: 'final',
                  tokens: thinkingBuffer.length 
                }
              }
            };
          }
          
          yield {
            type: GeminiEventType.Complete,
            value: {
              finishReason: this.mapFinishReason(choice.finish_reason),
              totalContent: accumulatedContent
            }
          };
        }
      }
      
    } catch (error) {
      console.error('Stream processing error:', error);
      yield {
        type: GeminiEventType.Error,
        value: {
          error: `Stream processing failed: ${error.message}`,
          recoverable: false
        }
      };
    }
  }

  /**
   * Continue conversation after tool calls are executed
   */
  private async *continueAfterToolCalls(
    toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[],
    originalToolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[],
    toolManager: LocalToolManager
  ): AsyncIterable<ServerGeminiStreamEvent> {
    // In a real implementation, this would make another OpenAI call
    // with the tool results and continue the conversation.
    // For now, we'll emit a continuation event.
    
    yield {
      type: GeminiEventType.Content,
      value: `\n[Tool execution completed. ${toolResults.length} tools executed successfully.]\n`
    };
    
    // Note: The actual continuation logic would be handled by the UnifiedLocalClient
    // which would make another OpenAI API call with the updated message history
    // including the tool call and tool result messages.
  }

  /**
   * Process content chunk for thinking tokens
   */
  private async *processContentForThinking(content: string): AsyncIterable<ThinkingToken> {
    if (!this.provider.supportsThinking) {
      // Provider doesn't support thinking - treat all as content
      yield { type: 'content', text: content };
      return;
    }

    try {
      // Create an async stream from the content chunk
      const contentStream = this.createAsyncStream(content);
      
      // Process through the thinking processor
      for await (const token of this.thinkingProcessor.processStream(contentStream)) {
        yield token;
      }
    } catch (error) {
      console.debug('Thinking processing error:', error);
      // Fallback: treat as regular content
      yield { type: 'content', text: content };
    }
  }

  /**
   * Create an async stream from a string (utility method)
   */
  private async *createAsyncStream(content: string): AsyncIterable<string> {
    yield content;
  }

  /**
   * Map OpenAI finish reasons to Gemini equivalents
   */
  private mapFinishReason(reason: string): string {
    switch (reason) {
      case 'stop':
        return 'STOP';
      case 'length':
        return 'MAX_TOKENS';
      case 'tool_calls':
        return 'TOOL_USE';
      case 'content_filter':
        return 'SAFETY';
      case 'function_call': // Legacy
        return 'TOOL_USE';
      default:
        return 'OTHER';
    }
  }

  /**
   * Process a complete response (non-streaming)
   */
  async processCompleteResponse(
    response: OpenAI.Chat.ChatCompletionMessage,
    toolManager: LocalToolManager
  ): Promise<{
    content: string;
    thinkingTokens: ThinkingToken[];
    toolCalls?: OpenAI.Chat.ChatCompletionMessageToolCall[];
    toolResults?: OpenAI.Chat.ChatCompletionToolMessageParam[];
  }> {
    const result = {
      content: response.content || '',
      thinkingTokens: [] as ThinkingToken[],
      toolCalls: response.tool_calls,
      toolResults: undefined as OpenAI.Chat.ChatCompletionToolMessageParam[] | undefined
    };

    // Process content for thinking tokens
    if (result.content && this.provider.supportsThinking) {
      try {
        const contentStream = this.createAsyncStream(result.content);
        for await (const token of this.thinkingProcessor.processStream(contentStream)) {
          result.thinkingTokens.push(token);
        }
      } catch (error) {
        console.debug('Thinking processing error in complete response:', error);
      }
    }

    // Execute tool calls if present
    if (result.toolCalls) {
      try {
        result.toolResults = await toolManager.handleToolCalls(result.toolCalls);
      } catch (error) {
        console.error('Tool execution error in complete response:', error);
        throw error;
      }
    }

    return result;
  }

  /**
   * Utility to extract thinking content from tokens
   */
  static extractThinkingContent(tokens: ThinkingToken[]): string {
    return tokens
      .filter(token => token.type === 'thinking')
      .map(token => token.text)
      .join('');
  }

  /**
   * Utility to extract regular content from tokens
   */
  static extractRegularContent(tokens: ThinkingToken[]): string {
    return tokens
      .filter(token => token.type === 'content')
      .map(token => token.text)
      .join('');
  }

  /**
   * Get processor statistics for debugging
   */
  getStats(): {
    providerName: string;
    supportsThinking: boolean;
    supportsTools: boolean;
    processorReady: boolean;
  } {
    return {
      providerName: this.provider.name,
      supportsThinking: this.provider.supportsThinking,
      supportsTools: this.provider.supportsTools,
      processorReady: !!this.thinkingProcessor
    };
  }
}

/**
 * Extended Gemini event types for local providers
 */
export const LocalGeminiEventType = {
  ...GeminiEventType,
  ToolCall: 'tool_call' as const,
  ToolResult: 'tool_result' as const,
  Complete: 'complete' as const,
  Error: 'error' as const,
} as const;

/**
 * Extended stream event type for local providers
 */
export type LocalServerGeminiStreamEvent = ServerGeminiStreamEvent | {
  type: typeof LocalGeminiEventType.ToolCall | typeof LocalGeminiEventType.ToolResult | 
        typeof LocalGeminiEventType.Complete | typeof LocalGeminiEventType.Error;
  value: any;
};

/**
 * Utility functions for stream processing
 */
export class StreamProcessorUtils {
  /**
   * Collect all events from a stream into an array
   */
  static async collectStreamEvents<T>(
    stream: AsyncIterable<T>
  ): Promise<T[]> {
    const events: T[] = [];
    for await (const event of stream) {
      events.push(event);
    }
    return events;
  }

  /**
   * Filter stream events by type
   */
  static async *filterStreamEvents<T extends { type: string }>(
    stream: AsyncIterable<T>,
    eventType: string
  ): AsyncIterable<T> {
    for await (const event of stream) {
      if (event.type === eventType) {
        yield event;
      }
    }
  }

  /**
   * Transform stream events
   */
  static async *transformStream<TInput, TOutput>(
    stream: AsyncIterable<TInput>,
    transformer: (input: TInput) => TOutput | Promise<TOutput>
  ): AsyncIterable<TOutput> {
    for await (const input of stream) {
      yield await transformer(input);
    }
  }

  /**
   * Add timeout to stream processing
   */
  static async *timeoutStream<T>(
    stream: AsyncIterable<T>,
    timeoutMs: number
  ): AsyncIterable<T> {
    const iterator = stream[Symbol.asyncIterator]();
    
    while (true) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Stream timeout')), timeoutMs);
      });
      
      const resultPromise = iterator.next();
      
      try {
        const result = await Promise.race([resultPromise, timeoutPromise]);
        
        if (result.done) {
          break;
        }
        
        yield result.value;
      } catch (error) {
        if (error.message === 'Stream timeout') {
          console.warn('Stream processing timeout after', timeoutMs, 'ms');
          break;
        }
        throw error;
      }
    }
  }
}