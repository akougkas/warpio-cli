/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProviderInfo {
  name: string;
  color: string;
  isLocal: boolean;
  supportsStreaming: boolean;
}

export function getProviderInfo(): ProviderInfo {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  
  const providerMap: Record<string, ProviderInfo> = {
    gemini: {
      name: 'Google',
      color: '#0D83C9', // Warpio brand blue
      isLocal: false,
      supportsStreaming: true,
    },
    lmstudio: {
      name: 'LMStudio',
      color: '#9333EA', // Purple
      isLocal: true,
      supportsStreaming: true,
    },
    ollama: {
      name: 'Ollama',
      color: '#475569', // Dark grey
      isLocal: true,
      supportsStreaming: true,
    },
    openai: {
      name: 'OpenAI',
      color: '#10A37F', // Green
      isLocal: false,
      supportsStreaming: true,
    },
  };

  return providerMap[provider] || {
    name: provider,
    color: '#6B7280',
    isLocal: false,
    supportsStreaming: false,
  };
}

export function getModelName(): string {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  
  switch (provider) {
    case 'lmstudio':
      return process.env.LMSTUDIO_MODEL || 'unknown';
    case 'ollama':
      return process.env.OLLAMA_MODEL || 'unknown';
    case 'openai':
      return process.env.OPENAI_MODEL || 'gpt-4o-mini';
    case 'gemini':
    default:
      return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }
}

export function getContextInfo(model: string): { current: number; max: number } {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  const modelLower = model.toLowerCase();
  
  // Default context sizes based on provider and model patterns
  const contextSizes: Record<string, { current: number; max: number }> = {
    // Gemini models
    'gemini-2.5-flash': { current: 0, max: 1048576 }, // 1M
    'gemini-1.5-pro': { current: 0, max: 2097152 }, // 2M
    'gemini-1.5-flash': { current: 0, max: 1048576 }, // 1M
    
    // OpenAI models
    'gpt-4o': { current: 0, max: 128000 }, // 128K
    'gpt-4o-mini': { current: 0, max: 128000 }, // 128K
    'gpt-4-turbo': { current: 0, max: 128000 }, // 128K
    
    // Local models (conservative estimates)
    'qwen': { current: 0, max: 32768 }, // 32K
    'llama': { current: 0, max: 8192 }, // 8K
    'mistral': { current: 0, max: 8192 }, // 8K
    'codellama': { current: 0, max: 16384 }, // 16K
  };
  
  // Try exact model match first
  if (contextSizes[modelLower]) {
    return contextSizes[modelLower];
  }
  
  // Try pattern matching
  for (const [pattern, size] of Object.entries(contextSizes)) {
    if (modelLower.includes(pattern)) {
      return size;
    }
  }
  
  // Provider defaults
  const providerDefaults: Record<string, { current: number; max: number }> = {
    gemini: { current: 0, max: 1048576 },
    openai: { current: 0, max: 128000 },
    lmstudio: { current: 0, max: 32768 },
    ollama: { current: 0, max: 8192 },
  };
  
  return providerDefaults[provider] || { current: 0, max: 8192 };
}