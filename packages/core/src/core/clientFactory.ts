/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { GeminiClient } from './client.js';
import { LocalModelClient, LocalModelConfig } from './localClient.js';
import { parseProviderModel, getProviderConfig, isLocalProvider } from '../config/models.js';
import { ContentGeneratorConfig } from './contentGenerator.js';

export type ModelClient = GeminiClient | LocalModelClient;

export class ClientFactory {
  static async createClient(
    config: Config,
    model: string,
    systemPrompt?: string,
  ): Promise<ModelClient> {
    // First check if we already know this is a local provider model
    // (this will be called from refreshAuth which has already determined the provider)
    
    // For now, assume local models are ollama since that's what's working
    // TODO: Make this more robust by passing provider information from caller
    
    // Try to determine provider by checking available models
    let provider = 'gemini';
    let modelName = model;
    
    // Parse provider prefix if present
    const parsed = parseProviderModel(model);
    if (isLocalProvider(parsed.provider)) {
      provider = parsed.provider;
      modelName = parsed.model;
    } else {
      // Check model discovery to see if this model belongs to a local provider
      try {
        const { ModelDiscoveryService } = await import('./modelDiscovery.js');
        const modelDiscovery = new ModelDiscoveryService();
        const allModels = await modelDiscovery.listAllProvidersModels({});
        
        for (const [providerName, models] of Object.entries(allModels)) {
          const foundModel = models.find(m => m.id === model || (m.aliases && m.aliases.includes(model)));
          if (foundModel && isLocalProvider(foundModel.provider)) {
            provider = foundModel.provider;
            modelName = foundModel.id; // Use the actual model ID, not the alias
            break;
          }
        }
      } catch (error) {
        console.debug(`Failed to discover model provider in ClientFactory: ${error}`);
      }
    }
    
    if (isLocalProvider(provider)) {
      if (provider === 'ollama') {
        return this.createLocalClient(config, provider as 'ollama', modelName, systemPrompt);
      } else {
        throw new Error(`Provider ${provider} is temporarily disabled`);
      }
    } else {
      return this.createGeminiClient(config, modelName);
    }
  }

  private static async createLocalClient(
    config: Config,
    provider: 'ollama', // | 'lmstudio', // LM Studio temporarily disabled
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
        `${provider} server is not running. Please start it with:\n` +
        provider === 'ollama' 
          ? '  ollama serve' 
          : '  Open LM Studio and start the server'
      );
    }

    return client;
  }

  private static async createGeminiClient(
    config: Config,
    model: string,
  ): Promise<GeminiClient> {
    const client = new GeminiClient(config);
    // Note: ContentGeneratorConfig creation and initialization will be handled 
    // by the calling code (refreshAuth method) to maintain proper auth context
    return client;
  }
}