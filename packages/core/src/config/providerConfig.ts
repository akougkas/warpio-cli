/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupportedProvider, ProviderConfig } from './models.js';

export interface ExtendedProviderConfig extends ProviderConfig {
  displayName: string;
  description: string;
  healthCheckEndpoint?: string;
  modelsEndpoint?: string;
  defaultTimeout: number;
  maxRetries: number;
  retryDelay: number;
  features: {
    streaming: boolean;
    functionCalling: boolean;
    embedding: boolean;
    codeExecution: boolean;
    thinking: boolean;
  };
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  costMetrics?: {
    inputTokenCost: number; // per 1000 tokens
    outputTokenCost: number; // per 1000 tokens
    currency: string;
  };
}

export class ProviderConfigurationManager {
  private static readonly PROVIDER_CONFIGS: Record<
    SupportedProvider,
    ExtendedProviderConfig
  > = {
    gemini: {
      baseUrl: 'https://generativelanguage.googleapis.com',
      requiresAuth: true,
      isLocal: false,
      displayName: 'Google Gemini',
      description: "Google's Gemini AI models with advanced capabilities",
      healthCheckEndpoint: '/v1beta/models',
      modelsEndpoint: '/v1beta/models',
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      features: {
        streaming: true,
        functionCalling: true,
        embedding: true,
        codeExecution: false,
        thinking: false,
      },
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 32000,
      },
      costMetrics: {
        inputTokenCost: 0.00025, // $0.25 per 1M tokens
        outputTokenCost: 0.00075, // $0.75 per 1M tokens
        currency: 'USD',
      },
    },
    ollama: {
      baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
      apiKey: 'ollama',
      requiresAuth: false,
      isLocal: true,
      displayName: 'Ollama',
      description: 'Local Ollama server with open-source models',
      healthCheckEndpoint: '/api/tags',
      modelsEndpoint: '/api/tags',
      defaultTimeout: 60000, // Local models can be slower
      maxRetries: 2,
      retryDelay: 2000,
      features: {
        streaming: true,
        functionCalling: false,
        embedding: false,
        codeExecution: false,
        thinking: true, // Supported via Warpio reasoning system
      },
      costMetrics: {
        inputTokenCost: 0, // Free local models
        outputTokenCost: 0,
        currency: 'USD',
      },
    },
  };

  private customConfigs = new Map<string, Partial<ExtendedProviderConfig>>();

  /**
   * Get provider configuration with custom overrides
   */
  getProviderConfig(provider: SupportedProvider): ExtendedProviderConfig {
    const baseConfig = ProviderConfigurationManager.PROVIDER_CONFIGS[provider];
    const customConfig = this.customConfigs.get(provider);

    return {
      ...baseConfig,
      ...customConfig,
    };
  }

  /**
   * Set custom configuration for a provider
   */
  setProviderConfig(
    provider: SupportedProvider,
    config: Partial<ExtendedProviderConfig>,
  ): void {
    this.customConfigs.set(provider, {
      ...this.customConfigs.get(provider),
      ...config,
    });
  }

  /**
   * Reset provider configuration to defaults
   */
  resetProviderConfig(provider: SupportedProvider): void {
    this.customConfigs.delete(provider);
  }

  /**
   * Get all provider configurations
   */
  getAllProviderConfigs(): Record<SupportedProvider, ExtendedProviderConfig> {
    const configs = {} as Record<SupportedProvider, ExtendedProviderConfig>;

    for (const provider of Object.keys(
      ProviderConfigurationManager.PROVIDER_CONFIGS,
    ) as SupportedProvider[]) {
      configs[provider] = this.getProviderConfig(provider);
    }

    return configs;
  }

  /**
   * Update provider configuration from environment variables
   */
  loadFromEnvironment(): void {
    // Ollama configuration
    const ollamaHost = process.env.OLLAMA_HOST;
    if (ollamaHost) {
      this.setProviderConfig('ollama', { baseUrl: ollamaHost });
    }

    // Timeout configurations
    const defaultTimeout = process.env.WARPIO_DEFAULT_TIMEOUT;
    if (defaultTimeout) {
      const timeoutMs = parseInt(defaultTimeout, 10);
      if (!isNaN(timeoutMs)) {
        for (const provider of Object.keys(
          ProviderConfigurationManager.PROVIDER_CONFIGS,
        ) as SupportedProvider[]) {
          this.setProviderConfig(provider, { defaultTimeout: timeoutMs });
        }
      }
    }

    // Provider-specific timeouts
    const ollamaTimeout = process.env.OLLAMA_TIMEOUT;
    if (ollamaTimeout) {
      const timeoutMs = parseInt(ollamaTimeout, 10);
      if (!isNaN(timeoutMs)) {
        this.setProviderConfig('ollama', { defaultTimeout: timeoutMs });
      }
    }

    const geminiTimeout = process.env.GEMINI_TIMEOUT;
    if (geminiTimeout) {
      const timeoutMs = parseInt(geminiTimeout, 10);
      if (!isNaN(timeoutMs)) {
        this.setProviderConfig('gemini', { defaultTimeout: timeoutMs });
      }
    }

    // Retry configurations
    const maxRetries = process.env.WARPIO_MAX_RETRIES;
    if (maxRetries) {
      const retries = parseInt(maxRetries, 10);
      if (!isNaN(retries)) {
        for (const provider of Object.keys(
          ProviderConfigurationManager.PROVIDER_CONFIGS,
        ) as SupportedProvider[]) {
          this.setProviderConfig(provider, { maxRetries: retries });
        }
      }
    }
  }

  /**
   * Validate provider configuration
   */
  validateProviderConfig(provider: SupportedProvider): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const config = this.getProviderConfig(provider);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (config.requiresAuth && !config.apiKey && provider === 'gemini') {
      errors.push('API key is required for Gemini provider');
    }

    if (!config.baseUrl) {
      errors.push(`Base URL is required for ${provider} provider`);
    }

    // Check URL format
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push(`Invalid base URL format: ${config.baseUrl}`);
      }
    }

    // Check timeout values
    if (config.defaultTimeout < 1000) {
      warnings.push(
        `Very low timeout (${config.defaultTimeout}ms) may cause failures`,
      );
    }

    if (config.defaultTimeout > 300000) {
      // 5 minutes
      warnings.push(
        `Very high timeout (${config.defaultTimeout}ms) may cause poor UX`,
      );
    }

    // Check retry values
    if (config.maxRetries > 5) {
      warnings.push(`High retry count (${config.maxRetries}) may cause delays`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get optimal configuration for specific use cases
   */
  getOptimizedConfig(
    provider: SupportedProvider,
    useCase: 'interactive' | 'batch' | 'streaming' | 'development',
  ): ExtendedProviderConfig {
    const baseConfig = this.getProviderConfig(provider);

    switch (useCase) {
      case 'interactive':
        return {
          ...baseConfig,
          defaultTimeout: Math.min(baseConfig.defaultTimeout, 15000),
          maxRetries: 2,
        };

      case 'batch':
        return {
          ...baseConfig,
          defaultTimeout: Math.max(baseConfig.defaultTimeout, 60000),
          maxRetries: 5,
          retryDelay: baseConfig.retryDelay * 2,
        };

      case 'streaming':
        return {
          ...baseConfig,
          defaultTimeout: 5000, // Quick connection timeout for streaming
          maxRetries: 1,
        };

      case 'development':
        return {
          ...baseConfig,
          defaultTimeout: 120000, // Extra time for debugging
          maxRetries: 1, // Fail fast during development
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Export configuration for backup/sharing
   */
  exportConfiguration(): Record<
    SupportedProvider,
    Partial<ExtendedProviderConfig>
  > {
    const exported = {} as Record<
      SupportedProvider,
      Partial<ExtendedProviderConfig>
    >;

    for (const [provider, config] of this.customConfigs.entries()) {
      exported[provider as SupportedProvider] = { ...config };
    }

    return exported;
  }

  /**
   * Import configuration from backup/sharing
   */
  importConfiguration(
    configs: Record<SupportedProvider, Partial<ExtendedProviderConfig>>,
  ): void {
    for (const [provider, config] of Object.entries(configs)) {
      if (provider in ProviderConfigurationManager.PROVIDER_CONFIGS) {
        this.setProviderConfig(provider as SupportedProvider, config);
      }
    }
  }

  /**
   * Get configuration summary for display
   */
  getConfigurationSummary(): Array<{
    provider: SupportedProvider;
    status: 'configured' | 'default' | 'incomplete';
    displayName: string;
    isLocal: boolean;
    requiresAuth: boolean;
    features: string[];
    issues: string[];
  }> {
    const summary: Array<{
      provider: SupportedProvider;
      status: 'configured' | 'default' | 'incomplete';
      displayName: string;
      isLocal: boolean;
      requiresAuth: boolean;
      features: string[];
      issues: string[];
    }> = [];

    for (const provider of Object.keys(
      ProviderConfigurationManager.PROVIDER_CONFIGS,
    ) as SupportedProvider[]) {
      const config = this.getProviderConfig(provider);
      const validation = this.validateProviderConfig(provider);
      const hasCustomConfig = this.customConfigs.has(provider);

      const features = Object.entries(config.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature);

      summary.push({
        provider,
        status:
          validation.errors.length > 0
            ? 'incomplete'
            : hasCustomConfig
              ? 'configured'
              : 'default',
        displayName: config.displayName,
        isLocal: config.isLocal,
        requiresAuth: config.requiresAuth,
        features,
        issues: [...validation.errors, ...validation.warnings],
      });
    }

    return summary;
  }
}

// Singleton instance
export const providerConfigManager = new ProviderConfigurationManager();
