/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAICompatibleAdapter } from './openai-base.js';
import { ModelInfo } from '../core/modelDiscovery.js';
import { WarpioReasoningRegistry } from '../reasoning/index.js';

interface OllamaModel {
  name: string;
  model?: string;
  size?: number;
  parameter_size?: string;
  quantization_level?: string;
  modified_at?: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export class OllamaAdapter extends OpenAICompatibleAdapter {
  constructor(baseUrl?: string) {
    super({
      baseUrl:
        baseUrl || process.env.OLLAMA_HOST || 'http://localhost:11434/v1',
      apiKey: 'ollama', // Ollama doesn't require auth
      provider: 'ollama',
      healthCheckEndpoint:
        (
          baseUrl ||
          process.env.OLLAMA_HOST ||
          'http://localhost:11434'
        ).replace('/v1', '') + '/api/tags',
      modelsEndpoint: '/api/tags',
    });
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!(await this.isServerRunning())) {
      return [];
    }

    try {
      // Use native Ollama API for better model information
      const baseUrl = this.config.baseUrl.replace('/v1', '');
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.transformModels(data.models || []);
    } catch (_error) {
      // Fall back to OpenAI-compatible endpoint
      return super.listModels();
    }
  }

  protected transformModels(models: OllamaModel[]): ModelInfo[] {
    return models.map((model) => {
      const name = model.name || model.model || 'unknown';
      const aliases = this.getAliasesForModel(name);
      const modelId = `ollama:${name}`;
      const supportsThinking =
        WarpioReasoningRegistry.isThinkingSupported(modelId);

      return {
        id: name,
        displayName: this.formatDisplayName(name, model, supportsThinking),
        provider: 'ollama',
        aliases,
        description: this.buildDescription(model, supportsThinking),
      };
    });
  }

  private formatDisplayName(
    name: string,
    model: OllamaModel,
    supportsThinking?: boolean,
  ): string {
    const size = model.details?.parameter_size || model.parameter_size;
    const quant = model.details?.quantization_level || model.quantization_level;

    const parts = [name];

    if (size) parts.push(`(${size})`);
    if (quant) parts.push(`[${quant}]`);
    if (supportsThinking) parts.push(`🧠`); // Thinking indicator

    return parts.join(' ');
  }

  private buildDescription(
    model: OllamaModel,
    supportsThinking?: boolean,
  ): string {
    const parts: string[] = [];

    if (model.details?.family) {
      parts.push(`Family: ${model.details.family}`);
    }

    if (model.size) {
      const sizeInGB = (model.size / 1e9).toFixed(2);
      parts.push(`Size: ${sizeInGB}GB`);
    }

    if (supportsThinking) {
      parts.push(`Thinking: Supported`);
    }

    if (model.modified_at) {
      const date = new Date(model.modified_at);
      parts.push(`Updated: ${date.toLocaleDateString()}`);
    }

    return parts.join(' | ');
  }

  private getAliasesForModel(modelId: string): string[] {
    const aliases: string[] = [];
    const lowerModel = modelId.toLowerCase();

    // ONLY map the exact 3 user-specified aliases - no generic aliases
    if (lowerModel === 'hopephoto/qwen3-4b-instruct-2507_q8:latest') {
      aliases.push('small');
    } else if (lowerModel === 'gpt-oss:20b') {
      aliases.push('medium');
    } else if (lowerModel === 'qwen3-coder:latest') {
      aliases.push('large');
    }

    return aliases;
  }
}
