/**
 * Provider Registry - Warpio CLI Multi-Provider Support
 * 
 * Leverages Vercel AI SDK for production-ready provider abstraction.
 * Supports Gemini (default), LMStudio, Ollama, and OpenAI providers.
 */

import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createProviderRegistry, customProvider } from 'ai';

export interface ProviderConfig {
  provider: 'gemini' | 'lmstudio' | 'ollama' | 'openai';
  model?: string;
  baseURL?: string;
  apiKey?: string;
  fallbackProvider?: string;
  fallbackModel?: string;
}

/**
 * Create LMStudio provider using OpenAI-compatible endpoint
 */
function createLMStudioProvider() {
  return createOpenAICompatible({
    name: 'lmstudio',
    baseURL: process.env.LMSTUDIO_HOST || 'http://192.168.86.20:1234/v1',
    apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
    // gpt-oss-20b specific optimizations
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create Ollama provider using OpenAI-compatible endpoint
 */
function createOllamaProvider() {
  return createOpenAICompatible({
    name: 'ollama',
    baseURL: process.env.OLLAMA_HOST || 'http://localhost:11434/v1',
    apiKey: process.env.OLLAMA_API_KEY || 'ollama',
  });
}

/**
 * Create Warpio provider registry with all supported providers
 */
export function createWarpioProviderRegistry() {
  const lmstudio = createLMStudioProvider();
  const ollama = createOllamaProvider();

  return createProviderRegistry(
    {
      // Google Gemini (default provider)
      gemini: google,

      // LMStudio for local models
      lmstudio: customProvider({
        languageModels: {
          // Default model for gpt-oss-20b
          'gpt-oss-20b': lmstudio('gpt-oss-20b'),
          // Alias for easier access
          'default': lmstudio(process.env.LMSTUDIO_MODEL || 'gpt-oss-20b'),
        },
        fallbackProvider: google,
      }),

      // Ollama for local models
      ollama: customProvider({
        languageModels: {
          'gpt-oss': ollama('gpt-oss:20b'),
          'default': ollama(process.env.OLLAMA_MODEL || 'gpt-oss:20b'),
        },
        fallbackProvider: google,
      }),
    },
    { separator: ':' }
  );
}

/**
 * Get the appropriate model from the registry based on configuration
 */
export function getLanguageModel(config: ProviderConfig) {
  const registry = createWarpioProviderRegistry();
  
  const providerName = config.provider || 'gemini';
  const modelName = config.model || 'default';
  
  // Construct model ID: provider:model
  const modelId = `${providerName}:${modelName}`;
  
  try {
    return registry.languageModel(modelId as any);
  } catch (error) {
    console.warn(`Provider ${providerName} not available, falling back to Gemini`);
    // Fallback to Gemini
    return registry.languageModel('gemini:gemini-2.0-flash');
  }
}

/**
 * Parse provider configuration from environment variables
 */
export function parseProviderConfig(): ProviderConfig {
  return {
    provider: (process.env.WARPIO_PROVIDER as any) || 'gemini',
    model: process.env.WARPIO_MODEL,
    baseURL: process.env.WARPIO_BASE_URL,
    apiKey: process.env.WARPIO_API_KEY,
    fallbackProvider: process.env.WARPIO_FALLBACK_PROVIDER,
    fallbackModel: process.env.WARPIO_FALLBACK_MODEL,
  };
}