/**
 * Simple ENV-only Warpio Provider Creation
 * Zero configuration files, just environment variables
 */

import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createProviderRegistry, customProvider } from 'ai';

/**
 * Simple provider creation from environment variables
 */
export function createWarpioProvider(provider: string): any {
  switch (provider) {
    case 'lmstudio':
      const lmStudioHost = process.env.LMSTUDIO_HOST;
      const lmStudioModel = process.env.LMSTUDIO_MODEL || 'default';
      const lmStudioApiKey = process.env.LMSTUDIO_API_KEY || 'lm-studio';

      if (!lmStudioHost) {
        throw new Error(
          'LMSTUDIO_HOST environment variable is required for LMStudio provider',
        );
      }

      const lmStudioProvider = createOpenAICompatible({
        name: 'lmstudio',
        baseURL: lmStudioHost,
        apiKey: lmStudioApiKey,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const lmStudioModels: Record<string, any> = {};
      lmStudioModels[lmStudioModel] = lmStudioProvider(lmStudioModel);

      return createProviderRegistry(
        {
          lmstudio: customProvider({
            languageModels: lmStudioModels,
          }),
        },
        { separator: ':' },
      );

    case 'ollama':
      const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const ollamaModel = process.env.OLLAMA_MODEL || 'default';
      const ollamaApiKey = process.env.OLLAMA_API_KEY || 'ollama';

      const ollamaProvider = createOpenAICompatible({
        name: 'ollama',
        baseURL: ollamaHost.includes('/v1') ? ollamaHost : `${ollamaHost}/v1`,
        apiKey: ollamaApiKey,
      });

      const ollamaModels: Record<string, any> = {};
      ollamaModels[ollamaModel] = ollamaProvider(ollamaModel);

      return createProviderRegistry(
        {
          ollama: customProvider({
            languageModels: ollamaModels,
          }),
        },
        { separator: ':' },
      );

    case 'openai':
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const openaiModel = process.env.OPENAI_MODEL || 'gpt-4';
      const openaiBaseUrl =
        process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

      if (!openaiApiKey) {
        throw new Error(
          'OPENAI_API_KEY environment variable is required for OpenAI provider',
        );
      }

      const openaiProvider = createOpenAICompatible({
        name: 'openai',
        baseURL: openaiBaseUrl,
        apiKey: openaiApiKey,
      });

      const openaiModels: Record<string, any> = {};
      openaiModels[openaiModel] = openaiProvider(openaiModel);

      return createProviderRegistry(
        {
          openai: customProvider({
            languageModels: openaiModels,
          }),
        },
        { separator: ':' },
      );

    case 'gemini':
      return createProviderRegistry(
        {
          gemini: google,
        },
        { separator: ':' },
      );

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get language model using simple ENV-only approach
 */
export function getWarpioLanguageModel(provider: string): any {
  const registry = createWarpioProvider(provider);
  const model =
    provider === 'lmstudio'
      ? process.env.LMSTUDIO_MODEL || 'default'
      : provider === 'ollama'
        ? process.env.OLLAMA_MODEL || 'default'
        : provider === 'openai'
          ? process.env.OPENAI_MODEL || 'gpt-4'
          : 'gemini-1.5-flash-latest';

  return registry.languageModel(`${provider}:${model}`);
}
