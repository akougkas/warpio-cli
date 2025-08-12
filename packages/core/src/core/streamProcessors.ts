/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import { ServerGeminiStreamEvent, GeminiEventType } from './turn.js';
import {
  WarpioThinkingProcessor,
  ThinkingToken,
} from '../reasoning/thinkingProcessor.js';
// ELIMINATED: LocalProvider replaced by ModelManager adapters
import { LocalToolManager } from './localToolManager.js';
import { FinishReason, PartListUnion } from '@google/genai';

/**
 * Processes OpenAI streams and converts them to Gemini-compatible events.
 * Handles thinking token detection and tool calling.
 */
export class LocalStreamProcessor {
  constructor(
    private thinkingProcessor: WarpioThinkingProcessor,
    private providerName: string,
  ) {}

  /**
   * Process OpenAI completion stream and yield Gemini-compatible events
   */
  async *processOpenAIStream(
    stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
    toolManager: LocalToolManager,
  ): AsyncIterable<ServerGeminiStreamEvent> {
    let _accumulatedContent = '';
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
          _accumulatedContent += delta.content;

          // Process content through thinking detector
          const thinkingTokens = await this.processContentForThinking(
            delta.content,
          );

          for await (const token of thinkingTokens) {
            if (token.type === 'thinking') {
              if (!isThinkingMode) {
                isThinkingMode = true;
                thinkingBuffer = '';
              }
              thinkingBuffer += token.text;

              yield {
                type: GeminiEventType.Thought,
                value: {
                  subject: 'Thinking',
                  description: token.text,
                },
              };
            } else {
              // Content token
              if (isThinkingMode) {
                // End of thinking, emit accumulated thinking
                if (thinkingBuffer) {
                  yield {
                    type: GeminiEventType.Thought,
                    value: {
                      subject: 'Complete Thinking',
                      description: `<thinking>\n${thinkingBuffer}\n</thinking>`,
                    },
                  };
                  thinkingBuffer = '';
                }
                isThinkingMode = false;
              }

              yield {
                type: GeminiEventType.Content,
                value: token.text,
              };
            }
          }
        }

        // Handle tool calls
        if (delta.tool_calls) {
          // Accumulate tool calls (they may come in chunks)
          for (const toolCall of delta.tool_calls) {
            const existingCall = currentToolCalls.find(
              (call) => call.id === toolCall.id,
            );

            if (existingCall) {
              // Update existing call
              if (toolCall.function?.arguments) {
                existingCall.function.arguments += toolCall.function.arguments;
              }
            } else {
              // New tool call
              currentToolCalls.push({
                id: toolCall.id || '',
                type: 'function',
                function: {
                  name: toolCall.function?.name || '',
                  arguments: toolCall.function?.arguments || '',
                },
              });
            }
          }
        }

        // Handle completion with tool calls
        if (
          choice.finish_reason === 'tool_calls' &&
          currentToolCalls.length > 0
        ) {
          // Yield each tool call request individually
          for (const tc of currentToolCalls) {
            yield {
              type: GeminiEventType.ToolCallRequest,
              value: {
                callId: tc.id,
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments || '{}'),
                isClientInitiated: false,
                prompt_id: 'local-model',
              },
            };
          }

          try {
            // Execute tool calls
            const toolResults =
              await toolManager.handleToolCalls(currentToolCalls);

            // Yield each tool call response individually
            for (let idx = 0; idx < toolResults.length; idx++) {
              // Convert OpenAI tool result to Gemini PartListUnion
              const toolResult = toolResults[idx];
              const responseParts = [
                {
                  text:
                    typeof toolResult.content === 'string'
                      ? toolResult.content
                      : JSON.stringify(toolResult.content),
                },
              ];

              yield {
                type: GeminiEventType.ToolCallResponse,
                value: {
                  callId: currentToolCalls[idx].id,
                  responseParts: responseParts as PartListUnion, // Type assertion needed for compatibility
                  resultDisplay: undefined,
                  error: undefined,
                  errorType: undefined,
                },
              };
            }

            // Continue conversation with tool results
            yield* this.continueAfterToolCalls(
              toolResults,
              currentToolCalls,
              toolManager,
            );
          } catch (error) {
            console.error('Tool execution error:', error);
            yield {
              type: GeminiEventType.Error,
              value: {
                error: {
                  message: `Tool execution failed: ${(error as Error).message}`,
                },
              },
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
                subject: 'Final Thinking',
                description: `<thinking>\n${thinkingBuffer}\n</thinking>`,
              },
            };
          }

          yield {
            type: GeminiEventType.Finished,
            value: this.mapFinishReason(choice.finish_reason),
          };
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      yield {
        type: GeminiEventType.Error,
        value: {
          error: {
            message: `Stream processing failed: ${(error as Error).message}`,
          },
        },
      };
    }
  }

  /**
   * Continue conversation after tool calls are executed
   */
  private async *continueAfterToolCalls(
    toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[],
    _originalToolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[],
    _toolManager: LocalToolManager,
  ): AsyncIterable<ServerGeminiStreamEvent> {
    // In a real implementation, this would make another OpenAI call
    // with the tool results and continue the conversation.
    // For now, we'll emit a continuation event.

    yield {
      type: GeminiEventType.Content,
      value: `\n[Tool execution completed. ${toolResults.length} tools executed successfully.]\n`,
    };

    // Note: The actual continuation logic would be handled by the UnifiedLocalClient
    // which would make another OpenAI API call with the updated message history
    // including the tool call and tool result messages.
  }

  /**
   * Process content chunk for thinking tokens
   */
  private async *processContentForThinking(
    content: string,
  ): AsyncIterable<ThinkingToken> {
    const supportsThinking = this.providerName === 'ollama'; // Only Ollama supports thinking tokens
    if (!supportsThinking) {
      // Provider doesn't support thinking - treat all as content
      yield { type: 'content', text: content };
      return;
    }

    try {
      // Create an async stream from the content chunk
      const contentStream = this.createAsyncStream(content);

      // Process through the thinking processor
      for await (const token of this.thinkingProcessor.processStream(
        contentStream,
      )) {
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
  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.MAX_TOKENS;
      case 'tool_calls':
        return FinishReason.STOP; // Tool calls handled separately
      case 'content_filter':
        return FinishReason.SAFETY;
      case 'function_call': // Legacy
        return FinishReason.STOP;
      default:
        return FinishReason.OTHER;
    }
  }

  /**
   * Process a complete response (non-streaming)
   */
  async processCompleteResponse(
    response: OpenAI.Chat.ChatCompletionMessage,
    toolManager: LocalToolManager,
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
      toolResults: undefined as
        | OpenAI.Chat.ChatCompletionToolMessageParam[]
        | undefined,
    };

    // Process content for thinking tokens
    const supportsThinking = this.providerName === 'ollama'; // Only Ollama supports thinking tokens
    if (result.content && supportsThinking) {
      try {
        const contentStream = this.createAsyncStream(result.content);
        for await (const token of this.thinkingProcessor.processStream(
          contentStream,
        )) {
          result.thinkingTokens.push(token);
        }
      } catch (error) {
        console.debug('Thinking processing error in complete response:', error);
      }
    }

    // Execute tool calls if present
    if (result.toolCalls) {
      try {
        result.toolResults = await toolManager.handleToolCalls(
          result.toolCalls,
        );
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
      .filter((token) => token.type === 'thinking')
      .map((token) => token.text)
      .join('');
  }

  /**
   * Utility to extract regular content from tokens
   */
  static extractRegularContent(tokens: ThinkingToken[]): string {
    return tokens
      .filter((token) => token.type === 'content')
      .map((token) => token.text)
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
    const supportsThinking = this.providerName === 'ollama'; // Only Ollama supports thinking tokens
    const supportsTools = true; // All local providers support tools via OpenAI API
    return {
      providerName: this.providerName,
      supportsThinking,
      supportsTools,
      processorReady: !!this.thinkingProcessor,
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
export type LocalServerGeminiStreamEvent =
  | ServerGeminiStreamEvent
  | {
      type:
        | typeof LocalGeminiEventType.ToolCall
        | typeof LocalGeminiEventType.ToolResult
        | typeof LocalGeminiEventType.Complete
        | typeof LocalGeminiEventType.Error;
      value: unknown;
    };

/**
 * Utility functions for stream processing
 */
export class StreamProcessorUtils {
  /**
   * Collect all events from a stream into an array
   */
  static async collectStreamEvents<T>(stream: AsyncIterable<T>): Promise<T[]> {
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
    eventType: string,
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
    transformer: (input: TInput) => TOutput | Promise<TOutput>,
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
    timeoutMs: number,
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
        if ((error as Error).message === 'Stream timeout') {
          console.warn('Stream processing timeout after', timeoutMs, 'ms');
          break;
        }
        throw error;
      }
    }
  }
}
