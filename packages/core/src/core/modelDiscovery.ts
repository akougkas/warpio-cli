/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { OllamaAdapter } from '../adapters/ollama.js';
import { LMStudioAdapter } from '../adapters/lmstudio.js';
import {
  healthMonitor,
  ProviderHealthStatus,
} from '../services/providerHealth.js';
import { fallbackService } from '../services/modelFallback.js';
import { 
  LocalProvider, 
  ProviderDetector, 
  ProviderHealthChecker,
  createLocalProvider 
} from './providers/index.js';

export interface ModelInfo {
  id: string;
  displayName: string;
  provider: string;
  aliases?: string[];
  description?: string;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastChecked?: number;
}

export interface ProviderAdapter {
  listModels(apiKey?: string, proxy?: string): Promise<ModelInfo[]>;
  validateCredentials(apiKey?: string, proxy?: string): Promise<boolean>;
  isServerRunning?(): Promise<boolean>;
}

class GeminiAdapter implements ProviderAdapter {
  async listModels(apiKey: string, proxy?: string): Promise<ModelInfo[]> {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';

    if (proxy) {
      setGlobalDispatcher(new ProxyAgent(proxy));
    }

    try {
      const response = await fetch(endpoint, {
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models: ModelInfo[] = [];

      if (data.models && Array.isArray(data.models)) {
        for (const model of data.models) {
          // Only include generateContent-capable models
          if (model.supportedGenerationMethods?.includes('generateContent')) {
            const aliases = this.getAliasesForModel(model.name);
            models.push({
              id: model.name,
              displayName: model.displayName || model.name,
              provider: 'gemini',
              aliases,
              description: model.description,
            });
          }
        }
      }

      // Sort by model name for consistent output
      return models.sort((a, b) => a.id.localeCompare(b.id));
    } catch (error) {
      throw new Error(
        `Failed to fetch Gemini models: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async validateCredentials(apiKey: string, proxy?: string): Promise<boolean> {
    try {
      await this.listModels(apiKey, proxy);
      return true;
    } catch {
      return false;
    }
  }

  private getAliasesForModel(modelId: string): string[] {
    const aliases: string[] = [];

    // Map common aliases to full model IDs - only for the 3 specified models
    if (modelId.includes('gemini-2.5-pro')) {
      aliases.push('pro');
    } else if (
      modelId.includes('gemini-2.5-flash') &&
      !modelId.includes('lite')
    ) {
      aliases.push('flash');
    } else if (modelId.includes('gemini-2.5-flash-lite')) {
      aliases.push('flash-lite');
    }

    return aliases;
  }
}

export interface DiscoveryOptions {
  apiKey?: string;
  proxy?: string;
  includeHealthStatus?: boolean;
  healthCheckTimeout?: number;
  onlyHealthyProviders?: boolean;
}

export class ModelDiscoveryService {
  private adapters = new Map<string, ProviderAdapter>();
  private providerCache = new Map<string, LocalProvider>();

  constructor() {
    this.adapters.set('gemini', new GeminiAdapter());
    this.adapters.set('ollama', new OllamaAdapter());
    this.adapters.set('lmstudio', new LMStudioAdapter());
  }

  /**
   * Get the optimal provider for a given model using the unified provider system
   */
  async getOptimalProvider(modelName: string): Promise<LocalProvider | null> {
    const cacheKey = modelName;
    if (this.providerCache.has(cacheKey)) {
      const cachedProvider = this.providerCache.get(cacheKey)!;
      // Verify cached provider is still healthy
      const isHealthy = await ProviderHealthChecker.checkProvider(cachedProvider);
      if (isHealthy) {
        return cachedProvider;
      } else {
        this.providerCache.delete(cacheKey);
      }
    }

    // Find available provider using our new system
    const provider = await ProviderHealthChecker.findAvailableProvider(modelName);
    if (provider) {
      this.providerCache.set(cacheKey, provider);
    }
    
    return provider;
  }

  /**
   * Check if a model is a local model that should use UnifiedLocalClient
   */
  isLocalModel(modelName: string): boolean {
    return ProviderDetector.isLocalModel(modelName);
  }

  /**
   * Detect provider from model name
   */
  detectProvider(modelName: string): string {
    return ProviderDetector.detectProvider(modelName);
  }

  /**
   * Extract clean model name from provider-prefixed string
   */
  extractModelName(modelName: string): string {
    return ProviderDetector.extractModelName(modelName);
  }

  async listAvailableModels(
    provider: string,
    apiKey?: string,
    proxy?: string,
  ): Promise<ModelInfo[]> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return adapter.listModels(apiKey, proxy);
  }

  async listAllProvidersModels(
    options: DiscoveryOptions = {},
  ): Promise<Record<string, ModelInfo[]>> {
    const results: Record<string, ModelInfo[]> = {};

    // Get provider health status if requested
    let providerHealth: Record<string, ProviderHealthStatus> = {};
    if (options.includeHealthStatus || options.onlyHealthyProviders) {
      const healthStatuses = await healthMonitor.checkAllProviders({
        timeout: options.healthCheckTimeout,
      });
      providerHealth = Object.fromEntries(
        healthStatuses.map((status) => [status.provider, status]),
      );
    }

    // Gemini models (requires API key)
    if (
      options.apiKey &&
      (!options.onlyHealthyProviders ||
        providerHealth.gemini?.isHealthy !== false)
    ) {
      try {
        const models = await this.listAvailableModels(
          'gemini',
          options.apiKey,
          options.proxy,
        );
        results.gemini = this.enhanceModelsWithHealth(
          models,
          providerHealth.gemini,
        );
      } catch (_error) {
        results.gemini = [];
      }
    }

    // Local models (no API key required)
    if (
      !options.onlyHealthyProviders ||
      providerHealth.ollama?.isHealthy !== false
    ) {
      try {
        const ollamaAdapter = this.adapters.get('ollama') as OllamaAdapter;
        const models = await ollamaAdapter.listModels();
        results.ollama = this.enhanceModelsWithHealth(
          models,
          providerHealth.ollama,
        );
      } catch (_error) {
        results.ollama = [];
      }
    }

    // LM Studio models (no API key required)
    if (
      !options.onlyHealthyProviders ||
      providerHealth.lmstudio?.isHealthy !== false
    ) {
      try {
        const lmStudioAdapter = this.adapters.get('lmstudio') as LMStudioAdapter;
        const models = await lmStudioAdapter.listModels();
        results.lmstudio = this.enhanceModelsWithHealth(
          models,
          providerHealth.lmstudio,
        );
      } catch (_error) {
        results.lmstudio = [];
      }
    }

    // Format models: keep Gemini as-is, add provider prefix for local providers
    const formattedResults: Record<string, ModelInfo[]> = {};
    for (const [provider, models] of Object.entries(results)) {
      if (provider === 'gemini') {
        // Keep Gemini models in original format
        formattedResults[provider] = models;
      } else {
        // Add provider prefix for local providers (ollama, lmstudio)
        formattedResults[provider] = models.map(model => ({
          ...model,
          id: `${provider}::${model.id}`,
          provider,
        }));
      }
    }

    return formattedResults;
  }

  getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get best available model with health-based selection
   */
  async getBestAvailableModel(
    requestedModel: string,
    options: DiscoveryOptions = {},
  ): Promise<{
    model: ModelInfo | null;
    fallbackUsed: boolean;
    reason?: string;
  }> {
    const allModels = await this.listAllProvidersModels(options);
    const fallbackResult = await fallbackService.findBestAvailableModel(
      requestedModel,
      allModels,
      {
        preferLocal: true,
        timeout: options.healthCheckTimeout,
      },
    );

    // Find the actual model info
    const providerModels = allModels[fallbackResult.selectedProvider] || [];
    const selectedModel = providerModels.find(
      (m) =>
        m.id === fallbackResult.selectedModel ||
        m.aliases?.includes(fallbackResult.selectedModel),
    );

    return {
      model: selectedModel || null,
      fallbackUsed: !fallbackResult.isOriginalAvailable,
      reason: fallbackResult.fallbackReason,
    };
  }

  /**
   * Get provider health summary
   */
  async getProviderHealthSummary(): Promise<
    Array<{
      provider: string;
      isHealthy: boolean;
      modelCount: number;
      responseTime?: number;
      lastChecked: number;
      error?: string;
    }>
  > {
    const healthStatuses = await healthMonitor.checkAllProviders();
    const allModels = await this.listAllProvidersModels({
      includeHealthStatus: true,
    });

    return healthStatuses.map((status) => ({
      provider: status.provider,
      isHealthy: status.isHealthy,
      modelCount: allModels[status.provider]?.length || 0,
      responseTime: status.responseTime,
      lastChecked: status.lastChecked,
      error: status.error,
    }));
  }

  /**
   * Get healthy providers only
   */
  async getHealthyProviders(options: DiscoveryOptions = {}): Promise<string[]> {
    return healthMonitor.getHealthyProviders({
      timeout: options.healthCheckTimeout,
    });
  }

  /**
   * Refresh provider health cache
   */
  async refreshProviderHealth(): Promise<void> {
    healthMonitor.clearCache();
  }

  private enhanceModelsWithHealth(
    models: ModelInfo[],
    healthStatus?: ProviderHealthStatus,
  ): ModelInfo[] {
    if (!healthStatus) {
      return models;
    }

    return models.map((model) => ({
      ...model,
      healthStatus: healthStatus.isHealthy ? 'healthy' : 'unhealthy',
      responseTime: healthStatus.responseTime,
      lastChecked: healthStatus.lastChecked,
    }));
  }
}
