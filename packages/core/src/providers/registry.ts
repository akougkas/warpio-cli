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
 * Get model-specific configuration for LM Studio models
 */
function getLMStudioModelConfig(modelName: string) {
  const model = modelName.toLowerCase();
  
  if (model.includes('gpt-oss') || model.includes('20b')) {
    // gpt-oss:20b Harmony format requirements
    return {
      temperature: 1.0,
      stop: ['<|endoftext|>', '<|return|>'],
      top_p: 0.95,
      max_tokens: 2048,
    };
  } else if (model.includes('qwen')) {
    // qwen3:4b standard OpenAI format
    return {
      temperature: 0.7,
      stop: ['<|im_end|>', '<|endoftext|>'],
      top_p: 0.9,
      max_tokens: 2048,
    };
  }
  
  // Default configuration
  return {
    temperature: 0.7,
    stop: ['<|endoftext|>'],
    max_tokens: 2048,
  };
}

/**
 * Create LMStudio provider using OpenAI-compatible endpoint
 */
function createLMStudioProvider() {
  const currentModel = process.env.LMSTUDIO_MODEL || 'gpt-oss-20b';
  const modelConfig = getLMStudioModelConfig(currentModel);
  
  return createOpenAICompatible({
    name: 'lmstudio',
    baseURL: process.env.LMSTUDIO_HOST || 'http://192.168.86.20:1234/v1',
    apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
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