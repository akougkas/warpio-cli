/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { GeminiClient } from './client.js';
// ELIMINATED: UnifiedLocalClient replaced by ModelManager
// ELIMINATED: ModelDiscoveryService functionality moved to ModelManager
// ELIMINATED: Provider classes replaced by adapters
import { ModelManager, BaseClient } from './modelManager.js';

// Unified client type - all clients implement BaseClient interface
export type ModelClient = BaseClient;

/**
 * ClientFactory - Transitioning to use ModelManager
 * 
 * This factory is being updated to use the new ModelManager architecture
 * while maintaining backward compatibility with existing code.
 */
export class ClientFactory {
  private static modelManager = ModelManager.getInstance();

  /**
   * Create client using ModelManager architecture
   * ELIMINATED: Legacy fallback removed - pure ModelManager approach
   */
  static async createClient(
    config: Config,
    model: string,
    systemPrompt?: string,
  ): Promise<ModelClient> {
    return await this.createClientWithModelManager(config, model, systemPrompt);
  }

  /**
   * NEW: Create client using ModelManager (preferred approach)
   */
  private static async createClientWithModelManager(
    config: Config,
    model: string,
    systemPrompt?: string,
  ): Promise<BaseClient> {
    // Parse model using ModelManager
    const parsedModel = this.modelManager.parseModel(model);
    
    // Add system prompt to config if provided
    if (systemPrompt) {
      config.systemPrompt = systemPrompt;
    }
    
    // Create client using ModelManager
    const client = await this.modelManager.createClient(parsedModel, config);
    
    // Verify client health
    const isHealthy = await client.checkHealth();
    if (!isHealthy) {
      throw new Error(
        `${parsedModel.provider} client is not healthy. ` +
        `Please check ${parsedModel.provider} server status.`
      );
    }
    
    return client;
  }

  /**
   * ELIMINATED: Legacy methods removed - use ModelManager instead
   */
  
  // ELIMINATED: All legacy provider creation methods have been removed
  // Use ModelManager.getInstance().createClient() for all model types
  
  /**
   * NEW: Get ModelManager instance for external use
   */
  static getModelManager(): ModelManager {
    return this.modelManager;
  }
}
