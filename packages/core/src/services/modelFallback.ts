/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { healthMonitor } from './providerHealth.js';
import { ModelInfo } from '../core/modelDiscovery.js';
import { ModelManager } from '../core/modelManager.js';
import {
  isLocalProvider,
  SupportedProvider,
} from '../config/models.js';

export interface FallbackResult {
  originalModel: string;
  selectedModel: string;
  selectedProvider: string;
  fallbackReason?: string;
  attemptedProviders: string[];
  isOriginalAvailable: boolean;
}

export interface FallbackOptions {
  preferLocal?: boolean;
  preferRemote?: boolean;
  excludeProviders?: string[];
  maxAttempts?: number;
  timeout?: number;
}

export class ModelFallbackService {
  private readonly DEFAULT_FALLBACK_HIERARCHY: SupportedProvider[] = [
    'ollama',
    'gemini',
  ];
  private readonly MODEL_SIZE_ALIASES = {
    small: ['llama3.2:1b', 'gemini-1.5-flash-8b'],
    medium: ['llama3.2:3b', 'qwen2.5:7b', 'gemini-1.5-flash'],
    large: ['qwen2.5:14b', 'llama3.1:8b', 'gemini-1.5-pro'],
  };

  /**
   * Find the best available model with intelligent fallback
   */
  async findBestAvailableModel(
    requestedModel: string,
    availableModels: Record<string, ModelInfo[]>,
    options: FallbackOptions = {},
  ): Promise<FallbackResult> {
    const parsed = ModelManager.getInstance().parseModel(requestedModel);
    const originalProvider = parsed.provider;
    const attemptedProviders: string[] = [];

    // Check if original model is available
    const isOriginalAvailable = await this.isModelAvailable(
      requestedModel,
      availableModels,
      originalProvider,
    );

    if (isOriginalAvailable) {
      return {
        originalModel: requestedModel,
        selectedModel: requestedModel,
        selectedProvider: originalProvider,
        attemptedProviders: [originalProvider],
        isOriginalAvailable: true,
      };
    }

    // Build fallback hierarchy
    const fallbackHierarchy = this.buildFallbackHierarchy(
      originalProvider,
      options,
    );

    // Try each provider in hierarchy
    for (const provider of fallbackHierarchy) {
      if (options.excludeProviders?.includes(provider)) {
        continue;
      }

      attemptedProviders.push(provider);

      // Check if provider is healthy
      const isHealthy = await healthMonitor.isProviderHealthy(provider, {
        timeout: options.timeout,
      });

      if (!isHealthy) {
        continue;
      }

      // Try to find equivalent model on this provider
      const equivalentModel = await this.findEquivalentModel(
        requestedModel,
        provider,
        availableModels[provider] || [],
      );

      if (equivalentModel) {
        return {
          originalModel: requestedModel,
          selectedModel: equivalentModel.id,
          selectedProvider: provider,
          fallbackReason: `Original ${originalProvider} model unavailable, using ${provider}`,
          attemptedProviders,
          isOriginalAvailable: false,
        };
      }
    }

    // No fallback found - return original with failure reason
    return {
      originalModel: requestedModel,
      selectedModel: requestedModel,
      selectedProvider: originalProvider,
      fallbackReason: `No healthy providers found. Attempted: ${attemptedProviders.join(', ')}`,
      attemptedProviders,
      isOriginalAvailable: false,
    };
  }

  /**
   * Get health-ordered provider list
   */
  async getHealthyProvidersByPreference(
    options: FallbackOptions = {},
  ): Promise<SupportedProvider[]> {
    const allProviders = await healthMonitor.checkAllProviders({
      timeout: options.timeout,
    });

    // Filter healthy providers
    const healthyProviders = allProviders
      .filter((status) => status.isHealthy)
      .map((status) => status.provider as SupportedProvider);

    // Apply preferences
    if (options.preferLocal) {
      return healthyProviders.sort((a, b) => {
        const aIsLocal = isLocalProvider(a);
        const bIsLocal = isLocalProvider(b);
        if (aIsLocal && !bIsLocal) return -1;
        if (!aIsLocal && bIsLocal) return 1;
        return 0;
      });
    }

    if (options.preferRemote) {
      return healthyProviders.sort((a, b) => {
        const aIsLocal = isLocalProvider(a);
        const bIsLocal = isLocalProvider(b);
        if (!aIsLocal && bIsLocal) return -1;
        if (aIsLocal && !bIsLocal) return 1;
        return 0;
      });
    }

    // Default hierarchy order
    return healthyProviders.sort((a, b) => {
      const aIndex = this.DEFAULT_FALLBACK_HIERARCHY.indexOf(a);
      const bIndex = this.DEFAULT_FALLBACK_HIERARCHY.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }

  /**
   * Suggest alternative models when requested model fails
   */
  async suggestAlternativeModels(
    failedModel: string,
    availableModels: Record<string, ModelInfo[]>,
    maxSuggestions: number = 3,
  ): Promise<ModelInfo[]> {
    const _parsed = ModelManager.getInstance().parseModel(failedModel);
    const suggestions: ModelInfo[] = [];

    // Get healthy providers first
    const healthyProviders = await this.getHealthyProvidersByPreference({
      preferLocal: true,
    });

    for (const provider of healthyProviders) {
      if (suggestions.length >= maxSuggestions) break;

      const models = availableModels[provider] || [];
      const equivalent = await this.findEquivalentModel(
        failedModel,
        provider,
        models,
      );

      if (equivalent && !suggestions.find((m) => m.id === equivalent.id)) {
        suggestions.push(equivalent);
      }
    }

    return suggestions;
  }

  /**
   * Recover from provider failure with automatic fallback
   */
  async recoverFromFailure(
    failedModel: string,
    availableModels: Record<string, ModelInfo[]>,
    options: FallbackOptions = {},
  ): Promise<FallbackResult> {
    const parsed = ModelManager.getInstance().parseModel(failedModel);

    // If this was already a fallback, try next in hierarchy
    const fallbackHierarchy = this.buildFallbackHierarchy(
      parsed.provider,
      options,
    );
    const currentIndex = fallbackHierarchy.indexOf(parsed.provider);

    if (currentIndex !== -1 && currentIndex < fallbackHierarchy.length - 1) {
      const nextProvider = fallbackHierarchy[currentIndex + 1];
      const nextModel = await this.findEquivalentModel(
        failedModel,
        nextProvider,
        availableModels[nextProvider] || [],
      );

      if (nextModel) {
        const isHealthy = await healthMonitor.isProviderHealthy(nextProvider);
        if (isHealthy) {
          return {
            originalModel: failedModel,
            selectedModel: nextModel.id,
            selectedProvider: nextProvider,
            fallbackReason: `Provider ${parsed.provider} failed, recovered with ${nextProvider}`,
            attemptedProviders: [parsed.provider, nextProvider],
            isOriginalAvailable: false,
          };
        }
      }
    }

    // Fallback to full search
    return this.findBestAvailableModel(failedModel, availableModels, {
      ...options,
      excludeProviders: [parsed.provider, ...(options.excludeProviders || [])],
    });
  }

  /**
   * Wait for provider recovery
   */
  async waitForProviderRecovery(
    provider: SupportedProvider,
    maxWaitTime: number = 30000,
  ): Promise<boolean> {
    return healthMonitor.waitForProviderHealth(provider, maxWaitTime);
  }

  private async isModelAvailable(
    model: string,
    availableModels: Record<string, ModelInfo[]>,
    provider: string,
  ): Promise<boolean> {
    const providerModels = availableModels[provider] || [];
    const parsed = ModelManager.getInstance().parseModel(model);

    return providerModels.some(
      (m) =>
        m.id === parsed.modelName ||
        m.aliases?.includes(parsed.modelName) ||
        m.id === model ||
        m.aliases?.includes(model),
    );
  }

  private buildFallbackHierarchy(
    originalProvider: string,
    options: FallbackOptions,
  ): SupportedProvider[] {
    let hierarchy: SupportedProvider[] = [...this.DEFAULT_FALLBACK_HIERARCHY];

    // Ensure original provider is first (if not excluded)
    if (!options.excludeProviders?.includes(originalProvider)) {
      hierarchy = hierarchy.filter((p) => p !== originalProvider);
      hierarchy.unshift(originalProvider as SupportedProvider);
    }

    // Apply preferences
    if (options.preferLocal) {
      hierarchy = hierarchy.sort((a, b) => {
        const aIsLocal = isLocalProvider(a);
        const bIsLocal = isLocalProvider(b);
        if (aIsLocal && !bIsLocal) return -1;
        if (!aIsLocal && bIsLocal) return 1;
        return 0;
      });
    } else if (options.preferRemote) {
      hierarchy = hierarchy.sort((a, b) => {
        const aIsLocal = isLocalProvider(a);
        const bIsLocal = isLocalProvider(b);
        if (!aIsLocal && bIsLocal) return -1;
        if (aIsLocal && !bIsLocal) return 1;
        return 0;
      });
    }

    return hierarchy.filter((p) => !options.excludeProviders?.includes(p));
  }

  private async findEquivalentModel(
    requestedModel: string,
    targetProvider: string,
    availableModels: ModelInfo[],
  ): Promise<ModelInfo | null> {
    const parsed = ModelManager.getInstance().parseModel(requestedModel);
    const modelName = parsed.modelName.toLowerCase();

    // Direct match by name or alias
    const directMatch = availableModels.find(
      (m) =>
        m.id.toLowerCase() === modelName ||
        m.aliases?.some((alias) => alias.toLowerCase() === modelName),
    );

    if (directMatch) return directMatch;

    // Try size-based fallback for aliases
    for (const [sizeAlias, equivalents] of Object.entries(
      this.MODEL_SIZE_ALIASES,
    )) {
      if (modelName === sizeAlias || parsed.modelName === sizeAlias) {
        for (const equivalent of equivalents) {
          const equivParsed = ModelManager.getInstance().parseModel(equivalent);
          if (equivParsed.provider === targetProvider) {
            const match = availableModels.find(
              (m) => m.id === equivParsed.modelName,
            );
            if (match) return match;
          }
        }

        // Fallback to any model with same size alias
        const sizeMatch = availableModels.find((m) =>
          m.aliases?.includes(sizeAlias),
        );
        if (sizeMatch) return sizeMatch;
      }
    }

    // Partial name matching as last resort
    const partialMatch = availableModels.find(
      (m) =>
        m.id.toLowerCase().includes(modelName) ||
        modelName.includes(m.id.toLowerCase()),
    );

    return partialMatch || null;
  }
}

// Singleton instance for global use
export const fallbackService = new ModelFallbackService();
