/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { setGlobalDispatcher, ProxyAgent } from 'undici';

export interface ModelInfo {
  id: string;
  displayName: string;
  provider: string;
  aliases?: string[];
  description?: string;
}

export interface ProviderAdapter {
  listModels(apiKey: string, proxy?: string): Promise<ModelInfo[]>;
  validateCredentials(apiKey: string, proxy?: string): Promise<boolean>;
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

    // Map common aliases to full model IDs
    if (modelId.includes('gemini-2.0-flash-exp')) {
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

export class ModelDiscoveryService {
  private adapters = new Map<string, ProviderAdapter>();

  constructor() {
    this.adapters.set('gemini', new GeminiAdapter());
  }

  async listAvailableModels(
    provider: string,
    apiKey: string,
    proxy?: string,
  ): Promise<ModelInfo[]> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return adapter.listModels(apiKey, proxy);
  }

  async listAllProvidersModels(config: {
    apiKey?: string;
    proxy?: string;
  }): Promise<Record<string, ModelInfo[]>> {
    const results: Record<string, ModelInfo[]> = {};

    // For now, only support Gemini
    if (config.apiKey) {
      try {
        results.gemini = await this.listAvailableModels(
          'gemini',
          config.apiKey,
          config.proxy,
        );
      } catch (_error) {
        // Return empty array if we can't fetch models, but don't throw
        results.gemini = [];
      }
    }

    return results;
  }

  getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
