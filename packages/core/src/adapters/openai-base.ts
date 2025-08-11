/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import { ProviderAdapter, ModelInfo } from '../core/modelDiscovery.js';

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  provider: string;
  healthCheckEndpoint?: string;
  modelsEndpoint?: string;
}

export abstract class OpenAICompatibleAdapter implements ProviderAdapter {
  protected config: OpenAICompatibleConfig;
  protected client: OpenAI;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: false,
    });
  }

  async isServerRunning(): Promise<boolean> {
    try {
      const endpoint =
        this.config.healthCheckEndpoint || `${this.config.baseUrl}/models`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!(await this.isServerRunning())) {
      return [];
    }

    try {
      const models = await this.client.models.list();
      return this.transformModels(models.data);
    } catch (_error) {
      // Return empty array on error - provider is unavailable
      return [];
    }
  }

  async validateCredentials(): Promise<boolean> {
    return this.isServerRunning();
  }

  protected abstract transformModels(models: unknown[]): ModelInfo[];
}
