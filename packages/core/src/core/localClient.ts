/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable license-header/header */

import { Ollama } from 'ollama';
import { Content, PartListUnion } from '@google/genai';
import { Config } from '../config/config.js';
import { Turn, ServerGeminiStreamEvent, GeminiEventType } from './turn.js';
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

export class LocalModelClient {
  private client: Ollama;
  private config: LocalModelConfig;
  private conversationHistory: OllamaMessage[] = [];
  private chat: any; // Mock chat object for compatibility

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
      throw new Error(`Local model error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      }
    };
  }

  // Convert from Gemini format to Ollama format
  convertHistory(geminiHistory: Content[]): void {
    this.conversationHistory = [
      // Keep system prompt if exists
      ...this.conversationHistory.filter(msg => msg.role === 'system'),
      // Convert Gemini history
      ...geminiHistory.map(content => this.convertMessage(content)).filter(Boolean) as OllamaMessage[]
    ];
  }

  private convertMessage(content: Content): OllamaMessage | null {
    if (!content.parts || content.parts.length === 0) return null;

    const textParts = content.parts
      .filter(part => 'text' in part)
      .map(part => (part as { text: string }).text)
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
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
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
    this.conversationHistory = this.conversationHistory.filter(msg => msg.role === 'system');
  }

  async *sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string,
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    // Convert PartListUnion to string for local model
    const prompt = Array.isArray(request) 
      ? request.map(part => (part as any)?.text || '').join('')
      : (request as any)?.text || '';

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

      // Return a minimal Turn object
      // Note: This is a simplified implementation - in a full implementation 
      // you might want to create a proper Turn class for local models
      return {} as Turn;
      
    } catch (error) {
      // Emit error event
      yield {
        type: GeminiEventType.Error,
        value: { 
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
          }
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
  getChat(): any {
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