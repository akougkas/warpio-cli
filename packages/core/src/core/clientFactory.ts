/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { GeminiClient } from './client.js';
import { LocalModelClient, LocalModelConfig } from './localClient.js';
import { LMStudioModelClient, LMStudioConfig } from './lmstudioClient.js';
import {
  parseProviderModel,
  getProviderConfig,
  isLocalProvider,
} from '../config/models.js';

export type ModelClient = GeminiClient | LocalModelClient | LMStudioModelClient;

export class ClientFactory {
  static async createClient(
    config: Config,
    model: string,
    systemPrompt?: string,
  ): Promise<ModelClient> {
    // Use provider information from config - it has already been parsed
    const provider = config.getProvider();
    const modelName = model; // Model name without provider prefix

    if (isLocalProvider(provider)) {
      if (provider === 'ollama') {
        return this.createLocalClient(
          config,
          provider as 'ollama',
          modelName,
          systemPrompt,
        );
      } else if (provider === 'lmstudio') {
        return this.createLMStudioClient(
          config,
          modelName,
          systemPrompt,
        );
      } else {
        throw new Error(`Provider ${provider} is not supported`);
      }
    } else {
      return this.createGeminiClient(config, modelName);
    }
  }

  private static async createLocalClient(
    config: Config,
    provider: 'ollama',
    model: string,
    systemPrompt?: string,
  ): Promise<LocalModelClient> {
    const providerConfig = getProviderConfig(provider);

    if (!providerConfig.baseUrl) {
      throw new Error(`No base URL configured for ${provider}`);
    }

    const localConfig: LocalModelConfig = {
      provider,
      baseUrl: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey || '',
      model,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    };

    const client = new LocalModelClient(config, localConfig);

    // Verify the server is running
    const isHealthy = await client.isHealthy();
    if (!isHealthy) {
      throw new Error(
        `${provider} server is not running. Please start it with: ollama serve`,
      );
    }

    return client;
  }

  private static async createLMStudioClient(
    config: Config,
    model: string,
    systemPrompt?: string,
  ): Promise<LMStudioModelClient> {
    const providerConfig = getProviderConfig('lmstudio');

    if (!providerConfig.baseUrl) {
      throw new Error('No base URL configured for LM Studio');
    }

    const lmStudioConfig: LMStudioConfig = {
      baseUrl: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey || 'lm-studio',
      model,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    };

    const client = new LMStudioModelClient(config, lmStudioConfig);

    // Verify the server is running
    const isHealthy = await client.validateConnection();
    if (!isHealthy) {
      throw new Error(
        'LM Studio server is not running. Please start it from LM Studio application.',
      );
    }

    return client;
  }

  private static async createGeminiClient(
    config: Config,
    _model: string,
  ): Promise<GeminiClient> {
    const client = new GeminiClient(config);
    // Note: ContentGeneratorConfig creation and initialization will be handled
    // by the calling code (refreshAuth method) to maintain proper auth context
    return client;
  }
}
