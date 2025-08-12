/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { GeminiClient } from './client.js';
import { UnifiedLocalClient } from './unifiedLocalClient.js';
import { ModelDiscoveryService } from './modelDiscovery.js';
import {
  getProviderConfig,
  isLocalProvider,
} from '../config/models.js';
import { 
  LocalProvider,
  ProviderDetector,
  createLocalProvider
} from './providers/index.js';

export type ModelClient = GeminiClient | UnifiedLocalClient;

export class ClientFactory {
  private static discoveryService = new ModelDiscoveryService();

  static async createClient(
    config: Config,
    model: string,
    systemPrompt?: string,
  ): Promise<ModelClient> {
    // Check if this is a local model using our unified detection
    if (this.discoveryService.isLocalModel(model)) {
      return this.createUnifiedLocalClient(config, model, systemPrompt);
    } else {
      return this.createGeminiClient(config, model);
    }
  }

  private static async createUnifiedLocalClient(
    config: Config,
    model: string,
    systemPrompt?: string,
  ): Promise<UnifiedLocalClient> {
    // Use model discovery to find optimal provider
    const provider = await this.discoveryService.getOptimalProvider(model);
    
    if (!provider) {
      const detectedProvider = this.discoveryService.detectProvider(model);
      throw new Error(
        `No ${detectedProvider} provider available for model ${model}. ` +
        `Please ensure ${detectedProvider} server is running.`
      );
    }

    // Create config with system prompt if provided
    const clientConfig = { ...config };
    if (systemPrompt) {
      clientConfig.systemPrompt = systemPrompt;
    }

    // Create and initialize the unified client
    const client = new UnifiedLocalClient(clientConfig, provider);
    await client.initialize();

    // Verify the client is working
    const isHealthy = await client.checkHealth();
    if (!isHealthy) {
      throw new Error(
        `${provider.name} server is not responding. Please check the server status.`
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

  /**
   * Create provider from configuration for advanced use cases
   */
  static createProviderFromConfig(
    providerName: string,
    model: string,
    options: {
      baseUrl?: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): LocalProvider {
    return createLocalProvider(providerName, model, options);
  }

  /**
   * Get discovery service for external use
   */
  static getDiscoveryService(): ModelDiscoveryService {
    return this.discoveryService;
  }
}
