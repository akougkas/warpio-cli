/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';
export const DEFAULT_GEMINI_PRO_MODEL = 'gemini-2.5-pro';

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// Provider-specific model aliases
export const PROVIDER_ALIASES = {
  gemini: {
    pro: DEFAULT_GEMINI_PRO_MODEL,
    flash: DEFAULT_GEMINI_FLASH_MODEL,
    'flash-lite': DEFAULT_GEMINI_FLASH_LITE_MODEL,
  },
  ollama: {
    small: 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest',
    medium: 'gpt-oss:20b',
    large: 'qwen3-coder:latest',
  },
  // lmstudio: {
  //   small: 'gpt-oss',
  //   medium: 'gpt-oss',
  //   large: 'gpt-oss',
  // }, // Temporarily disabled
} as const;

export type SupportedProvider = keyof typeof PROVIDER_ALIASES;

// Add local provider detection
export function isLocalProvider(provider: string): boolean {
  return provider === 'ollama'; // || provider === 'lmstudio'; // LM Studio temporarily disabled
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
    // case 'lmstudio': // Temporarily disabled
    //   return {
    //     baseUrl: process.env.LMSTUDIO_HOST || 'http://localhost:1234/v1',
    //     apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
    //     requiresAuth: false,
    //     isLocal: true,
    //   };
    case 'gemini':
    default:
      return {
        requiresAuth: true,
        isLocal: false,
      };
  }
}

/**
 * Resolves a model alias to the full model ID for a given provider
 */
export function resolveModelAlias(
  input: string,
  provider: SupportedProvider = 'gemini',
): string {
  // Check if input has provider prefix (e.g., "openai:gpt-4")
  const [providerPrefix, modelPart] = input.includes(':')
    ? input.split(':', 2)
    : [undefined, input];

  const resolvedProvider = (providerPrefix as SupportedProvider) || provider;
  const modelToResolve = modelPart || input;

  // Get aliases for the provider
  const aliases = PROVIDER_ALIASES[resolvedProvider];
  if (!aliases) {
    // Unknown provider, return input as-is
    return input;
  }

  // Check if it's an alias
  const resolvedModel = aliases[modelToResolve as keyof typeof aliases];
  return resolvedModel || modelToResolve;
}

/**
 * Parses provider:model format and returns both parts
 */
export function parseProviderModel(input: string): {
  provider: SupportedProvider;
  model: string;
} {
  // Handle provider prefix like "ollama:model-name" where model-name might contain colons
  const providerPrefixMatch = input.match(/^(ollama|lmstudio):/);

  if (providerPrefixMatch) {
    const provider = providerPrefixMatch[1] as SupportedProvider;
    const model = input.substring(provider.length + 1); // Skip "provider:"
    return { provider, model };
  }

  // No provider prefix found, assume gemini
  return {
    provider: 'gemini',
    model: input,
  };
}

/**
 * Gets a friendly display name for a model ID
 * Converts full model names back to user-friendly aliases when possible
 */
export function getModelDisplayName(modelId: string): string {
  if (!modelId) return 'Unknown Model';

  // Parse provider and model
  const { provider, model } = parseProviderModel(modelId);
  
  // Get aliases for the provider to find reverse mapping
  const aliases = PROVIDER_ALIASES[provider];
  if (aliases) {
    // Look for an alias that matches this full model ID
    for (const [aliasName, fullModel] of Object.entries(aliases)) {
      if (fullModel === model || fullModel === modelId) {
        // Return provider:alias format for local providers, just alias for Gemini
        return provider === 'gemini' ? aliasName : `${provider}:${aliasName}`;
      }
    }
  }

  // For local models, try to create a friendly display name
  if (isLocalProvider(provider)) {
    // Extract just the model name part from complex names like "hopephoto/Qwen3-4B-Instruct-2507_q8:latest"
    const modelParts = model.split('/');
    const modelName = modelParts[modelParts.length - 1]; // Get the last part
    
    // Remove common suffixes to make it cleaner
    const cleanName = modelName
      .replace(':latest', '')
      .replace('_q8', '')
      .replace('-Instruct', '')
      .replace('-2507', '');
    
    return `${provider}:${cleanName}`;
  }

  // For unknown models, return the model ID as-is but clean up provider prefix
  return modelId;
}