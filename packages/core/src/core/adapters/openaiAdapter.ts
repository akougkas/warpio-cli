/**
 * Copyright 2025 IOWarp Team
 * 
 * OpenAIAdapter - Unified adapter for OpenAI-compatible providers
 * 
 * This adapter handles both Ollama and LMStudio through a strategy pattern,
 * since both providers use the OpenAI SDK but with different configurations.
 * 
 * Key features:
 * - Strategy pattern for provider-specific configuration
 * - Unified OpenAI SDK usage for both providers
 * - Health checking and model discovery
 * - Tool calling support with format conversion
 */

import OpenAI from 'openai';
import { Config } from '../../config/config.js';
import { BaseClient, ModelAdapter, ModelInfoV2, GenerateParams, StreamEvent } from '../modelManager.js';

/**
 * Unified adapter for OpenAI-compatible providers (Ollama, LMStudio)
 * Uses strategy pattern to handle provider-specific configurations
 */
export class OpenAIAdapter implements ModelAdapter {
  private strategies = new Map<string, ProviderStrategy>();
  
  constructor() {
    this.strategies.set('ollama', new OllamaStrategy());
    this.strategies.set('lmstudio', new LMStudioStrategy());
  }
  
  /**
   * Create OpenAI client for local models
   * Automatically detects provider and applies appropriate configuration
   */
  async createClient(model: string, config: Config): Promise<BaseClient> {
    // Detect provider from model, config, or running servers
    const provider = await this.detectProvider(model, config);
    const strategy = this.strategies.get(provider);
    
    if (!strategy) {
      throw new Error(`No strategy found for provider: ${provider}`);
    }
    
    // Get provider-specific OpenAI configuration
    const openaiConfig = await strategy.getOpenAIConfig(config);
    const openai = new OpenAI(openaiConfig);
    
    // Verify the client can connect
    await this.verifyConnection(openai, strategy);
    
    return new OpenAIClientWrapper(openai, model, strategy);
  }
  
  /**
   * List models from all configured providers
   * Combines results from Ollama and LMStudio
   */
  async listModels(): Promise<ModelInfoV2[]> {
    const allModels: ModelInfoV2[] = [];
    
    for (const [providerName, strategy] of this.strategies) {
      try {
        const models = await strategy.listModels();
        allModels.push(...models.map(model => ({
          ...model,
          provider: providerName
        })));
      } catch (error) {
        console.error(`Failed to list models for ${providerName}:`, error);
        // Continue with other providers
      }
    }
    
    return allModels;
  }
  
  /**
   * Validate if model is available from any provider
   */
  async validateModel(model: string): Promise<boolean> {
    const allModels = await this.listModels();
    return allModels.some(m => m.id === model || m.name === model);
  }
  
  /**
   * Detect which provider to use based on model, config, or running servers
   */
  private async detectProvider(model: string, config: Config): Promise<string> {
    // 1. Check explicit provider in config (using getProvider method)
    const configProvider = config.getProvider();
    if (configProvider && this.strategies.has(configProvider)) {
      return configProvider;
    }
    
    // 2. Try to detect from running servers
    const runningProviders = await Promise.all([
      this.isProviderRunning('ollama'),
      this.isProviderRunning('lmstudio')
    ]);
    
    if (runningProviders[0]) return 'ollama';
    if (runningProviders[1]) return 'lmstudio';
    
    // 3. Default to Ollama as it's more common
    return 'ollama';
  }
  
  /**
   * Check if a provider server is running and responding
   */
  private async isProviderRunning(provider: string): Promise<boolean> {
    try {
      const strategy = this.strategies.get(provider);
      if (!strategy) return false;
      
      return await strategy.checkHealth();
    } catch {
      return false;
    }
  }
  
  /**
   * Verify OpenAI client can connect to the provider
   */
  private async verifyConnection(openai: OpenAI, strategy: ProviderStrategy): Promise<void> {
    try {
      await openai.models.list();
    } catch (error) {
      throw new Error(`Failed to connect to ${strategy.constructor.name}: ${error}`);
    }
  }
}

/**
 * Strategy interface for provider-specific configuration
 */
interface ProviderStrategy {
  getOpenAIConfig(config: Config): Promise<any>;
  listModels(): Promise<ModelInfoV2[]>;
  checkHealth(): Promise<boolean>;
  transformMessages?(messages: any[]): any[];
  supportsTools(): boolean;
  supportsThinking(): boolean;
}

/**
 * Strategy for Ollama provider
 */
class OllamaStrategy implements ProviderStrategy {
  private defaultHost = 'http://localhost:11434';
  
  async getOpenAIConfig(config: Config): Promise<any> {
    const baseURL = process.env.OLLAMA_HOST || this.defaultHost;
    
    return {
      baseURL: `${baseURL}/v1`,
      apiKey: 'ollama', // Dummy key for Ollama
      defaultHeaders: {
        'X-Ollama-Compatibility': 'openai'
      },
      timeout: 30000 // 30 second timeout for local models
    };
  }
  
  async listModels(): Promise<ModelInfoV2[]> {
    try {
      // Import existing Ollama adapter for model discovery
      const { OllamaAdapter } = await import('../../adapters/ollama.js');
      const adapter = new OllamaAdapter();
      
      const models = await adapter.listModels();
      return models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: 'ollama',
        size: model.size,
        description: model.description,
        available: model.available ?? true
      }));
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }
  
  async checkHealth(): Promise<boolean> {
    try {
      const baseURL = process.env.OLLAMA_HOST || this.defaultHost;
      const response = await fetch(`${baseURL}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  supportsTools(): boolean {
    return true;
  }
  
  supportsThinking(): boolean {
    return true; // Many Ollama models support thinking
  }
}

/**
 * Strategy for LMStudio provider
 */
class LMStudioStrategy implements ProviderStrategy {
  private defaultHost = 'http://localhost:1234';
  
  async getOpenAIConfig(config: Config): Promise<any> {
    const baseURL = process.env.LMSTUDIO_HOST || this.defaultHost;
    
    return {
      baseURL: `${baseURL}/v1`,
      apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
      timeout: 30000 // 30 second timeout for local models
    };
  }
  
  async listModels(): Promise<ModelInfoV2[]> {
    try {
      // Import existing LMStudio adapter for model discovery
      const { LMStudioAdapter } = await import('../../adapters/lmstudio.js');
      const adapter = new LMStudioAdapter();
      
      const models = await adapter.listModels();
      return models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: 'lmstudio',
        size: model.size,
        description: model.description,
        available: model.available ?? true
      }));
    } catch (error) {
      console.error('Failed to list LMStudio models:', error);
      return [];
    }
  }
  
  async checkHealth(): Promise<boolean> {
    try {
      const baseURL = process.env.LMSTUDIO_HOST || this.defaultHost;
      const response = await fetch(`${baseURL}/v1/models`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  supportsTools(): boolean {
    return true;
  }
  
  supportsThinking(): boolean {
    return false; // LMStudio models typically don't support thinking tokens
  }
}

/**
 * Wrapper to adapt OpenAI client to BaseClient interface
 * Handles tool calling, message conversion, and streaming
 */
class OpenAIClientWrapper implements BaseClient {
  constructor(
    private openai: OpenAI,
    private model: string,
    private strategy: ProviderStrategy
  ) {}
  
  /**
   * Generate content using OpenAI SDK
   * Converts between BaseClient and OpenAI formats
   */
  async *generateContent(params: GenerateParams): AsyncGenerator<StreamEvent> {
    try {
      const messages = this.convertToOpenAIMessages(params.messages);
      
      // Add system message if provided
      if (params.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: params.systemPrompt
        });
      }
      
      const tools = params.tools ? this.convertToOpenAITools(params.tools) : undefined;
      
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        stream: true,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        tools,
        ...params.options
      });
      
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          yield {
            type: 'content',
            content: delta.content
          };
        }
        
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function && toolCall.function.name) {
              yield {
                type: 'tool_call',
                tool_call: {
                  name: toolCall.function.name,
                  arguments: JSON.parse(toolCall.function.arguments || '{}')
                }
              };
            }
          }
        }
        
        // Handle thinking tokens if supported (reasoning property might not exist)
        if (this.strategy.supportsThinking() && (delta as any)?.reasoning) {
          yield {
            type: 'thinking',
            thinking: (delta as any).reasoning
          };
        }
      }
      
      yield {
        type: 'done',
        done: true
      };
      
    } catch (error) {
      console.error('OpenAI generateContent error:', error);
      throw error;
    }
  }
  
  /**
   * Count tokens (not all local models support this)
   */
  async countTokens(text: string): Promise<number> {
    // Most local models don't have token counting
    // Return rough estimate based on text length
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Generate embeddings (not all local models support this)
   */
  async embedContent(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text
      });
      
      return response.data[0]?.embedding || [];
    } catch (error) {
      console.error('OpenAI embedContent error:', error);
      return [];
    }
  }
  
  /**
   * Check if the client is healthy and can make requests
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
   * Convert BaseClient messages to OpenAI format
   */
  private convertToOpenAIMessages(messages: any[]): any[] {
    return messages.map(message => ({
      role: message.role,
      content: message.content || message.text
    }));
  }
  
  /**
   * Convert BaseClient tools to OpenAI tools format
   */
  private convertToOpenAITools(tools: any[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || tool.schema
      }
    }));
  }
}