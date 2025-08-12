/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ollama } from 'ollama';
import {
  Content,
  PartListUnion,
  GenerateContentResponse,
  SendMessageParameters,
  PartUnion,
  FinishReason,
  FunctionCall,
} from '@google/genai';
import { Config } from '../config/config.js';
import { Turn, ServerGeminiStreamEvent, GeminiEventType } from './turn.js';
import { GeminiChat } from './geminiChat.js';
import { ContentGenerator } from './contentGenerator.js';
import { ThinkingStrategyFactory } from '../reasoning/index.js';
import type { Message as OllamaMessage } from 'ollama';

// Type definitions for local client - simplified as we'll use the proper Gemini types

export interface LocalModelConfig {
  provider: 'ollama' | 'lmstudio';
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// Real ContentGenerator implementation for local models
class LocalContentGenerator implements ContentGenerator {
  constructor(private localClient: LocalModelClient) {}

  async generateContent(
    request: unknown,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    // Extract text from the request parts
    const prompt = this.extractPromptFromRequest(request);
    const content = await this.localClient.generateContent(prompt);

    // Create a proper GenerateContentResponse object with getters
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
        promptTokenCount: prompt.length,
        candidatesTokenCount: content.length,
        totalTokenCount: prompt.length + content.length,
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
    };
    return response;
  }

  async generateContentStream(
    request: unknown,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const prompt = this.extractPromptFromRequest(request);
    const stream = await this.localClient.generateContentStream(prompt);

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
            promptTokenCount: prompt.length,
            candidatesTokenCount: chunk.length,
            totalTokenCount: prompt.length + chunk.length,
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

  async countTokens(request: unknown): Promise<{ totalTokens: number }> {
    const prompt = this.extractPromptFromRequest(request);
    return { totalTokens: prompt.length }; // Approximate token count
  }

  async embedContent(_request: unknown): Promise<never> {
    throw new Error('embedContent not supported for local models');
  }

  private extractPromptFromRequest(request: unknown): string {
    if (typeof request === 'string') return request;
    const requestObj = request as {
      contents?: Array<{ parts?: Array<{ text?: string }> }>;
      parts?: Array<{ text?: string }>;
    };

    if (requestObj?.contents) {
      return requestObj.contents
        .map(
          (content) =>
            content.parts?.map((part) => part.text || '').join('') || '',
        )
        .join('\n');
    }
    if (requestObj?.parts) {
      return requestObj.parts.map((part) => part.text || '').join('');
    }
    return '';
  }
}

// Real LocalGeminiChat implementation that extends GeminiChat
class LocalGeminiChat extends GeminiChat {
  constructor(
    private localClient: LocalModelClient,
    config: Config,
  ) {
    // Pass real ContentGenerator to parent constructor
    const contentGenerator = new LocalContentGenerator(localClient);
    super(config, contentGenerator, {}, []);
  }

  // Override sendMessageStream to use our local model
  async sendMessageStream(
    params: SendMessageParameters,
    _prompt_id: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    // Convert the message to a simple string prompt
    // params.message can be string, Part, or Part[]
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

    // Use our local client to generate the stream
    const stream = await this.localClient.generateContentStream(prompt);

    // Convert the stream to the expected format
    return (async function* () {
      for await (const chunk of stream) {
        // Create properly structured GenerateContentResponse
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

export class LocalModelClient {
  private client: Ollama;
  private config: LocalModelConfig;
  private conversationHistory: OllamaMessage[] = [];
  private chat: {
    addHistory: (content: Content) => void;
    getHistory: () => Content[];
    setHistory: (history: Content[]) => void;
    setTools: () => void;
  };

  constructor(config: Config, modelConfig: LocalModelConfig) {
    this.config = modelConfig;

    // Use the official Ollama client
    this.client = new Ollama({
      host: modelConfig.baseUrl,
    });

    // Initialize with system prompt if provided (same as Gemini approach)
    if (modelConfig.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: modelConfig.systemPrompt,
      });
    }

    // Initialize mock chat object for compatibility
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

      const response = await this.client.chat({
        model: this.config.model,
        messages: this.conversationHistory,
        stream: false,
        options: {
          temperature: this.config.temperature || 0.7,
          num_predict: this.config.maxTokens || 4096,
        },
      });

      const content = response.message.content || '';

      // Add response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content,
      });

      return content;
    } catch (error) {
      throw new Error(
        `Local model error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async generateContentStream(prompt: string): Promise<AsyncIterable<string>> {
    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: prompt });

    // Prepare chat options with thinking configuration
    const modelId = `${this.config.provider}:${this.config.model}`;
    const chatOptions: any = {
      model: this.config.model,
      messages: this.conversationHistory,
      stream: true,
      options: {
        temperature: this.config.temperature || 0.7,
        num_predict: this.config.maxTokens || 4096,
      },
    };

    // Configure thinking parameters if model supports it
    ThinkingStrategyFactory.configureThinkingForModel(
      modelId, 
      this.config.provider,
      chatOptions
    );

    const stream = await this.client.chat(chatOptions);

    const fullResponse: string[] = [];
    const conversationHistory = this.conversationHistory; // Capture reference

    // Create raw content stream
    const rawStream = {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          const content = chunk.message.content;
          if (content) {
            fullResponse.push(content);
            yield content;
          }
        }

        // Add complete response to conversation history
        conversationHistory.push({
          role: 'assistant',
          content: fullResponse.join(''),
        });
      },
    };

    // Process through thinking strategy - this handles both thinking and non-thinking models
    const thinkingStream = ThinkingStrategyFactory.processThinkingStream(
      rawStream,
      modelId,
      this.config.provider
    );

    // Convert thinking tokens back to simple text stream for compatibility
    return {
      async *[Symbol.asyncIterator]() {
        for await (const token of thinkingStream) {
          // For now, yield all content (thinking + regular) as text
          // This maintains backward compatibility while adding timeout protection
          if (token.type === 'content' || token.type === 'thinking') {
            yield token.text;
          }
        }
      },
    };
  }

  // Convert from Gemini format to Ollama format
  convertHistory(geminiHistory: Content[]): void {
    this.conversationHistory = [
      // Keep system prompt if exists
      ...this.conversationHistory.filter((msg) => msg.role === 'system'),
      // Convert Gemini history
      ...(geminiHistory
        .map((content) => this.convertMessage(content))
        .filter(Boolean) as OllamaMessage[]),
    ];
  }

  private convertMessage(content: Content): OllamaMessage | null {
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

  getHistory(): OllamaMessage[] {
    return this.conversationHistory;
  }

  // GeminiClient compatible getHistory
  getHistoryAsContent(): Content[] {
    return this.conversationHistory
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  setHistory(history: OllamaMessage[]): void {
    this.conversationHistory = history;
  }

  setHistoryFromContent(history: Content[]): void {
    this.convertHistory(history);
  }

  clearHistory(): void {
    // Keep system prompt if exists
    this.conversationHistory = this.conversationHistory.filter(
      (msg) => msg.role === 'system',
    );
  }

  async *sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    _prompt_id: string,
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    // Convert PartListUnion to string for local model
    const prompt = Array.isArray(request)
      ? request
          .map((part) => (part as unknown as { text?: string })?.text || '')
          .join('')
      : (request as unknown as { text?: string })?.text || '';

    try {
      // Stream response from local model
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

      // Return a proper Turn object with LocalGeminiChat
      const localChat = new LocalGeminiChat(
        this,
        this.config as unknown as Config,
      );
      return new Turn(localChat, _prompt_id);
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

      throw error;
    }
  }

  async isInitialized(): Promise<boolean> {
    // Local models are "initialized" once they're created
    return true;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  // GeminiClient compatibility methods
  getChat(): unknown {
    return this.chat;
  }

  addHistory(content: Content): void {
    this.convertHistory([content]);
  }

  getUserTier(): undefined {
    return undefined; // Local models don't have user tiers
  }

  async setTools(): Promise<void> {
    // No-op for local models - they don't support function calling yet
  }

  async resetChat(): Promise<void> {
    this.clearHistory();
  }

  async addDirectoryContext(): Promise<void> {
    // No-op for now - could add directory context to system prompt
  }
}
