/**
 * Copyright 2025 IOWarp Team
 * 
 * ModelManager - Unified model selection and loading system
 * 
 * This class consolidates all model operations into a single entry point,
 * replacing the fragmented system of 24+ files, 8 classes, and 4 services.
 * 
 * Key features:
 * - Universal model parsing with `provider::model` format
 * - Adapter pattern for clean provider separation
 * - 100% Gemini compatibility preservation
 * - 50% code reduction through consolidation
 */

import { Config } from '../config/config.js';

export interface ParsedModel {
  provider: 'gemini' | 'ollama' | 'lmstudio';
  modelName: string;
  originalInput: string;
}

export interface ModelInfoV2 {
  id: string;
  name: string;
  provider: string;
  size?: string;
  description?: string;
  available: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  schema?: Record<string, any>;
}

export interface ModelManagerToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface GenerateParams {
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  options?: Record<string, unknown>;
}

export interface StreamEvent {
  type: 'content' | 'tool_call' | 'thinking' | 'done';
  content?: string;
  tool_call?: ModelManagerToolCall;
  thinking?: string;
  done?: boolean;
}

export interface BaseClient {
  generateContent(params: GenerateParams): AsyncGenerator<StreamEvent>;
  countTokens?(text: string): Promise<number>;
  embedContent?(text: string): Promise<number[]>;
  checkHealth(): Promise<boolean>;
}

export interface ModelAdapter {
  createClient(model: string, config: Config): Promise<BaseClient>;
  listModels(): Promise<ModelInfoV2[]>;
  validateModel(model: string): Promise<boolean>;
}

/**
 * Unified ModelManager - Single entry point for ALL model operations
 * 
 * Replaces:
 * - parseProviderModel() (used in 24+ files)
 * - ClientFactory routing logic
 * - UnifiedLocalClient complexity
 * - Multiple discovery services
 * - Scattered provider detection
 */
export class ModelManager {
  private static instance: ModelManager;
  private adapters = new Map<string, ModelAdapter>();
  
  private constructor() {
    // Lazy loading - adapters will be registered on first use
  }
  
  static getInstance(): ModelManager {
    if (!this.instance) {
      this.instance = new ModelManager();
    }
    return this.instance;
  }
  
  /**
   * Parse model input with universal format support
   * 
   * Handles:
   * - provider::model (e.g., "lmstudio::qwen3-4b@q4_k_m:latest")
   * - bare names (e.g., "flash" → "gemini::gemini-2.5-flash")
   * - complex model names with special characters (@, :, ., -)
   * 
   * @param input Raw model string from CLI or config
   * @returns Parsed model with provider and name
   */
  parseModel(input: string): ParsedModel {
    if (!input || typeof input !== 'string') {
      throw new Error('Model input must be a non-empty string');
    }
    
    // Check for provider::model format (double colon separator)
    const separatorIndex = input.indexOf('::');
    
    if (separatorIndex !== -1) {
      const provider = input.substring(0, separatorIndex).toLowerCase();
      const modelName = input.substring(separatorIndex + 2);
      
      if (!modelName) {
        throw new Error(
          `Empty model name after provider separator. Expected format: provider::model`
        );
      }
      
      if (!['gemini', 'ollama', 'lmstudio'].includes(provider)) {
        throw new Error(
          `Invalid provider "${provider}". Valid providers: gemini, ollama, lmstudio`
        );
      }
      
      return {
        provider: provider as ParsedModel['provider'],
        modelName,
        originalInput: input
      };
    }
    
    // No separator - assume Gemini for backward compatibility
    // This preserves existing behavior for commands like:
    // npx warpio -m flash
    // npx warpio -m gemini-2.5-flash
    return {
      provider: 'gemini',
      modelName: this.resolveGeminiAlias(input),
      originalInput: input
    };
  }
  
  /**
   * Resolve Gemini model aliases to full model names
   * Preserves existing Gemini CLI behavior
   */
  private resolveGeminiAlias(input: string): string {
    const aliases: Record<string, string> = {
      'pro': 'gemini-2.5-pro',
      'flash': 'gemini-2.5-flash',
      'flash-lite': 'gemini-2.5-flash-lite',
      'flash-002': 'gemini-2.0-flash-002',
      'flash-thinking': 'gemini-2.0-flash-thinking-exp-1219'
    };
    
    return aliases[input.toLowerCase()] || input;
  }
  
  /**
   * Create client using appropriate adapter
   * 
   * @param parsedModel Result from parseModel()
   * @param config Application configuration
   * @returns BaseClient ready for use
   */
  async createClient(parsedModel: ParsedModel, config: Config): Promise<BaseClient> {
    const adapter = await this.getAdapter(parsedModel.provider);
    
    if (!adapter) {
      throw new Error(`No adapter found for provider: ${parsedModel.provider}`);
    }
    
    return adapter.createClient(parsedModel.modelName, config);
  }
  
  /**
   * List all available models from all providers
   * Combines results from all registered adapters
   */
  async listAvailableModels(): Promise<ModelInfoV2[]> {
    const allModels: ModelInfoV2[] = [];
    
    // Try to load all adapters
    const providers = ['gemini', 'ollama', 'lmstudio'];
    
    for (const provider of providers) {
      try {
        const adapter = await this.getAdapter(provider as ParsedModel['provider']);
        const models = await adapter.listModels();
        allModels.push(...models);
      } catch (error) {
        // Log but don't fail if one provider is unavailable
        console.error(`Failed to list models for ${provider}:`, error);
      }
    }
    
    return allModels;
  }
  
  /**
   * Get adapter for provider, loading it if necessary
   * Implements lazy loading to avoid unnecessary dependencies
   */
  private async getAdapter(provider: ParsedModel['provider']): Promise<ModelAdapter> {
    if (!this.adapters.has(provider)) {
      await this.loadAdapter(provider);
    }
    
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Failed to load adapter for provider: ${provider}`);
    }
    
    return adapter;
  }
  
  /**
   * Lazy load adapters to avoid circular dependencies and reduce startup time
   */
  private async loadAdapter(provider: ParsedModel['provider']): Promise<void> {
    try {
      switch (provider) {
        case 'gemini': {
          const { GeminiAdapter } = await import('./adapters/geminiAdapter.js');
          this.adapters.set('gemini', new GeminiAdapter());
          break;
        }
        
        case 'ollama':
        case 'lmstudio': {
          const { OpenAIAdapter } = await import('./adapters/openaiAdapter.js');
          
          // Both Ollama and LMStudio use the same OpenAI adapter
          // but with different strategies
          if (!this.adapters.has('ollama')) {
            const openAIAdapter = new OpenAIAdapter();
            this.adapters.set('ollama', openAIAdapter);
            this.adapters.set('lmstudio', openAIAdapter);
          }
          break;
        }
        
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      throw new Error(`Failed to load adapter for ${provider}: ${error}`);
    }
  }
  
  /**
   * Validate if a model string is properly formatted
   * Used for early validation before attempting to create clients
   */
  validateModelFormat(input: string): boolean {
    try {
      this.parseModel(input);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get provider configuration for external tools
   * Useful for debugging and configuration validation
   */
  getProviderInfo(provider: ParsedModel['provider']): ProviderInfo {
    const configs: Record<ParsedModel['provider'], ProviderInfo> = {
      gemini: {
        name: 'Google Gemini',
        type: 'gemini' as const,
        requiresAuth: true,
        envVars: ['GEMINI_API_KEY'],
        defaultModel: 'gemini-2.5-flash'
      },
      ollama: {
        name: 'Ollama',
        type: 'openai' as const,
        requiresAuth: false,
        envVars: ['OLLAMA_HOST'],
        defaultModel: 'qwen3:8b',
        defaultHost: 'http://localhost:11434'
      },
      lmstudio: {
        name: 'LM Studio',
        type: 'openai' as const,
        requiresAuth: false,
        envVars: ['LMSTUDIO_HOST', 'LMSTUDIO_API_KEY'],
        defaultModel: 'qwen3-4b-instruct-2507@q8_0',
        defaultHost: 'http://localhost:1234'
      }
    };
    
    return configs[provider];
  }
}

interface ProviderInfo {
  name: string;
  type: 'gemini' | 'openai';
  requiresAuth: boolean;
  envVars: string[];
  defaultModel: string;
  defaultHost?: string;
}

// Export singleton for convenience
export const modelManager = ModelManager.getInstance();