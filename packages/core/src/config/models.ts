/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Gemini defaults (keep original behavior)
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';
export const DEFAULT_GEMINI_PRO_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// Default models for local providers only (using new format)
export const DEFAULT_LOCAL_MODELS = {
  ollama: 'qwen3:8b',
  lmstudio: 'qwen3-4b-instruct-2507@q8_0',
} as const;

// Default embedding models for local providers
export const DEFAULT_LOCAL_EMBEDDING_MODELS = {
  ollama: 'granite-embedding:30m',
  lmstudio: 'text-embedding-qwen3-embedding-4b',
} as const;

// Gemini aliases (keep original behavior)
export const PROVIDER_ALIASES = {
  gemini: {
    pro: DEFAULT_GEMINI_PRO_MODEL,
    flash: DEFAULT_GEMINI_FLASH_MODEL,
    'flash-lite': DEFAULT_GEMINI_FLASH_LITE_MODEL,
  },
} as const;

/** Original resolveModelAlias function for Gemini compatibility */
export function resolveModelAlias(
  input: string,
  provider: SupportedProvider = 'gemini',
): string {
  // Only works for Gemini - local providers use provider::model format
  if (provider !== 'gemini') {
    throw new Error(
      `Use provider::model_name format for ${provider}. Example: ${provider}::${input}`,
    );
  }

  // Get aliases for Gemini
  const aliases = PROVIDER_ALIASES.gemini;
  const resolvedModel = aliases[input as keyof typeof aliases];
  return resolvedModel || input;
}

export type SupportedProvider = 'gemini' | 'ollama' | 'lmstudio';

// Add local provider detection
export function isLocalProvider(provider: string): boolean {
  return provider === 'ollama' || provider === 'lmstudio';
}

// Add provider configuration helper
export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  requiresAuth: boolean;
  isLocal: boolean;
}

export function getProviderConfig(provider: SupportedProvider): ProviderConfig {
  switch (provider) {
    case 'ollama':
      return {
        baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
        apiKey: 'ollama',
        requiresAuth: false,
        isLocal: true,
      };
    case 'lmstudio':
      return {
        baseUrl: process.env.LMSTUDIO_HOST || 'http://192.168.86.20:1234/v1',
        apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
        requiresAuth: false,
        isLocal: true,
      };
    case 'gemini':
    default:
      return {
        requiresAuth: true,
        isLocal: false,
      };
  }
}

/**
 * ELIMINATED: parseProviderModel has been replaced by ModelManager.parseModel()
 * 
 * @deprecated Use ModelManager.getInstance().parseModel() instead
 */
export function parseProviderModel(input: string): {
  provider: SupportedProvider;
  model: string;
} {
  throw new Error(
    'parseProviderModel has been eliminated. Use ModelManager.getInstance().parseModel() instead. ' +
    'Import ModelManager from @google/gemini-cli-core and call parseModel() for the new implementation.'
  );
}

/**
 * Creates a standardized model identifier in provider::model_name format
 */
export function formatModelId(
  provider: SupportedProvider,
  model: string,
): string {
  return `${provider}::${model}`;
}

/**
 * Gets the default model for a provider
 */
export function getDefaultModel(provider: SupportedProvider): string {
  if (provider === 'gemini') {
    return DEFAULT_GEMINI_MODEL;
  }

  return DEFAULT_LOCAL_MODELS[provider as keyof typeof DEFAULT_LOCAL_MODELS];
}

/**
 * Gets the default embedding model for a provider
 */
export function getDefaultEmbeddingModel(provider: SupportedProvider): string {
  if (provider === 'gemini') {
    return DEFAULT_GEMINI_EMBEDDING_MODEL;
  }

  return DEFAULT_LOCAL_EMBEDDING_MODELS[
    provider as keyof typeof DEFAULT_LOCAL_EMBEDDING_MODELS
  ];
}

/**
 * Gets a friendly display name for a model ID in provider::model_name format
 */
export function getModelDisplayName(modelId: string): string {
  if (!modelId) return 'Unknown Model';

  // If it's already in provider::model format, return as-is
  if (modelId.includes('::')) {
    return modelId;
  }

  // Otherwise, it might be a legacy format or bare model name
  // Try to detect provider based on model name patterns
  if (modelId.startsWith('gemini-') || modelId.startsWith('models/')) {
    return `google::${modelId.replace('models/', '')}`;
  }

  // For unknown models, return as-is
  return modelId;
}
