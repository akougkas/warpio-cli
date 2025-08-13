/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple Warpio Provider Integration
 * ENV-only configuration with no complex validation or preferences
 */

import { ProviderPreferences } from './types.js';
import { getWarpioLanguageModel } from './provider-registry.js';
import { AISDKProviderManager } from '../providers/manager.js';

// Cache for content generator to prevent duplicate instances
let cachedContentGenerator: any = null;
let cachedProvider: string | null = null;

/**
 * Create content generator using simple ENV vars (cached)
 */
export function createWarpioContentGenerator(): any {
  const provider = process.env.WARPIO_PROVIDER;

  // If no provider or gemini, return null to use default Gemini
  if (!provider || provider === 'gemini') {
    return null;
  }

  // Return cached generator if provider hasn't changed
  if (cachedContentGenerator && cachedProvider === provider) {
    return cachedContentGenerator;
  }

  try {
    // Create AISDKProviderManager with ENV-based config
    const config = {
      provider: provider as any,
      model:
        provider === 'lmstudio'
          ? process.env.LMSTUDIO_MODEL || 'default'
          : provider === 'ollama'
            ? process.env.OLLAMA_MODEL || 'default'
            : provider === 'openai'
              ? process.env.OPENAI_MODEL || 'gpt-4'
              : 'default',
      baseURL:
        provider === 'lmstudio'
          ? process.env.LMSTUDIO_HOST
          : provider === 'ollama'
            ? process.env.OLLAMA_HOST
            : provider === 'openai'
              ? process.env.OPENAI_BASE_URL
              : undefined,
      apiKey:
        provider === 'lmstudio'
          ? process.env.LMSTUDIO_API_KEY || 'lm-studio'
          : provider === 'ollama'
            ? process.env.OLLAMA_API_KEY || 'ollama'
            : provider === 'openai'
              ? process.env.OPENAI_API_KEY
              : undefined,
    };

    cachedContentGenerator = new AISDKProviderManager(config);
    cachedProvider = provider;
    return cachedContentGenerator;
  } catch (error) {
    console.error('Failed to create Warpio content generator:', error);
    return null;
  }
}

/**
 * Get language model using simple ENV vars
 */
export function createWarpioLanguageModel(): any {
  const provider = process.env.WARPIO_PROVIDER;

  if (!provider || provider === 'gemini') {
    return null; // Use default Gemini
  }

  try {
    return getWarpioLanguageModel(provider);
  } catch (error) {
    console.error('Failed to create Warpio language model:', error);
    return null;
  }
}

/**
 * Legacy compatibility class (deprecated)
 * TODO: Remove once all code is updated to use functions above
 */
export class WarpioProviderIntegration {
  setProviderPreferences(preferences: ProviderPreferences): void {}

  clearProviderPreferences(): void {}

  getCurrentPreferences(): ProviderPreferences | null {
    return null;
  }

  createPersonaContentGenerator(personaName: string): any {
    return createWarpioContentGenerator();
  }

  createPersonaLanguageModel(personaName: string): any {
    return createWarpioLanguageModel();
  }

  async testProviderAvailability(): Promise<{ [provider: string]: boolean }> {
    return {};
  }
}
