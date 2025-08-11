/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAICompatibleAdapter } from './openai-base.js';
import { ModelInfo } from '../core/modelDiscovery.js';

interface LMStudioModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
  capabilities?: {
    chat?: boolean;
    completion?: boolean;
    embeddings?: boolean;
  };
}

export class LMStudioAdapter extends OpenAICompatibleAdapter {
  constructor(baseUrl?: string) {
    super({
      baseUrl: baseUrl || process.env.LMSTUDIO_HOST || 'http://localhost:1234/v1',
      apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
      provider: 'lmstudio',
      healthCheckEndpoint: (baseUrl || process.env.LMSTUDIO_HOST || 'http://localhost:1234') + '/v1/models',
    });
  }

  protected transformModels(models: LMStudioModel[]): ModelInfo[] {
    return models
      .filter(model => model.capabilities?.chat !== false)
      .map(model => {
        const aliases = this.getAliasesForModel(model.id);
        
        return {
          id: model.id,
          displayName: this.formatDisplayName(model),
          provider: 'lmstudio',
          aliases,
          description: this.buildDescription(model),
        };
      });
  }

  private formatDisplayName(model: LMStudioModel): string {
    // LM Studio typically returns clean model names
    const name = model.id;
    
    // Extract size info if present in the name
    const sizeMatch = name.match(/(\d+[bB])/);
    if (sizeMatch) {
      return `${name} (${sizeMatch[1].toUpperCase()})`;
    }
    
    return name;
  }

  private buildDescription(model: LMStudioModel): string {
    const parts: string[] = [];
    
    if (model.owned_by) {
      parts.push(`Provider: ${model.owned_by}`);
    }
    
    const capabilities: string[] = [];
    if (model.capabilities?.chat) capabilities.push('Chat');
    if (model.capabilities?.completion) capabilities.push('Completion');
    if (model.capabilities?.embeddings) capabilities.push('Embeddings');
    
    if (capabilities.length > 0) {
      parts.push(`Capabilities: ${capabilities.join(', ')}`);
    }
    
    if (model.created) {
      const date = new Date(model.created * 1000);
      parts.push(`Loaded: ${date.toLocaleTimeString()}`);
    }
    
    return parts.join(' | ');
  }

  private getAliasesForModel(modelId: string): string[] {
    const aliases: string[] = [];
    const lowerModel = modelId.toLowerCase();

    // Map user's specific alias - all sizes use gpt-oss
    if (lowerModel.includes('gpt-oss')) {
      aliases.push('small', 'medium', 'large');
    }

    // Generic aliases based on common patterns
    if (lowerModel.includes('mistral')) {
      aliases.push('mistral');
    } else if (lowerModel.includes('llama')) {
      aliases.push('llama');
    } else if (lowerModel.includes('codellama')) {
      aliases.push('code');
    }

    return aliases;
  }
}