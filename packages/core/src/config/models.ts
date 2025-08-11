/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// Provider-specific model aliases
export const PROVIDER_ALIASES = {
  gemini: {
    pro: 'models/gemini-2.0-flash-exp',
    flash: DEFAULT_GEMINI_FLASH_MODEL,
    'flash-lite': DEFAULT_GEMINI_FLASH_LITE_MODEL,
  },
  // Future providers can be added here
  // openai: { 'gpt-4': 'gpt-4-turbo', ... },
  // anthropic: { 'claude': 'claude-3-5-sonnet-20241022', ... },
} as const;

export type SupportedProvider = keyof typeof PROVIDER_ALIASES;

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
  const [providerPrefix, modelPart] = input.includes(':')
    ? input.split(':', 2)
    : [undefined, input];

  return {
    provider: (providerPrefix as SupportedProvider) || 'gemini',
    model: modelPart || input,
  };
}
