/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '@google/gemini-cli-core';
import { ProviderHealthMonitor } from '@google/gemini-cli-core/src/services/providerHealth.js';
import { parseProviderModel } from '@google/gemini-cli-core/src/config/models.js';

export interface FallbackOptions {
  preferLocal?: boolean;
  silent?: boolean;
}

export class ModelFallbackService {
  private static readonly FALLBACK_CHAIN = [
    'ollama:llama3',
    'lmstudio:gpt-oss',
    'gemini:flash',
  ];

  static async findAvailableModel(
    requestedModel: string,
    config: Config,
    options: FallbackOptions = {},
  ): Promise<string | null> {
    const health = new ProviderHealthMonitor();
    const { provider } = parseProviderModel(requestedModel);

    // Check if requested model's provider is available
    const isHealthy = await health.isProviderHealthy(provider);
    if (isHealthy) {
      return requestedModel;
    }

    if (!options.silent) {
      console.warn(`⚠️  ${provider} is not available`);
      console.log('    Checking for alternative providers...');
    }

    // Try fallback chain
    for (const fallbackModel of this.FALLBACK_CHAIN) {
      const { provider: fallbackProvider } = parseProviderModel(fallbackModel);

      // Skip if we already tried this provider
      if (fallbackProvider === provider) continue;

      const fallbackIsHealthy = await health.isProviderHealthy(fallbackProvider);
      if (fallbackIsHealthy) {
        if (!options.silent) {
          console.log(`✓ Using ${fallbackProvider} as fallback`);
        }
        return fallbackModel;
      }
    }

    // No providers available
    if (!options.silent) {
      console.error('\n❌ No AI providers available. Please set up one of:');
      console.log('  • Ollama: ollama serve');
      console.log('  • LM Studio: Start server in app');
      console.log('  • Gemini: export GEMINI_API_KEY=your-key');
    }

    return null;
  }

  static async ensureModelAvailable(
    model: string,
    config: Config,
  ): Promise<string> {
    const available = await this.findAvailableModel(model, config);

    if (!available) {
      throw new Error(
        'No AI models available. Please ensure at least one provider is running.',
      );
    }

    return available;
  }
}
