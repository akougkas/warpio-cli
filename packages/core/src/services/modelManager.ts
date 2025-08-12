/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { healthMonitor, ProviderHealthStatus } from './providerHealth.js';
import { fallbackService, FallbackResult } from './modelFallback.js';
import { ModelInfo } from '../core/modelDiscovery.js';
import { parseProviderModel, isLocalProvider, SupportedProvider } from '../config/models.js';

export interface ModelState {
  model: ModelInfo;
  provider: string;
  status: 'available' | 'unavailable' | 'unknown' | 'failed';
  lastChecked: number;
  responseTime?: number;
  errorMessage?: string;
  usageCount: number;
  lastUsed?: number;
}

export interface ProviderSummary {
  provider: string;
  isHealthy: boolean;
  modelCount: number;
  availableModels: number;
  failedModels: number;
  avgResponseTime?: number;
  lastHealthCheck?: number;
}

export interface ModelManagerOptions {
  enableCache?: boolean;
  cacheTimeout?: number;
  enableAutoFallback?: boolean;
  enableUsageTracking?: boolean;
}

export class ModelManager {
  private modelStates = new Map<string, ModelState>();
  private providerStates = new Map<string, ProviderHealthStatus>();
  private discoveryCache: { data: Record<string, ModelInfo[]>; timestamp: number } | null = null;
  private readonly options: Required<ModelManagerOptions>;

  constructor(options: ModelManagerOptions = {}) {
    this.options = {
      enableCache: options.enableCache ?? true,
      cacheTimeout: options.cacheTimeout ?? 5 * 60 * 1000, // 5 minutes
      enableAutoFallback: options.enableAutoFallback ?? true,
      enableUsageTracking: options.enableUsageTracking ?? true,
    };
  }

  /**
   * Initialize manager with model discovery
   */
  async initialize(modelDiscovery: { listAllProvidersModels(options: any): Promise<Record<string, ModelInfo[]>> }): Promise<void> {
    try {
      // Discover all available models
      const allModels = await modelDiscovery.listAllProvidersModels({});
      this.cacheModelDiscovery(allModels);

      // Initialize model states
      for (const [provider, models] of Object.entries(allModels)) {
        for (const model of models) {
          const modelKey = this.getModelKey(model.id, provider);
          this.modelStates.set(modelKey, {
            model,
            provider,
            status: 'unknown',
            lastChecked: Date.now(),
            usageCount: 0,
          });
        }
      }

      // Check provider health
      await this.refreshProviderHealth();
    } catch (error) {
      console.warn('ModelManager initialization failed:', error);
    }
  }

  /**
   * Get recommended model with health-based selection
   */
  async getRecommendedModel(
    requestedModel: string,
    preferLocal: boolean = true,
  ): Promise<FallbackResult> {
    const cachedModels = this.getCachedModels();
    
    if (!cachedModels) {
      return {
        originalModel: requestedModel,
        selectedModel: requestedModel,
        selectedProvider: parseProviderModel(requestedModel).provider,
        fallbackReason: 'Model discovery not initialized',
        attemptedProviders: [],
        isOriginalAvailable: false,
      };
    }

    return fallbackService.findBestAvailableModel(requestedModel, cachedModels, {
      preferLocal,
    });
  }

  /**
   * Track model usage
   */
  trackModelUsage(model: string, provider: string, success: boolean = true): void {
    if (!this.options.enableUsageTracking) return;

    const modelKey = this.getModelKey(model, provider);
    const state = this.modelStates.get(modelKey);

    if (state) {
      state.usageCount += 1;
      state.lastUsed = Date.now();
      state.status = success ? 'available' : 'failed';
      
      if (!success) {
        state.errorMessage = `Model failed at ${new Date().toISOString()}`;
      } else {
        state.errorMessage = undefined;
      }

      this.modelStates.set(modelKey, state);
    }
  }

  /**
   * Get model state with health information
   */
  async getModelState(model: string, provider?: string): Promise<ModelState | null> {
    const parsed = parseProviderModel(model);
    const targetProvider = provider || parsed.provider;
    const modelKey = this.getModelKey(parsed.model, targetProvider);
    
    let state = this.modelStates.get(modelKey);
    
    // If not found, try to discover it
    if (!state) {
      await this.refreshModelDiscovery();
      state = this.modelStates.get(modelKey);
    }

    return state || null;
  }

  /**
   * Get provider summary with health and performance metrics
   */
  async getProviderSummary(provider: SupportedProvider): Promise<ProviderSummary> {
    const healthStatus = await healthMonitor.checkProviderHealth(provider);
    const providerModels = Array.from(this.modelStates.values())
      .filter(state => state.provider === provider);

    const availableCount = providerModels.filter(s => s.status === 'available').length;
    const failedCount = providerModels.filter(s => s.status === 'failed').length;

    const responseTimes = providerModels
      .filter(s => s.responseTime)
      .map(s => s.responseTime!);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : undefined;

    return {
      provider,
      isHealthy: healthStatus.isHealthy,
      modelCount: providerModels.length,
      availableModels: availableCount,
      failedModels: failedCount,
      avgResponseTime,
      lastHealthCheck: healthStatus.lastChecked,
    };
  }

  /**
   * Get all provider summaries
   */
  async getAllProviderSummaries(): Promise<ProviderSummary[]> {
    const providers = new Set(
      Array.from(this.modelStates.values()).map(state => state.provider)
    );

    const summaries = await Promise.all(
      Array.from(providers).map(provider => this.getProviderSummary(provider as SupportedProvider))
    );

    return summaries.sort((a, b) => {
      // Sort by health (healthy first), then by available models
      if (a.isHealthy && !b.isHealthy) return -1;
      if (!a.isHealthy && b.isHealthy) return 1;
      return b.availableModels - a.availableModels;
    });
  }

  /**
   * Get most used models across all providers
   */
  getMostUsedModels(limit: number = 10): ModelState[] {
    return Array.from(this.modelStates.values())
      .filter(state => state.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get recently used models
   */
  getRecentlyUsedModels(limit: number = 10): ModelState[] {
    return Array.from(this.modelStates.values())
      .filter(state => state.lastUsed)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, limit);
  }

  /**
   * Get recommended alternatives for a failed model
   */
  async getModelAlternatives(failedModel: string, limit: number = 3): Promise<ModelInfo[]> {
    const cachedModels = this.getCachedModels();
    if (!cachedModels) return [];

    return fallbackService.suggestAlternativeModels(failedModel, cachedModels, limit);
  }

  /**
   * Clear usage statistics
   */
  clearUsageStats(): void {
    for (const state of this.modelStates.values()) {
      state.usageCount = 0;
      state.lastUsed = undefined;
    }
  }

  /**
   * Refresh provider health status
   */
  async refreshProviderHealth(): Promise<void> {
    const healthStatuses = await healthMonitor.checkAllProviders({ forceRefresh: true });
    
    for (const status of healthStatuses) {
      this.providerStates.set(status.provider, status);
    }
  }

  /**
   * Refresh model discovery cache
   */
  async refreshModelDiscovery(): Promise<void> {
    try {
      // This would need to be injected or imported
      const { ModelDiscoveryService } = await import('../core/modelDiscovery.js');
      const discovery = new ModelDiscoveryService();
      const allModels = await discovery.listAllProvidersModels({});
      this.cacheModelDiscovery(allModels);
    } catch (error) {
      console.warn('Failed to refresh model discovery:', error);
    }
  }

  /**
   * Get health-ordered provider list
   */
  async getHealthyProviders(): Promise<SupportedProvider[]> {
    const summaries = await this.getAllProviderSummaries();
    return summaries
      .filter(summary => summary.isHealthy)
      .map(summary => summary.provider as SupportedProvider);
  }

  /**
   * Export usage statistics
   */
  exportUsageStats(): {
    models: Array<{
      model: string;
      provider: string;
      usageCount: number;
      lastUsed?: number;
      status: string;
    }>;
    providers: Array<{
      provider: string;
      isHealthy: boolean;
      modelCount: number;
    }>;
    summary: {
      totalModels: number;
      totalUsage: number;
      activeProviders: number;
    };
  } {
    const models = Array.from(this.modelStates.values()).map(state => ({
      model: state.model.id,
      provider: state.provider,
      usageCount: state.usageCount,
      lastUsed: state.lastUsed,
      status: state.status,
    }));

    const providers = Array.from(this.providerStates.values()).map(status => ({
      provider: status.provider,
      isHealthy: status.isHealthy,
      modelCount: models.filter(m => m.provider === status.provider).length,
    }));

    const totalUsage = models.reduce((sum, m) => sum + m.usageCount, 0);
    const activeProviders = providers.filter(p => p.isHealthy).length;

    return {
      models,
      providers,
      summary: {
        totalModels: models.length,
        totalUsage,
        activeProviders,
      },
    };
  }

  private getModelKey(model: string, provider: string): string {
    return `${provider}:${model}`;
  }

  private cacheModelDiscovery(models: Record<string, ModelInfo[]>): void {
    if (!this.options.enableCache) return;

    this.discoveryCache = {
      data: models,
      timestamp: Date.now(),
    };
  }

  private getCachedModels(): Record<string, ModelInfo[]> | null {
    if (!this.options.enableCache || !this.discoveryCache) {
      return null;
    }

    const isExpired = Date.now() - this.discoveryCache.timestamp > this.options.cacheTimeout;
    if (isExpired) {
      this.discoveryCache = null;
      return null;
    }

    return this.discoveryCache.data;
  }
}

// Singleton instance for global use
export const modelManager = new ModelManager();