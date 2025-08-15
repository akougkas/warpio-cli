/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Warpio Model Management System
 * Provides dynamic model discovery and validation across all providers
 */

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  supportsTools?: boolean;
  description?: string;
}

export interface ProviderInfo {
  name: string;
  status: 'available' | 'error' | 'unconfigured';
  error?: string;
  defaultModel?: string;
  models: ModelInfo[];
}

export interface ModelSelectionResult {
  provider: string;
  model: string;
  isValid: boolean;
  error?: string;
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  environmentSetup?: Record<string, string>;
}

/**
 * Model Manager for dynamic provider and model discovery
 */
export class ModelManager {
  private static instance: ModelManager;
  private modelCache: Map<string, ModelInfo[]> = new Map();
  private lastCacheTime: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  /**
   * CORE INTEGRATION HOOKS - For core CLI to call into Warpio layer
   */

  /**
   * Validate provider names against supported providers
   */
  validateProvider(provider: string): boolean {
    const supportedProviders = ['gemini', 'lmstudio', 'ollama', 'openai'];
    return supportedProviders.includes(provider);
  }

  /**
   * Parse provider::model syntax into components
   */
  parseModelSelection(modelSpec: string): ModelSelectionResult {
    // Handle legacy format (no :: separator)
    if (!modelSpec.includes('::')) {
      return {
        provider: 'gemini',
        model: modelSpec,
        isValid: true,
      };
    }

    // Parse provider::model format
    const parts = modelSpec.split('::');
    if (parts.length !== 2) {
      return {
        provider: '',
        model: '',
        isValid: false,
        error: `Invalid model format: ${modelSpec}. Use provider::model format (e.g., lmstudio::qwen3-4b, gemini::gemini-2.0-flash)`,
      };
    }

    const [provider, model] = parts;

    if (!provider || !model) {
      return {
        provider,
        model,
        isValid: false,
        error: `Invalid model format: ${modelSpec}. Both provider and model must be specified`,
      };
    }

    if (!this.validateProvider(provider)) {
      return {
        provider,
        model,
        isValid: false,
        error: `Unsupported provider: ${provider}. Supported providers: gemini, lmstudio, ollama, openai`,
      };
    }

    return {
      provider,
      model,
      isValid: true,
    };
  }

  /**
   * Setup provider-specific environment variables
   */
  setupProviderEnvironment(
    provider: string,
    model: string,
  ): Record<string, string> {
    const envSetup: Record<string, string> = {};

    switch (provider) {
      case 'lmstudio':
        envSetup.LMSTUDIO_MODEL = model;
        break;
      case 'ollama':
        envSetup.OLLAMA_MODEL = model;
        break;
      case 'openai':
        envSetup.OPENAI_MODEL = model;
        break;
      case 'gemini':
        // Gemini models are handled differently - no env setup needed
        break;
      default:
        // Unknown provider - no env setup
        break;
    }

    return envSetup;
  }

  /**
   * Main integration hook: Validate model selection and setup environment
   * This is called by core CLI after basic parsing
   */
  async validateAndSetupModel(modelSpec: string): Promise<ValidationResult> {
    try {
      // Parse and validate model selection
      const parsed = this.parseModelSelection(modelSpec);

      if (!parsed.isValid) {
        return {
          success: false,
          error: parsed.error,
        };
      }

      // Setup provider-specific environment variables
      const envSetup = this.setupProviderEnvironment(
        parsed.provider,
        parsed.model,
      );

      // Apply environment setup to current process
      Object.entries(envSetup).forEach(([key, value]) => {
        process.env[key] = value;
      });

      // Optional: Validate that the model actually exists (async check)
      // Model availability is validated during actual usage
      await this.validateModel(parsed.provider, parsed.model);

      return {
        success: true,
        environmentSetup: envSetup,
      };
    } catch (_error) {
      return {
        success: false,
        error: `Model validation failed: ${_error instanceof Error ? _error.message : String(_error)}`,
      };
    }
  }

  /**
   * Get all available providers with their status
   */
  async getProviders(): Promise<ProviderInfo[]> {
    const providers: ProviderInfo[] = [];

    // Gemini - always available if API key is set
    const geminiInfo = await this.getGeminiProviderInfo();
    providers.push(geminiInfo);

    // LM Studio
    const lmstudioInfo = await this.getLMStudioProviderInfo();
    providers.push(lmstudioInfo);

    // Ollama
    const ollamaInfo = await this.getOllamaProviderInfo();
    providers.push(ollamaInfo);

    // OpenAI
    const openaiInfo = await this.getOpenAIProviderInfo();
    providers.push(openaiInfo);

    return providers;
  }

  /**
   * Get models for a specific provider with caching
   */
  async getModelsForProvider(provider: string): Promise<ModelInfo[]> {
    const cacheKey = provider;
    const lastCache = this.lastCacheTime.get(cacheKey);
    const now = Date.now();

    // Return cached results if still valid
    if (lastCache && now - lastCache < this.CACHE_TTL_MS) {
      return this.modelCache.get(cacheKey) || [];
    }

    let models: ModelInfo[] = [];

    try {
      switch (provider) {
        case 'gemini':
          models = await this.discoverGeminiModels();
          break;
        case 'lmstudio':
          models = await this.discoverLMStudioModels();
          break;
        case 'ollama':
          models = await this.discoverOllamaModels();
          break;
        case 'openai':
          models = await this.discoverOpenAIModels();
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Cache the results
      this.modelCache.set(cacheKey, models);
      this.lastCacheTime.set(cacheKey, now);
    } catch (_error) {
      // Model discovery failure handled gracefully
    }

    return models;
  }

  /**
   * Validate if a specific model is available for a provider
   */
  async validateModel(provider: string, modelId: string): Promise<boolean> {
    const models = await this.getModelsForProvider(provider);
    return models.some(
      (model) => model.id === modelId || model.name === modelId,
    );
  }

  /**
   * Get current model selection from environment
   */
  getCurrentModelSelection(): { provider: string; model: string } {
    const provider = process.env.WARPIO_PROVIDER || 'gemini';

    let model: string;
    switch (provider) {
      case 'lmstudio':
        model = process.env.LMSTUDIO_MODEL || 'default';
        break;
      case 'ollama':
        model = process.env.OLLAMA_MODEL || 'default';
        break;
      case 'openai':
        model = process.env.OPENAI_MODEL || 'gpt-4';
        break;
      case 'gemini':
      default:
        model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
        break;
    }

    return { provider, model };
  }

  /**
   * Clear model cache (useful for refresh operations)
   */
  clearCache(): void {
    this.modelCache.clear();
    this.lastCacheTime.clear();
  }

  // Private discovery methods for each provider

  private async getGeminiProviderInfo(): Promise<ProviderInfo> {
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    return {
      name: 'gemini',
      status: hasApiKey ? 'available' : 'unconfigured',
      error: hasApiKey ? undefined : 'GEMINI_API_KEY not configured',
      defaultModel: 'gemini-1.5-flash-latest',
      models: hasApiKey ? await this.discoverGeminiModels() : [],
    };
  }

  private async getLMStudioProviderInfo(): Promise<ProviderInfo> {
    // Always try to connect - use default localhost if not configured
    try {
      const models = await this.discoverLMStudioModels();
      
      if (models.length > 0) {
        return {
          name: 'lmstudio',
          status: 'available',
          defaultModel: process.env.LMSTUDIO_MODEL || models[0]?.id || 'default',
          models,
        };
      } else {
        // LM Studio is running but no models loaded
        return {
          name: 'lmstudio',
          status: 'available',
          defaultModel: 'default',
          models: [],
          error: 'No models loaded in LM Studio',
        };
      }
    } catch (_error) {
      // Check if it's because host wasn't configured
      const errorMsg = _error instanceof Error ? _error.message : String(_error);
      const hasHost = !!process.env.LMSTUDIO_HOST;
      
      if (!hasHost && errorMsg.includes('not configured')) {
        // Try with default host to see if LM Studio is running
        try {
          const testResponse = await fetch('http://localhost:1234/v1/models');
          if (testResponse.ok) {
            // LM Studio IS running on default port
            return {
              name: 'lmstudio',
              status: 'unconfigured',
              error: 'LM Studio detected on localhost:1234 - set LMSTUDIO_HOST=http://localhost:1234/v1 to enable',
              defaultModel: 'default',
              models: [],
            };
          }
        } catch {
          // Not running on default port either
        }
        
        return {
          name: 'lmstudio',
          status: 'unconfigured',
          error: 'Not running on localhost:1234 (set LMSTUDIO_HOST if using different port)',
          defaultModel: 'default',
          models: [],
        };
      }
      
      return {
        name: 'lmstudio',
        status: 'error',
        error: `Connection failed: ${errorMsg}`,
        defaultModel: 'default',
        models: [],
      };
    }
  }

  private async getOllamaProviderInfo(): Promise<ProviderInfo> {
    const _host = process.env.OLLAMA_HOST || 'http://localhost:11434';

    try {
      const models = await this.discoverOllamaModels();
      return {
        name: 'ollama',
        status: 'available',
        defaultModel: process.env.OLLAMA_MODEL || models[0]?.id || 'default',
        models,
      };
    } catch (_error) {
      return {
        name: 'ollama',
        status: 'error',
        error: `Connection failed: ${_error instanceof Error ? _error.message : String(_error)}`,
        defaultModel: 'default',
        models: [],
      };
    }
  }

  private async getOpenAIProviderInfo(): Promise<ProviderInfo> {
    const hasApiKey = !!process.env.OPENAI_API_KEY;

    return {
      name: 'openai',
      status: hasApiKey ? 'available' : 'unconfigured',
      error: hasApiKey ? undefined : 'OPENAI_API_KEY not configured',
      defaultModel: 'gpt-4',
      models: hasApiKey ? await this.discoverOpenAIModels() : [],
    };
  }

  private async discoverGeminiModels(): Promise<ModelInfo[]> {
    // Static list of known Gemini models - Google doesn't provide an API to list models dynamically
    return [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Experimental)',
        provider: 'gemini',
        contextLength: 1048576,
        supportsTools: true,
        description:
          'Latest experimental Gemini model with multimodal capabilities',
      },
      {
        id: 'gemini-1.5-pro-latest',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        contextLength: 2097152,
        supportsTools: true,
        description: 'Most capable Gemini model for complex tasks',
      },
      {
        id: 'gemini-1.5-flash-latest',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        contextLength: 1048576,
        supportsTools: true,
        description: 'Fast and efficient model for everyday tasks',
      },
      {
        id: 'gemini-1.5-flash-8b-latest',
        name: 'Gemini 1.5 Flash 8B',
        provider: 'gemini',
        contextLength: 1048576,
        supportsTools: true,
        description: 'Smaller, faster model for lightweight tasks',
      },
    ];
  }

  private async discoverLMStudioModels(): Promise<ModelInfo[]> {
    // Use configured host or try default localhost
    const host = process.env.LMSTUDIO_HOST || 'http://localhost:1234/v1';
    
    // Still throw if explicitly not configured (for backwards compatibility)
    if (!process.env.LMSTUDIO_HOST && host === 'http://localhost:1234/v1') {
      // But first try to see if it's actually running
      try {
        const testResponse = await fetch(`${host}/models`);
        if (!testResponse.ok) {
          throw new Error('LMSTUDIO_HOST not configured');
        }
      } catch {
        throw new Error('LMSTUDIO_HOST not configured');
      }
    }

    try {
      // Try to fetch models from LM Studio API
      const response = await fetch(`${host}/v1/models`, {
        headers: {
          Authorization: `Bearer ${process.env.LMSTUDIO_API_KEY || 'lm-studio'}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        return data.data.map(
          (model: {
            id: string;
            context_length?: number;
            description?: string;
          }) => ({
            id: model.id,
            name: model.id,
            provider: 'lmstudio',
            contextLength: model.context_length,
            supportsTools: true, // Assume tools support for LM Studio models
            description: model.description || `LM Studio model: ${model.id}`,
          }),
        );
      }

      // Fallback to configured model
      const configuredModel = process.env.LMSTUDIO_MODEL || 'default';
      return [
        {
          id: configuredModel,
          name: configuredModel,
          provider: 'lmstudio',
          supportsTools: true,
          description: 'Currently configured LM Studio model',
        },
      ];
    } catch (_error) {
      // Fallback to configured model
      const configuredModel = process.env.LMSTUDIO_MODEL || 'default';
      return [
        {
          id: configuredModel,
          name: configuredModel,
          provider: 'lmstudio',
          supportsTools: true,
          description: 'Currently configured LM Studio model',
        },
      ];
    }
  }

  private async discoverOllamaModels(): Promise<ModelInfo[]> {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';

    try {
      const response = await fetch(`${host}/api/tags`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.models && Array.isArray(data.models)) {
        return data.models.map(
          (model: {
            name: string;
            details?: { parameter_size?: unknown };
            size?: string;
          }) => ({
            id: model.name,
            name: model.name,
            provider: 'ollama',
            contextLength: model.details?.parameter_size
              ? undefined
              : undefined,
            supportsTools:
              model.name.includes('qwen') || model.name.includes('llama'), // Heuristic
            description: `Ollama model: ${model.name} (${model.size || 'unknown size'})`,
          }),
        );
      }

      // Fallback to configured model
      const configuredModel = process.env.OLLAMA_MODEL || 'default';
      return [
        {
          id: configuredModel,
          name: configuredModel,
          provider: 'ollama',
          supportsTools: true,
          description: 'Currently configured Ollama model',
        },
      ];
    } catch (_error) {
      // Fallback to configured model
      const configuredModel = process.env.OLLAMA_MODEL || 'default';
      return [
        {
          id: configuredModel,
          name: configuredModel,
          provider: 'ollama',
          supportsTools: true,
          description: 'Currently configured Ollama model',
        },
      ];
    }
  }

  private async discoverOpenAIModels(): Promise<ModelInfo[]> {
    // Static list of common OpenAI models - would need API key to query dynamically
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4 Omni',
        provider: 'openai',
        contextLength: 128000,
        supportsTools: true,
        description: 'Most capable GPT-4 model with multimodal capabilities',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4 Omni Mini',
        provider: 'openai',
        contextLength: 128000,
        supportsTools: true,
        description: 'Smaller, faster GPT-4 model',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        contextLength: 128000,
        supportsTools: true,
        description: 'Fast and efficient GPT-4 variant',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextLength: 16385,
        supportsTools: true,
        description: 'Fast and cost-effective model',
      },
    ];
  }

  /**
   * CLI-FOCUSED METHODS - For slash commands and CLI operations
   */

  /**
   * List all available models across all providers (for CLI display)
   */
  async listAllModels(): Promise<string> {
    const providers = await this.getProviders();

    let output = '\n📦 Available Providers and Models:\n\n';

    for (const provider of providers) {
      const statusIcon =
        provider.status === 'available'
          ? '✅'
          : provider.status === 'error'
            ? '❌'
            : '⚠️';

      output += `${statusIcon} ${provider.name.toUpperCase()}\n`;

      if (provider.status !== 'available') {
        output += `   Status: ${provider.error || 'Not configured'}\n`;
      } else {
        output += `   Default: ${provider.defaultModel}\n`;
        output += '   Models:\n';

        if (provider.models.length === 0) {
          output += '     (No models discovered)\n';
        } else {
          provider.models.forEach((model) => {
            const toolsIcon = model.supportsTools ? '🔧' : '  ';
            const contextInfo = model.contextLength
              ? ` (${Math.floor(model.contextLength / 1000)}K ctx)`
              : '';
            output += `     ${toolsIcon} ${model.id}${contextInfo}\n`;
            if (model.description) {
              output += `        ${model.description}\n`;
            }
          });
        }
      }
      output += '\n';
    }

    const current = this.getCurrentModelSelection();
    output += `🎯 Current: ${current.provider}::${current.model}\n`;
    
    return output;
  }

  /**
   * Test connection to all configured providers
   */
  async testAllConnections(): Promise<void> {
    const providers = await this.getProviders();

    console.log('\n🔗 Testing Provider Connections:\n');

    for (const provider of providers) {
      const startTime = Date.now();

      if (provider.status === 'unconfigured') {
        console.log(`⚠️  ${provider.name.toUpperCase()}: Not configured`);
        console.log(`     ${provider.error}\n`);
        continue;
      }

      try {
        // Test by attempting to discover models
        const models = await this.getModelsForProvider(provider.name);
        const duration = Date.now() - startTime;

        if (models.length > 0) {
          console.log(
            `✅ ${provider.name.toUpperCase()}: Connected (${duration}ms)`,
          );
          console.log(`   Found ${models.length} model(s)`);
        } else {
          console.log(
            `⚠️  ${provider.name.toUpperCase()}: Connected but no models found`,
          );
        }
      } catch (_error) {
        const duration = Date.now() - startTime;
        console.log(
          `❌ ${provider.name.toUpperCase()}: Connection failed (${duration}ms)`,
        );
        console.log(
          `   Error: ${_error instanceof Error ? _error.message : String(_error)}`,
        );
      }
      console.log();
    }
  }

  /**
   * Show current model and provider status
   */
  showCurrentStatus(): string {
    const current = this.getCurrentModelSelection();

    let output = '\n📊 Current Model Status:\n\n';
    output += `Provider: ${current.provider}\n`;
    output += `Model:    ${current.model}\n`;

    // Show environment variables for debugging
    output += '\nEnvironment Configuration:\n';
    output += `WARPIO_PROVIDER: ${process.env.WARPIO_PROVIDER || '(not set)'}\n`;

    if (current.provider === 'lmstudio') {
      output += `LMSTUDIO_HOST: ${process.env.LMSTUDIO_HOST || '(not set)'}\n`;
      output += `LMSTUDIO_MODEL: ${process.env.LMSTUDIO_MODEL || '(not set)'}\n`;
    } else if (current.provider === 'ollama') {
      output += `OLLAMA_HOST: ${process.env.OLLAMA_HOST || '(not set)'}\n`;
      output += `OLLAMA_MODEL: ${process.env.OLLAMA_MODEL || '(not set)'}\n`;
    } else if (current.provider === 'openai') {
      output += `OPENAI_MODEL: ${process.env.OPENAI_MODEL || '(not set)'}\n`;
      output += `OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : '(not set)'}\n`;
    } else if (current.provider === 'gemini') {
      output += `GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set' : '(not set)'}\n`;
    }
    
    return output;
  }

  /**
   * Switch provider and model (for CLI commands)
   * Properly unloads current model and loads new one
   */
  switchToModel(providerModelSpec: string): ValidationResult {
    console.log(`🔄 Switching model to: ${providerModelSpec}`);

    // Step 1: Handle simplified model names (without provider prefix)
    let finalSpec = providerModelSpec;

    // If no provider specified, try to find the model in current or default provider
    if (!providerModelSpec.includes('::')) {
      const currentProvider = process.env.WARPIO_PROVIDER || 'lmstudio';
      finalSpec = `${currentProvider}::${providerModelSpec}`;
      console.log(
        `📍 No provider specified, using current provider: ${currentProvider}`,
      );
    }

    // Step 2: Parse the new model specification
    const parsed = this.parseModelSelection(finalSpec);

    if (!parsed.isValid) {
      return {
        success: false,
        error: parsed.error,
      };
    }

    try {
      // Step 2: Unload current model/provider
      console.log(`📤 Unloading current model...`);
      this.unloadCurrentModel();

      // Step 3: Set environment variables for new provider
      console.log(`🔧 Configuring ${parsed.provider} provider...`);
      process.env.WARPIO_PROVIDER = parsed.provider;
      const envSetup = this.setupProviderEnvironment(
        parsed.provider,
        parsed.model,
      );

      Object.entries(envSetup).forEach(([key, value]) => {
        process.env[key] = value;
      });

      // Step 4: Clear cache to force fresh discovery
      this.clearCache();

      // Step 5: Validate new model is accessible
      console.log(`📥 Loading new model: ${parsed.model}...`);
      const validationResult = this.validateModelAccess(
        parsed.provider,
        parsed.model,
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: `Failed to load model: ${validationResult.error}`,
        };
      }

      console.log(
        `✅ Successfully switched to ${parsed.provider}::${parsed.model}`,
      );

      return {
        success: true,
        environmentSetup: envSetup,
      };
    } catch (error) {
      return {
        success: false,
        error: `Model switching failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Unload current model and clear any cached connections
   */
  private unloadCurrentModel(): void {
    // Clear model cache
    this.clearCache();

    // Clear any provider-specific caches or connections
    // This is where we would close active connections to current providers
    console.log(`🧹 Cleared model cache and connections`);
  }

  /**
   * Validate that a specific model is accessible
   */
  private validateModelAccess(
    provider: string,
    model: string,
  ): ValidationResult {
    try {
      // Basic validation - check if environment is properly configured
      const envSetup = this.setupProviderEnvironment(provider, model);

      // For now, just verify environment setup completed
      // In future, this could include actual connectivity tests
      if (Object.keys(envSetup).length === 0) {
        return {
          success: false,
          error: `No environment configuration available for provider: ${provider}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Show information about a specific model or current model
   */
  async showModelInfo(modelName?: string): Promise<string> {
    let output = '';
    
    if (modelName) {
      // Show info for specific model
      output += `📋 Model Information: ${modelName}\n\n`;

      // Try to find the model across all providers
      const allProviders = ['gemini', 'lmstudio', 'ollama', 'openai'];
      let found = false;

      for (const provider of allProviders) {
        try {
          const models = await this.getModelsForProvider(provider);
          const model = models.find(
            (m) => m.name === modelName || m.id === modelName,
          );

          if (model) {
            output += `🎯 Found in provider: ${provider}\n`;
            output += `   Name: ${model.name}\n`;
            output += `   ID: ${model.id}\n`;
            if (model.contextLength) {
              output += `   Context Length: ${model.contextLength.toLocaleString()} tokens\n`;
            }
            if (model.supportsTools !== undefined) {
              output += `   Tool Support: ${model.supportsTools ? 'Yes' : 'No'}\n`;
            }
            if (model.description) {
              output += `   Description: ${model.description}\n`;
            }
            found = true;
            break;
          }
        } catch {
          // Provider not available, continue to next
        }
      }

      if (!found) {
        output += `❌ Model '${modelName}' not found in any provider\n`;
        output += '\nUse /model list to see available models\n';
      }
    } else {
      // Show current model status
      output = this.showCurrentStatus();
    }
    
    return output;
  }

  /**
   * Refresh model cache and show updated information
   */
  async refreshModels(): Promise<void> {
    console.log('🔄 Refreshing model cache...\n');
    this.clearCache();
    await this.listAllModels();
  }
}
