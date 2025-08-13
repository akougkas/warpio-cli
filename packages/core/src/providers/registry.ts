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

      // LMStudio for local models (DEPRECATED: hardcoded models)
      lmstudio: customProvider({
        languageModels: {
          'gpt-oss-20b': lmstudio('gpt-oss-20b'),
          ...(process.env.LMSTUDIO_MODEL && {
            [process.env.LMSTUDIO_MODEL]: lmstudio(process.env.LMSTUDIO_MODEL),
          }),
        },
        // NO FALLBACK - fail explicitly if LMStudio is not available
      }),

      // Ollama for local models (DEPRECATED: hardcoded models)
      ollama: customProvider({
        languageModels: {
          'gpt-oss': ollama('gpt-oss:20b'),
          ...(process.env.OLLAMA_MODEL && {
            [process.env.OLLAMA_MODEL]: ollama(process.env.OLLAMA_MODEL),
          }),
        },
        // NO FALLBACK - fail explicitly if Ollama is not available
      }),
    },
    { separator: ':' }
  );
}

/**
 * Get the appropriate model from the registry based on configuration
 * DEPRECATED: Use WarpioProviderRegistry instead for configuration-driven approach
 */
export function getLanguageModel(config: ProviderConfig) {
  console.warn('DEPRECATED: getLanguageModel() should be replaced with WarpioProviderRegistry');
  
  const registry = createWarpioProviderRegistry();
  
  if (!config.provider) {
    throw new Error('Provider is required - no hardcoded defaults');
  }
  
  if (!config.model) {
    throw new Error('Model is required - no hardcoded defaults');
  }
  
  const modelId = `${config.provider}:${config.model}`;
  
  try {
    return registry.languageModel(modelId as any);
  } catch (error) {
    // NO SILENT FALLBACKS - fail with clear error message
    throw new Error(
      `Failed to create model ${modelId}: ${error instanceof Error ? error.message : String(error)}. ` +
      'Check your provider configuration and ensure the model is available.'
    );
  }
}

/**
 * Parse provider configuration from environment variables
 * DEPRECATED: Use WarpioConfigLoader instead for complete configuration support
 */
export function parseProviderConfig(): ProviderConfig {
  console.warn('DEPRECATED: parseProviderConfig() should be replaced with WarpioConfigLoader');
  
  const provider = process.env.WARPIO_PROVIDER as any;
  if (!provider) {
    throw new Error(
      'WARPIO_PROVIDER environment variable is required. ' +
      'Set it to one of: gemini, lmstudio, ollama, openai'
    );
  }

  return {
    provider,
    model: process.env.WARPIO_MODEL,
    baseURL: process.env.WARPIO_BASE_URL,
    apiKey: process.env.WARPIO_API_KEY,
    fallbackProvider: process.env.WARPIO_FALLBACK_PROVIDER,
    fallbackModel: process.env.WARPIO_FALLBACK_MODEL,
  };
}