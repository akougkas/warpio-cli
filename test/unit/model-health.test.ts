/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderHealthMonitor } from '../../packages/core/src/services/providerHealth.js';
import { ModelFallbackService } from '../../packages/core/src/services/modelFallback.js';
import { ModelManager } from '../../packages/core/src/services/modelManager.js';
import { ModelDiscoveryService } from '../../packages/core/src/core/modelDiscovery.js';
import { providerConfigManager } from '../../packages/core/src/config/providerConfig.js';

describe('ProviderHealthMonitor - Real Integration Tests', () => {
  let healthMonitor: ProviderHealthMonitor;

  beforeEach(() => {
    healthMonitor = new ProviderHealthMonitor();
    // Clear cache before each test
    healthMonitor.clearCache();
  });

  describe('basic functionality', () => {
    it('should create a health monitor instance', () => {
      expect(healthMonitor).toBeInstanceOf(ProviderHealthMonitor);
    });

    it('should check actual provider health status', async () => {
      const result = await healthMonitor.checkProviderHealth('ollama', {
        timeout: 2000,
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('ollama');
      expect(result.lastChecked).toBeGreaterThan(0);
      expect(typeof result.isHealthy).toBe('boolean');

      if (result.responseTime) {
        expect(result.responseTime).toBeGreaterThan(0);
      }
    });

    it('should cache health status results', async () => {
      const startTime = Date.now();

      // First call
      const result1 = await healthMonitor.checkProviderHealth('ollama');
      const firstCallTime = Date.now() - startTime;

      // Second call (should be cached and faster)
      const cacheStartTime = Date.now();
      const result2 = await healthMonitor.checkProviderHealth('ollama');
      const secondCallTime = Date.now() - cacheStartTime;

      expect(result1.lastChecked).toBe(result2.lastChecked);
      expect(secondCallTime).toBeLessThan(firstCallTime);
    });

    it('should force refresh when requested', async () => {
      // First call
      const result1 = await healthMonitor.checkProviderHealth('ollama');

      // Wait a tiny bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call with force refresh
      const result2 = await healthMonitor.checkProviderHealth('ollama', {
        forceRefresh: true,
      });

      expect(result2.lastChecked).toBeGreaterThan(result1.lastChecked);
    });

    it('should check all configured providers', async () => {
      const allStatuses = await healthMonitor.checkAllProviders();

      expect(Array.isArray(allStatuses)).toBe(true);
      expect(allStatuses.length).toBeGreaterThan(0);

      // Should include both providers
      const providerNames = allStatuses.map((s) => s.provider);
      expect(providerNames).toContain('ollama');
      expect(providerNames).toContain('gemini');

      // Each status should have required fields
      for (const status of allStatuses) {
        expect(status.provider).toBeDefined();
        expect(typeof status.isHealthy).toBe('boolean');
        expect(status.lastChecked).toBeGreaterThan(0);
      }
    });

    it('should clear cache correctly', async () => {
      // Check provider to populate cache
      await healthMonitor.checkProviderHealth('ollama');

      // Clear cache
      healthMonitor.clearCache();

      // Check cached status (should be null)
      const cached = healthMonitor.getCachedHealth('ollama');
      expect(cached).toBeNull();
    });
  });
});

describe('ModelFallbackService - Real Integration Tests', () => {
  let fallbackService: ModelFallbackService;

  beforeEach(() => {
    fallbackService = new ModelFallbackService();
  });

  describe('basic functionality', () => {
    it('should create a fallback service instance', () => {
      expect(fallbackService).toBeInstanceOf(ModelFallbackService);
    });

    it('should have correct fallback hierarchy', () => {
      const hierarchy = (
        fallbackService as { DEFAULT_FALLBACK_HIERARCHY: string[] }
      ).DEFAULT_FALLBACK_HIERARCHY;
      expect(hierarchy).toBeDefined();
      expect(Array.isArray(hierarchy)).toBe(true);
      expect(hierarchy).toContain('ollama');
      expect(hierarchy).toContain('gemini');
    });

    it('should have model size aliases defined', () => {
      const aliases = (
        fallbackService as { MODEL_SIZE_ALIASES: Record<string, string> }
      ).MODEL_SIZE_ALIASES;
      expect(aliases).toBeDefined();
      expect(aliases.small).toBeDefined();
      expect(aliases.medium).toBeDefined();
      expect(aliases.large).toBeDefined();

      // Each alias should have model options
      expect(Array.isArray(aliases.small)).toBe(true);
      expect(Array.isArray(aliases.medium)).toBe(true);
      expect(Array.isArray(aliases.large)).toBe(true);
    });

    it('should get healthy providers based on real health checks', async () => {
      const healthyProviders =
        await fallbackService.getHealthyProvidersByPreference({
          timeout: 2000,
        });

      expect(Array.isArray(healthyProviders)).toBe(true);

      // Results should contain supported providers only
      for (const provider of healthyProviders) {
        expect(['ollama', 'gemini']).toContain(provider);
      }
    });

    it('should prefer local providers when requested', async () => {
      const localPreferredProviders =
        await fallbackService.getHealthyProvidersByPreference({
          preferLocal: true,
          timeout: 2000,
        });

      const remotePreferredProviders =
        await fallbackService.getHealthyProvidersByPreference({
          preferRemote: true,
          timeout: 2000,
        });

      expect(Array.isArray(localPreferredProviders)).toBe(true);
      expect(Array.isArray(remotePreferredProviders)).toBe(true);

      // If both local and remote providers are available, order should differ
      if (
        localPreferredProviders.length > 1 &&
        remotePreferredProviders.length > 1
      ) {
        expect(localPreferredProviders[0]).not.toBe(
          remotePreferredProviders[0],
        );
      }
    });
  });
});

describe('ModelManager - Real Integration Tests', () => {
  let modelManager: ModelManager;
  let discoveryService: ModelDiscoveryService;

  beforeEach(() => {
    modelManager = new ModelManager({
      enableCache: true,
      enableUsageTracking: true,
    });
    discoveryService = new ModelDiscoveryService();
  });

  describe('basic functionality', () => {
    it('should create a model manager instance', () => {
      expect(modelManager).toBeInstanceOf(ModelManager);
    });

    it('should initialize with real model discovery', async () => {
      // This will attempt real discovery but gracefully handle failures
      await modelManager.initialize(discoveryService);

      // Should not throw and should be initialized
      expect(modelManager).toBeDefined();
    });

    it('should track model usage correctly', async () => {
      await modelManager.initialize(discoveryService);

      // Track some usage
      modelManager.trackModelUsage('test-model', 'ollama', true);
      modelManager.trackModelUsage('test-model', 'ollama', false);

      // Should track both successes and failures
      const mostUsed = modelManager.getMostUsedModels(10);

      // Should have tracked something if models exist
      expect(Array.isArray(mostUsed)).toBe(true);
    });

    it('should export usage statistics in correct format', async () => {
      await modelManager.initialize(discoveryService);

      // Track some usage
      modelManager.trackModelUsage('test-model', 'ollama', true);

      const stats = modelManager.exportUsageStats();

      expect(stats).toBeDefined();
      expect(stats.models).toBeDefined();
      expect(Array.isArray(stats.models)).toBe(true);
      expect(stats.providers).toBeDefined();
      expect(Array.isArray(stats.providers)).toBe(true);
      expect(stats.summary).toBeDefined();
      expect(typeof stats.summary.totalModels).toBe('number');
      expect(typeof stats.summary.totalUsage).toBe('number');
      expect(typeof stats.summary.activeProviders).toBe('number');
    });

    it('should clear usage stats correctly', async () => {
      await modelManager.initialize(discoveryService);

      // Track usage
      modelManager.trackModelUsage('test-model', 'ollama', true);

      // Clear stats
      modelManager.clearUsageStats();

      // Export should show zero usage
      const stats = modelManager.exportUsageStats();
      expect(stats.summary.totalUsage).toBe(0);
    });
  });
});

describe('Provider Configuration Manager', () => {
  beforeEach(() => {
    // Load configuration from environment
    providerConfigManager.loadFromEnvironment();
  });

  describe('basic functionality', () => {
    it('should provide provider configurations', () => {
      const ollamaConfig = providerConfigManager.getProviderConfig('ollama');
      const geminiConfig = providerConfigManager.getProviderConfig('gemini');

      expect(ollamaConfig).toBeDefined();
      expect(geminiConfig).toBeDefined();

      expect(ollamaConfig.displayName).toBe('Ollama');
      expect(geminiConfig.displayName).toBe('Google Gemini');

      expect(ollamaConfig.isLocal).toBe(true);
      expect(geminiConfig.isLocal).toBe(false);
    });

    it('should validate provider configurations', () => {
      const ollamaValidation =
        providerConfigManager.validateProviderConfig('ollama');
      const geminiValidation =
        providerConfigManager.validateProviderConfig('gemini');

      expect(ollamaValidation).toBeDefined();
      expect(typeof ollamaValidation.isValid).toBe('boolean');
      expect(Array.isArray(ollamaValidation.errors)).toBe(true);
      expect(Array.isArray(ollamaValidation.warnings)).toBe(true);

      expect(geminiValidation).toBeDefined();
      expect(typeof geminiValidation.isValid).toBe('boolean');
      expect(Array.isArray(geminiValidation.errors)).toBe(true);
      expect(Array.isArray(geminiValidation.warnings)).toBe(true);
    });

    it('should provide configuration summary', () => {
      const summary = providerConfigManager.getConfigurationSummary();

      expect(Array.isArray(summary)).toBe(true);
      expect(summary.length).toBeGreaterThan(0);

      for (const config of summary) {
        expect(config.provider).toBeDefined();
        expect(['configured', 'default', 'incomplete']).toContain(
          config.status,
        );
        expect(config.displayName).toBeDefined();
        expect(typeof config.isLocal).toBe('boolean');
        expect(typeof config.requiresAuth).toBe('boolean');
        expect(Array.isArray(config.features)).toBe(true);
        expect(Array.isArray(config.issues)).toBe(true);
      }
    });

    it('should support optimized configurations', () => {
      const interactiveConfig = providerConfigManager.getOptimizedConfig(
        'ollama',
        'interactive',
      );
      const batchConfig = providerConfigManager.getOptimizedConfig(
        'ollama',
        'batch',
      );

      expect(interactiveConfig).toBeDefined();
      expect(batchConfig).toBeDefined();

      // Interactive should have shorter timeouts than batch
      expect(interactiveConfig.defaultTimeout).toBeLessThanOrEqual(
        batchConfig.defaultTimeout,
      );
    });

    it('should support configuration export/import', () => {
      // Export current config
      const exported = providerConfigManager.exportConfiguration();
      expect(exported).toBeDefined();

      // Import should work without errors
      expect(() => {
        providerConfigManager.importConfiguration(exported);
      }).not.toThrow();
    });
  });
});
