/**
 * Dynamic Warpio Provider Registry
 * Configuration-driven provider registry with zero hardcoded models or fallbacks
 */

import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createProviderRegistry, customProvider } from 'ai';
import { 
  WarpioConfigLoader, 
  WarpioRuntimeConfig,
  WarpioConfigurationError 
} from './config/index.js';

export interface DynamicProviderConfig {
  provider: string;
  model: string;
  baseURL?: string;
  apiKey?: string;
  temperature?: number;
  timeout?: number;
  stopTokens?: string[];
  maxTokens?: number;
}

/**
 * Dynamic provider registry that builds providers from configuration
 */
export class WarpioProviderRegistry {
  private configLoader: WarpioConfigLoader;
  private registry: any | null = null;

  constructor(configLoader?: WarpioConfigLoader) {
    this.configLoader = configLoader || new WarpioConfigLoader();
  }

  /**
   * Get language model with full configuration validation
   */
  getLanguageModel(cliOverrides?: { provider?: string; model?: string }): any {
    const config = this.configLoader.loadConfiguration(cliOverrides);
    
    // Build registry on-demand with current configuration
    const registry = this.buildRegistry(config);
    const modelId = this.buildModelId(config);

    try {
      return registry.languageModel(modelId);
    } catch (error) {
      throw new WarpioConfigurationError(
        `Failed to create language model for ${config.provider}::${config.model}`,
        {
          error: error instanceof Error ? error.message : String(error),
          suggestion: 'Verify your provider configuration and network connectivity',
          availableProviders: this.getSupportedProviders(),
        }
      );
    }
  }

  /**
   * List all available models from configuration
   */
  getAvailableModels(): Record<string, string[]> {
    return this.configLoader.getAvailableModels();
  }

  /**
   * Test provider availability without creating models
   */
  async testProviderAvailability(config: WarpioRuntimeConfig): Promise<boolean> {
    try {
      // For now, basic validation that required fields are present
      this.validateProviderConfig(config);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build provider registry dynamically from configuration
   */
  private buildRegistry(config: WarpioRuntimeConfig): any {
    const providers: Record<string, any> = {};

    switch (config.provider) {
      case 'gemini':
        providers.gemini = google;
        break;

      case 'lmstudio':
        providers.lmstudio = this.createLMStudioProvider(config);
        break;

      case 'ollama':
        providers.ollama = this.createOllamaProvider(config);
        break;

      case 'openai':
        providers.openai = this.createOpenAIProvider(config);
        break;

      default:
        throw new WarpioConfigurationError(
          `Unsupported provider: ${config.provider}`,
          {
            supportedProviders: this.getSupportedProviders(),
          }
        );
    }

    return createProviderRegistry(providers, { separator: ':' });
  }

  /**
   * Create LM Studio provider from configuration
   */
  private createLMStudioProvider(config: WarpioRuntimeConfig): any {
    if (!config.baseURL) {
      throw new WarpioConfigurationError(
        'LM Studio provider requires baseURL configuration'
      );
    }

    const provider = createOpenAICompatible({
      name: 'lmstudio',
      baseURL: config.baseURL,
      apiKey: config.apiKey || 'lm-studio',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Build language models dynamically
    const languageModels: Record<string, any> = {};
    languageModels[config.model] = provider(config.model);

    return customProvider({
      languageModels,
    });
  }

  /**
   * Create Ollama provider from configuration
   */
  private createOllamaProvider(config: WarpioRuntimeConfig): any {
    if (!config.baseURL) {
      throw new WarpioConfigurationError(
        'Ollama provider requires baseURL configuration'
      );
    }

    const provider = createOpenAICompatible({
      name: 'ollama',
      baseURL: config.baseURL.includes('/v1') ? config.baseURL : `${config.baseURL}/v1`,
      apiKey: config.apiKey || 'ollama',
    });

    const languageModels: Record<string, any> = {};
    languageModels[config.model] = provider(config.model);

    return customProvider({
      languageModels,
    });
  }

  /**
   * Create OpenAI provider from configuration
   */
  private createOpenAIProvider(config: WarpioRuntimeConfig): any {
    if (!config.apiKey) {
      throw new WarpioConfigurationError(
        'OpenAI provider requires API key configuration'
      );
    }

    // Use direct OpenAI SDK integration when available
    // For now, use OpenAI-compatible approach
    const provider = createOpenAICompatible({
      name: 'openai',
      baseURL: config.baseURL || 'https://api.openai.com/v1',
      apiKey: config.apiKey,
    });

    const languageModels: Record<string, any> = {};
    languageModels[config.model] = provider(config.model);

    return customProvider({
      languageModels,
    });
  }

  /**
   * Build model ID for registry
   */
  private buildModelId(config: WarpioRuntimeConfig): string {
    return `${config.provider}:${config.model}`;
  }

  /**
   * Validate provider configuration
   */
  private validateProviderConfig(config: WarpioRuntimeConfig): void {
    if (!config.provider) {
      throw new WarpioConfigurationError('Provider is required');
    }

    if (!config.model) {
      throw new WarpioConfigurationError('Model is required');
    }

    // Provider-specific validation
    switch (config.provider) {
      case 'lmstudio':
      case 'ollama':
        if (!config.baseURL) {
          throw new WarpioConfigurationError(
            `${config.provider} provider requires baseURL configuration`
          );
        }
        break;

      case 'gemini':
      case 'openai':
        if (!config.apiKey) {
          throw new WarpioConfigurationError(
            `${config.provider} provider requires API key`
          );
        }
        break;
    }
  }

  /**
   * Get list of supported providers
   */
  private getSupportedProviders(): string[] {
    return ['gemini', 'lmstudio', 'ollama', 'openai'];
  }
}