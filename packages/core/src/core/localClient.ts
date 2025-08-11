/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ollama } from 'ollama';
import { Content, PartListUnion } from '@google/genai';
import { Config } from '../config/config.js';
import { Turn, ServerGeminiStreamEvent, GeminiEventType } from './turn.js';
import { GeminiChat } from './geminiChat.js';
import type { Message as OllamaMessage } from 'ollama';

export interface LocalModelConfig {
  provider: 'ollama' | 'lmstudio';
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// Minimal LocalGeminiChat implementation for Turn compatibility
class LocalGeminiChat extends GeminiChat {
  constructor(
    private localClient: LocalModelClient,
    config: Config,
  ) {
    // Pass required parameters to parent constructor
    // We need to create minimal mocks for the required parameters
    const mockContentGenerator = {} as any; // This won't be used in our implementation
    super(config, mockContentGenerator, {}, []);
  }

  // Override sendMessageStream to use our local model
  async sendMessageStream(
    params: any,
    prompt_id: string,
  ): Promise<AsyncGenerator<any>> {
    // Convert the message to a simple string prompt
    const prompt = Array.isArray(params.message)
      ? params.message.map((part: any) => part?.text || '').join('')
      : params.message?.text || '';

    // Use our local client to generate the stream
    const stream = await this.localClient.generateContentStream(prompt);
    
    // Convert the stream to the expected format
    return (async function* () {
      for await (const chunk of stream) {
        // Mock the GenerateContentResponse structure
        yield {
          candidates: [{ content: { parts: [{ text: chunk }] } }],
          promptFeedback: {},
          usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
        };
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

    // Initialize with system prompt if provided
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

    const stream = await this.client.chat({
      model: this.config.model,
      messages: this.conversationHistory,
      stream: true,
      options: {
        temperature: this.config.temperature || 0.7,
        num_predict: this.config.maxTokens || 4096,
      },
    });

    const fullResponse: string[] = [];
    const conversationHistory = this.conversationHistory; // Capture reference

    return {
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
      ? request.map((part) => (part as unknown as { text?: string })?.text || '').join('')
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
      const localChat = new LocalGeminiChat(this, this.config as any);
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
