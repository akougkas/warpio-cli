/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProviderAdapter } from '../core/modelDiscovery.js';
import { getProviderConfig, SupportedProvider, PROVIDER_ALIASES } from '../config/models.js';

export interface ProviderHealthStatus {
  provider: string;
  isHealthy: boolean;
  lastChecked: number;
  error?: string;
  responseTime?: number;
}

export interface HealthCheckOptions {
  timeout?: number;
  cacheTTL?: number;
  forceRefresh?: boolean;
}

export class ProviderHealthMonitor {
  private healthCache = new Map<string, ProviderHealthStatus>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_TIMEOUT = 3000; // 3 seconds

  /**
   * Check health status of a specific provider with caching
   */
  async checkProviderHealth(
    provider: SupportedProvider,
    options: HealthCheckOptions = {},
  ): Promise<ProviderHealthStatus> {
    const cacheTTL = options.cacheTTL || this.DEFAULT_CACHE_TTL;
    const forceRefresh = options.forceRefresh || false;

    // Check cache first unless forced refresh
    if (!forceRefresh) {
      const cached = this.healthCache.get(provider);
      if (cached && Date.now() - cached.lastChecked < cacheTTL) {
        return cached;
      }
    }

    // Perform actual health check
    const status = await this.performHealthCheck(provider, options);
    
    // Cache the result
    this.healthCache.set(provider, status);
    
    return status;
  }

  /**
   * Check health of all configured providers
   */
  async checkAllProviders(options: HealthCheckOptions = {}): Promise<ProviderHealthStatus[]> {
    const providers = Object.keys(PROVIDER_ALIASES) as SupportedProvider[];
    const healthChecks = providers.map(provider => 
      this.checkProviderHealth(provider, options)
    );

    return Promise.all(healthChecks);
  }

  /**
   * Get cached health status without performing new checks
   */
  getCachedHealth(provider: string): ProviderHealthStatus | null {
    return this.healthCache.get(provider) || null;
  }

  /**
   * Clear health cache for specific provider or all providers
   */
  clearCache(provider?: string): void {
    if (provider) {
      this.healthCache.delete(provider);
    } else {
      this.healthCache.clear();
    }
  }

  /**
   * Get healthy providers only
   */
  async getHealthyProviders(options: HealthCheckOptions = {}): Promise<SupportedProvider[]> {
    const allStatuses = await this.checkAllProviders(options);
    return allStatuses
      .filter(status => status.isHealthy)
      .map(status => status.provider as SupportedProvider);
  }

  /**
   * Check if specific provider is currently healthy (with caching)
   */
  async isProviderHealthy(provider: SupportedProvider, options: HealthCheckOptions = {}): Promise<boolean> {
    const status = await this.checkProviderHealth(provider, options);
    return status.isHealthy;
  }

  /**
   * Wait for provider to become healthy (useful for recovery scenarios)
   */
  async waitForProviderHealth(
    provider: SupportedProvider,
    maxWaitTime: number = 30000,
    checkInterval: number = 2000,
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const isHealthy = await this.isProviderHealthy(provider, { forceRefresh: true });
      if (isHealthy) {
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    return false;
  }

  /**
   * Perform the actual health check for a provider
   */
  private async performHealthCheck(
    provider: SupportedProvider,
    options: HealthCheckOptions = {},
  ): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;

    try {
      const config = getProviderConfig(provider);
      if (!config.baseUrl) {
        return {
          provider,
          isHealthy: false,
          lastChecked: Date.now(),
          error: `No base URL configured for ${provider}`,
        };
      }

      // Use provider-specific health check endpoint
      const healthEndpoint = this.getHealthCheckEndpoint(provider, config.baseUrl);
      
      const response = await Promise.race([
        fetch(healthEndpoint, {
          method: 'GET',
          headers: config.apiKey ? {
            'Authorization': `Bearer ${config.apiKey}`,
          } : {},
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        ),
      ]);

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      return {
        provider,
        isHealthy,
        lastChecked: Date.now(),
        responseTime,
        error: isHealthy ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        provider,
        isHealthy: false,
        lastChecked: Date.now(),
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get provider-specific health check endpoint
   */
  private getHealthCheckEndpoint(provider: string, baseUrl: string): string {
    switch (provider) {
      case 'ollama':
        return `${baseUrl}/api/tags`;
      case 'lmstudio':
        return `${baseUrl}/v1/models`;
      case 'openai':
      case 'anthropic':
        return `${baseUrl}/v1/models`;
      default:
        return `${baseUrl}/models`;
    }
  }

  /**
   * Create health check using a provider adapter
   */
  async checkAdapterHealth(adapter: ProviderAdapter): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Assume adapter has a name property or method
      const providerName = (adapter as any).provider || 'unknown';
      
      const isHealthy = adapter.isServerRunning ? await adapter.isServerRunning() : true;
      const responseTime = Date.now() - startTime;

      return {
        provider: providerName,
        isHealthy,
        lastChecked: Date.now(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        provider: 'unknown',
        isHealthy: false,
        lastChecked: Date.now(),
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Singleton instance for global use
export const healthMonitor = new ProviderHealthMonitor();