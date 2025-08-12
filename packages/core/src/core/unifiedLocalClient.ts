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
  Tool,
} from '@google/genai';
import { Config } from '../config/config.js';
import { Turn, ServerGeminiStreamEvent, GeminiEventType } from './turn.js';
import { GeminiChat } from './geminiChat.js';
import { ContentGenerator } from './contentGenerator.js';
import { LocalProvider } from './providers/index.js';
import { LocalToolManager } from './localToolManager.js';
import { LocalStreamProcessor } from './streamProcessors.js';
import { WarpioThinkingProcessor } from '../reasoning/thinkingProcessor.js';

/**
 * Unified client for all local AI providers (Ollama, LMStudio) using OpenAI-compatible APIs.
 * Replaces both LocalModelClient and LMStudioModelClient with a single, clean implementation.
 * Provides full tool calling support and thinking token processing.
 */
export class UnifiedLocalClient {
  private openai: OpenAI;
  private provider: LocalProvider;
  private toolManager: LocalToolManager;
  private streamProcessor: LocalStreamProcessor;
  private thinkingProcessor: WarpioThinkingProcessor;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private contentGenerator?: UnifiedContentGenerator;
  private chat?: UnifiedGeminiChat;

  constructor(config: Config, provider: LocalProvider) {
    this.provider = provider;
    
    // Configure OpenAI client with provider-specific settings
    this.openai = new OpenAI({
      baseURL: provider.baseUrl,
      apiKey: provider.apiKey || 'not-needed',
      ...provider.getClientConfig()
    });
    
    this.toolManager = new LocalToolManager();
    this.thinkingProcessor = new WarpioThinkingProcessor(
      `${provider.name}:${provider.getModelName()}`,
      { timeoutMs: 30000 }
    );
    this.streamProcessor = new LocalStreamProcessor(
      this.thinkingProcessor,
      this.provider
    );

    // Initialize system prompt if provided
    if (config.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: config.systemPrompt,
      });
    }
  }

  async initialize(): Promise<void> {
    this.contentGenerator = new UnifiedContentGenerator(this);
    this.chat = new UnifiedGeminiChat(this);
  }

  getContentGenerator(): ContentGenerator {
    if (!this.contentGenerator) {
      throw new Error('Content generator not initialized');
    }
    return this.contentGenerator;
  }

  getUserTier(): undefined {
    return undefined; // Local models don't have user tiers
  }

  async addHistory(content: Content): Promise<void> {
    this.getChat().addHistory(content);
  }

  getChat(): UnifiedGeminiChat {
    if (!this.chat) {
      throw new Error('Chat not initialized');
    }
    return this.chat;
  }

  isInitialized(): boolean {
    return this.chat !== undefined && this.contentGenerator !== undefined;
  }

  getHistory(): Content[] {
    return this.getChat().getHistory();
  }

  setHistory(history: Content[]): void {
    this.getChat().setHistory(history);
    this.rebuildConversationHistory(history);
  }

  async setTools(tools: Tool[]): Promise<void> {
    if (!this.provider.supportsTools) {
      console.warn(`Provider ${this.provider.name} doesn't support tools`);
      return;
    }
    await this.toolManager.setTools(tools);
  }

  async resetChat(): Promise<void> {
    this.conversationHistory = [];
    // Re-add system prompt if it was originally present
    const systemMessage = this.conversationHistory.find(m => m.role === 'system');
    if (systemMessage) {
      this.conversationHistory.push(systemMessage);
    }
    this.chat = new UnifiedGeminiChat(this);
  }

  async addDirectoryContext(): Promise<void> {
    // No-op for now - could add directory context to system prompt
  }

  /**
   * Core streaming method that handles tool calling and thinking tokens
   */
  async *sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    const messages = this.buildMessagesFromRequest(request);
    const tools = this.toolManager.formatToolsForOpenAI();
    
    const stream = await this.openai.chat.completions.create({
      model: this.provider.getModelName(),
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
      signal
    });
    
    // Process stream with thinking detection and tool calling
    yield* this.streamProcessor.processOpenAIStream(stream, this.toolManager);
    
    return new Turn(this.getChat(), prompt_id);
  }

  /**
   * Non-streaming content generation for compatibility
   */
  async generateContent(prompt: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: prompt });

      const tools = this.toolManager.formatToolsForOpenAI();
      const response = await this.openai.chat.completions.create({
        model: this.provider.getModelName(),
        messages: this.conversationHistory,
        tools: tools.length > 0 ? tools : undefined,
        stream: false,
        temperature: this.provider.getTemperature(),
        max_tokens: this.provider.getMaxTokens()
      });

      // Handle tool calls if present
      const message = response.choices[0]?.message;
      if (message?.tool_calls) {
        const toolResults = await this.toolManager.handleToolCalls(message.tool_calls);
        this.conversationHistory.push(message);
        this.conversationHistory.push(...toolResults);

        // Get final response after tool calls
        const finalResponse = await this.openai.chat.completions.create({
          model: this.provider.getModelName(),
          messages: this.conversationHistory,
          stream: false
        });

        const content = finalResponse.choices[0]?.message?.content || '';
        this.conversationHistory.push({
          role: 'assistant',
          content
        });
        return content;
      }

      const content = message?.content || '';
      
      // Add response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content,
      });

      return content;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  /**
   * Streaming content generation for compatibility
   */
  async *generateContentStream(prompt: string): AsyncGenerator<string> {
    try {
      this.conversationHistory.push({ role: 'user', content: prompt });

      const tools = this.toolManager.formatToolsForOpenAI();
      const stream = await this.openai.chat.completions.create({
        model: this.provider.getModelName(),
        messages: this.conversationHistory,
        tools: tools.length > 0 ? tools : undefined,
        stream: true
      });

      let accumulatedContent = '';
      let currentToolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          accumulatedContent += delta.content;
          yield delta.content;
        }

        if (delta?.tool_calls) {
          currentToolCalls.push(...delta.tool_calls);
        }

        // Handle tool calls at end of stream
        if (chunk.choices[0]?.finish_reason === 'tool_calls') {
          const toolResults = await this.toolManager.handleToolCalls(currentToolCalls);
          this.conversationHistory.push({
            role: 'assistant',
            content: accumulatedContent,
            tool_calls: currentToolCalls
          });
          this.conversationHistory.push(...toolResults);

          // Continue conversation after tool calls
          const followupStream = await this.openai.chat.completions.create({
            model: this.provider.getModelName(),
            messages: this.conversationHistory,
            stream: true
          });

          for await (const followupChunk of followupStream) {
            const followupDelta = followupChunk.choices[0]?.delta;
            if (followupDelta?.content) {
              accumulatedContent += followupDelta.content;
              yield followupDelta.content;
            }
          }
        }
      }

      // Add final response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: accumulatedContent,
      });

    } catch (error) {
      console.error('Error in streaming generation:', error);
      throw error;
    }
  }

  /**
   * Health check for the local provider
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert Gemini request format to OpenAI messages
   */
  private buildMessagesFromRequest(request: PartListUnion): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages = [...this.conversationHistory];
    
    // Extract text content from the request
    const content = this.extractTextFromParts(request);
    if (content) {
      messages.push({ role: 'user', content });
    }

    return messages;
  }

  /**
   * Extract text content from Gemini parts format
   */
  private extractTextFromParts(parts: PartListUnion): string {
    if (typeof parts === 'string') {
      return parts;
    }
    
    if (Array.isArray(parts)) {
      return parts
        .filter((part): part is { text: string } => 'text' in part)
        .map(part => part.text)
        .join('');
    }
    
    return '';
  }

  /**
   * Rebuild conversation history from Gemini Content format
   */
  private rebuildConversationHistory(history: Content[]): void {
    this.conversationHistory = [];
    
    for (const content of history) {
      const text = this.extractTextFromParts(content.parts);
      if (text) {
        this.conversationHistory.push({
          role: content.role === 'user' ? 'user' : 'assistant',
          content: text
        });
      }
    }
  }
}

/**
 * ContentGenerator implementation for unified local client
 */
class UnifiedContentGenerator implements ContentGenerator {
  constructor(private client: UnifiedLocalClient) {}

  async generateContent(
    request: unknown,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const prompt = this.extractPromptFromRequest(request);
    const content = await this.client.generateContent(prompt);

    return {
      candidates: [{
        content: {
          parts: [{ text: content }],
          role: 'model',
        },
        finishReason: FinishReason.STOP,
        index: 0,
      }],
      promptFeedback: {},
      usageMetadata: {
        promptTokenCount: 0,
        candidatesTokenCount: content.length,
        totalTokenCount: content.length,
      },
      get text(): string { return content; },
      get data(): string | undefined { return undefined; },
      get functionCalls(): FunctionCall[] | undefined { return []; },
      get executableCode(): string | undefined { return undefined; },
      get codeExecutionResult(): string | undefined { return undefined; },
    } as GenerateContentResponse;
  }

  async *generateContentStream(
    request: unknown,
    _userPromptId: string,
  ): AsyncGenerator<GenerateContentResponse> {
    const prompt = this.extractPromptFromRequest(request);
    const stream = this.client.generateContentStream(prompt);

    for await (const chunk of stream) {
      yield {
        candidates: [{
          content: {
            parts: [{ text: chunk }],
            role: 'model',
          },
          finishReason: FinishReason.STOP,
          index: 0,
        }],
        promptFeedback: {},
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: chunk.length,
          totalTokenCount: chunk.length,
        },
        get text(): string { return chunk; },
        get data(): string | undefined { return undefined; },
        get functionCalls(): FunctionCall[] | undefined { return []; },
        get executableCode(): string | undefined { return undefined; },
        get codeExecutionResult(): string | undefined { return undefined; },
      } as GenerateContentResponse;
    }
  }

  private extractPromptFromRequest(request: unknown): string {
    if (typeof request === 'string') {
      return request;
    }
    
    if (request && typeof request === 'object' && 'parts' in request) {
      const parts = (request as any).parts;
      if (Array.isArray(parts)) {
        return parts
          .filter((part: any) => part && typeof part === 'object' && 'text' in part)
          .map((part: any) => part.text)
          .join('');
      }
    }
    
    return JSON.stringify(request);
  }
}

/**
 * GeminiChat implementation for unified local client
 */
class UnifiedGeminiChat extends GeminiChat {
  private history: Content[] = [];
  private tools: Tool[] = [];

  constructor(private client: UnifiedLocalClient) {
    // Create a proper ContentGenerator that delegates to UnifiedLocalClient
    const contentGenerator = client.getContentGenerator();
    super({} as any, contentGenerator, {}, []);
  }

  addHistory(content: Content): void {
    this.history.push(content);
  }

  getHistory(): Content[] {
    return this.history;
  }

  setHistory(history: Content[]): void {
    this.history = history;
    this.client.setHistory(history);
  }

  setTools(tools: Tool[]): void {
    this.tools = tools;
    this.client.setTools(tools);
  }

  async sendMessageStream(
    params: SendMessageParameters,
    prompt_id: string
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    // Use the unified client's streaming with full tool support
    const stream = this.client.sendMessageStream(params.message, new AbortController().signal, prompt_id);
    
    // Convert to GenerateContentResponse format
    return this.convertToGeminiFormat(stream);
  }

  private async *convertToGeminiFormat(
    stream: AsyncGenerator<ServerGeminiStreamEvent, Turn>
  ): AsyncGenerator<GenerateContentResponse> {
    for await (const event of stream) {
      if (event.type === GeminiEventType.Content || event.type === GeminiEventType.Thought) {
        yield {
          candidates: [{
            content: {
              parts: [{ text: event.value as string }],
              role: 'model'
            },
            finishReason: FinishReason.STOP
          }],
          get text() { return event.value as string; },
          get functionCalls() { return []; }
        } as GenerateContentResponse;
      }
    }
  }
}