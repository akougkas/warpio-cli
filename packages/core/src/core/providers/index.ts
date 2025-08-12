/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';

/**
 * Provider strategy interface for local AI providers.
 * Abstracts provider-specific configuration and capabilities.
 */
export interface LocalProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  supportsTools: boolean;
  supportsThinking: boolean;
  
  getClientConfig(): Partial<OpenAI.ClientOptions>;
  getModelName(): string;
  getTemperature(): number;
  getMaxTokens(): number;
  transformMessages?(messages: OpenAI.Chat.ChatCompletionMessageParam[]): OpenAI.Chat.ChatCompletionMessageParam[];
  configureStreamOptions?(options: any): void;
}

/**
 * Ollama provider using OpenAI-compatible /v1 endpoint.
 * Supports both tool calling and native thinking tokens.
 */
export class OllamaProvider implements LocalProvider {
  name = 'ollama';
  baseUrl = 'http://localhost:11434/v1';
  supportsTools = true; // Via OpenAI compatibility
  supportsThinking = true; // Native support

  constructor(
    private model: string,
    private temperature: number = 0.7,
    private maxTokens: number = 4096,
    private customBaseUrl?: string
  ) {
    if (customBaseUrl) {
      // Ensure we use the v1 endpoint for OpenAI compatibility
      this.baseUrl = customBaseUrl.endsWith('/v1') ? customBaseUrl : `${customBaseUrl}/v1`;
    }
  }

  getClientConfig(): Partial<OpenAI.ClientOptions> {
    return {
      defaultHeaders: {
        'X-Ollama-Compatibility': 'openai'
      },
      timeout: 120000 // 2 minutes timeout for local processing
    };
  }

  getModelName(): string {
    return this.model;
  }

  getTemperature(): number {
    return this.temperature;
  }

  getMaxTokens(): number {
    return this.maxTokens;
  }

  /**
   * Ollama-specific message transformations if needed
   */
  transformMessages(messages: OpenAI.Chat.ChatCompletionMessageParam[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    // Ollama handles OpenAI format natively, no transformation needed
    return messages;
  }

  /**
   * Get health check endpoint for Ollama
   */
  getHealthEndpoint(): string {
    return 'http://localhost:11434/api/tags';
  }

  /**
   * Get native Ollama endpoint for non-OpenAI operations
   */
  getNativeBaseUrl(): string {
    return this.baseUrl.replace('/v1', '');
  }
}

/**
 * LMStudio provider using native OpenAI-compatible endpoint.
 * Supports tool calling, thinking tokens via pattern detection only.
 */
export class LMStudioProvider implements LocalProvider {
  name = 'lmstudio';
  baseUrl = 'http://localhost:1234/v1';
  supportsTools = true; // Native OpenAI support
  supportsThinking = false; // Pattern detection only

  constructor(
    private model: string,
    private temperature: number = 0.7,
    private maxTokens: number = 4096,
    private customBaseUrl?: string,
    private apiKey?: string
  ) {
    if (customBaseUrl) {
      // LMStudio uses /v1 endpoint by default
      this.baseUrl = customBaseUrl.endsWith('/v1') ? customBaseUrl : `${customBaseUrl}/v1`;
    }
    this.apiKey = apiKey;
  }

  getClientConfig(): Partial<OpenAI.ClientOptions> {
    return {
      apiKey: this.apiKey || 'lm-studio', // LMStudio requires a dummy key
      timeout: 120000 // 2 minutes timeout for local processing
    };
  }

  getModelName(): string {
    return this.model;
  }

  getTemperature(): number {
    return this.temperature;
  }

  getMaxTokens(): number {
    return this.maxTokens;
  }

  /**
   * LMStudio message transformations if needed
   */
  transformMessages(messages: OpenAI.Chat.ChatCompletionMessageParam[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    // LMStudio uses standard OpenAI format, no transformation needed
    return messages;
  }

  /**
   * Get health check endpoint for LMStudio
   */
  getHealthEndpoint(): string {
    return `${this.baseUrl}/models`;
  }
}

/**
 * Future-ready OpenAI provider for when we add OpenAI support
 */
export class OpenAIProvider implements LocalProvider {
  name = 'openai';
  baseUrl = 'https://api.openai.com/v1';
  supportsTools = true;
  supportsThinking = true; // For o1 models

  constructor(
    private model: string,
    private apiKey: string,
    private temperature: number = 0.7,
    private maxTokens: number = 4096
  ) {}

  getClientConfig(): Partial<OpenAI.ClientOptions> {
    return {
      apiKey: this.apiKey
    };
  }

  getModelName(): string {
    return this.model;
  }

  getTemperature(): number {
    return this.temperature;
  }

  getMaxTokens(): number {
    return this.maxTokens;
  }

  transformMessages(messages: OpenAI.Chat.ChatCompletionMessageParam[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages;
  }
}

/**
 * Factory function to create providers based on configuration
 */
export function createLocalProvider(
  providerName: string,
  model: string,
  options: {
    baseUrl?: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): LocalProvider {
  const {
    baseUrl,
    apiKey,
    temperature = 0.7,
    maxTokens = 4096
  } = options;

  switch (providerName.toLowerCase()) {
    case 'ollama':
      return new OllamaProvider(model, temperature, maxTokens, baseUrl);
      
    case 'lmstudio':
      return new LMStudioProvider(model, temperature, maxTokens, baseUrl, apiKey);
      
    case 'openai':
      if (!apiKey) {
        throw new Error('OpenAI API key is required');
      }
      return new OpenAIProvider(model, apiKey, temperature, maxTokens);
      
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Provider detection utilities
 */
export class ProviderDetector {
  /**
   * Detect provider from model string
   */
  static detectProvider(model: string): string {
    // Provider-prefixed models (e.g., "ollama:llama3.3", "lmstudio:qwen3-4b")
    if (model.includes(':')) {
      const [provider] = model.split(':', 2);
      return provider.toLowerCase();
    }

    // Default heuristics based on common patterns
    if (model.includes('llama') || model.includes('qwen') || model.includes('codellama')) {
      return 'ollama';
    }

    if (model.includes('gpt') || model.includes('claude') || model.startsWith('o1')) {
      return 'openai';
    }

    // Default to ollama for unknown local models
    return 'ollama';
  }

  /**
   * Extract model name from provider-prefixed string
   */
  static extractModelName(model: string): string {
    if (model.includes(':')) {
      const parts = model.split(':', 2);
      return parts[1] || parts[0];
    }
    return model;
  }

  /**
   * Check if a model string indicates a local provider
   */
  static isLocalModel(model: string): boolean {
    // Explicit local providers
    if (model.startsWith('ollama:') || model.startsWith('lmstudio:')) {
      return true;
    }

    // Gemini models are not local
    if (model.startsWith('gemini') || model.startsWith('models/')) {
      return false;
    }

    // OpenAI models are not local (when we support them)
    if (model.startsWith('gpt-') || model.startsWith('o1-')) {
      return false;
    }

    // Everything else is likely local
    return true;
  }
}

/**
 * Provider health checking utilities
 */
export class ProviderHealthChecker {
  /**
   * Check if a provider is available and healthy
   */
  static async checkProvider(provider: LocalProvider): Promise<boolean> {
    try {
      const client = new OpenAI({
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey || 'not-needed',
        ...provider.getClientConfig()
      });

      // Try to list models as a health check
      await client.models.list();
      return true;
    } catch (error) {
      console.debug(`Provider ${provider.name} health check failed:`, error);
      return false;
    }
  }

  /**
   * Find the first available provider for a model
   */
  static async findAvailableProvider(model: string): Promise<LocalProvider | null> {
    const detectedProvider = ProviderDetector.detectProvider(model);
    const modelName = ProviderDetector.extractModelName(model);

    const providersToTry = [detectedProvider];
    
    // Add fallback providers if the detected one fails
    if (detectedProvider !== 'ollama') {
      providersToTry.push('ollama');
    }
    if (detectedProvider !== 'lmstudio') {
      providersToTry.push('lmstudio');
    }

    for (const providerName of providersToTry) {
      try {
        const provider = createLocalProvider(providerName, modelName);
        const isHealthy = await this.checkProvider(provider);
        
        if (isHealthy) {
          return provider;
        }
      } catch (error) {
        console.debug(`Failed to create or check provider ${providerName}:`, error);
      }
    }

    return null;
  }
}