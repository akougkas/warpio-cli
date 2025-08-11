# Implementation Plan: Local AI Model Support (Ollama + LM Studio)

## Overview

Adding production-ready support for local AI models (Ollama and LM Studio) to Warpio CLI, enabling true LLM-agnostic operation. This plan extends the existing provider architecture to support local model servers while maintaining upstream compatibility.

## Architecture Overview

### Current State

- **Provider System**: Extensible `ProviderAdapter` interface
- **Model Discovery**: `ModelDiscoveryService` with provider registry
- **Configuration**: Provider-prefixed syntax (`ollama:llama3`)
- **Alias System**: Provider-specific model aliases

### Target Architecture

```
User Input → Model Selection → Provider Resolution → API Adapter
                                         ↓
                             [Gemini | Ollama | LMStudio]
                                         ↓
                              Local/Cloud Model Execution
```

## Step-by-Step Implementation

### Phase 1: Core Provider Infrastructure

#### Step 1: Create Base OpenAI Adapter

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/adapters/openai-base.ts`
**Operation**: Create

```typescript
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
    } catch (error) {
      console.debug(`Failed to list ${this.config.provider} models:`, error);
      return [];
    }
  }

  async validateCredentials(): Promise<boolean> {
    return this.isServerRunning();
  }

  protected abstract transformModels(models: any[]): ModelInfo[];
}
```

#### Step 2: Implement Ollama Adapter

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/adapters/ollama.ts`
**Operation**: Create

```typescript
/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAICompatibleAdapter } from './openai-base.js';
import { ModelInfo } from '../core/modelDiscovery.js';

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
    } catch (error) {
      console.debug('Failed to list Ollama models:', error);
      // Fall back to OpenAI-compatible endpoint
      return super.listModels();
    }
  }

  protected transformModels(models: OllamaModel[]): ModelInfo[] {
    return models.map((model) => {
      const name = model.name || model.model || 'unknown';
      const aliases = this.getAliasesForModel(name);

      return {
        id: name,
        displayName: this.formatDisplayName(name, model),
        provider: 'ollama',
        aliases,
        description: this.buildDescription(model),
      };
    });
  }

  private formatDisplayName(name: string, model: OllamaModel): string {
    const size = model.details?.parameter_size || model.parameter_size;
    const quant = model.details?.quantization_level || model.quantization_level;

    if (size || quant) {
      const parts = [name];
      if (size) parts.push(`(${size})`);
      if (quant) parts.push(`[${quant}]`);
      return parts.join(' ');
    }

    return name;
  }

  private buildDescription(model: OllamaModel): string {
    const parts: string[] = [];

    if (model.details?.family) {
      parts.push(`Family: ${model.details.family}`);
    }

    if (model.size) {
      const sizeInGB = (model.size / 1e9).toFixed(2);
      parts.push(`Size: ${sizeInGB}GB`);
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

    // Map user's specific aliases
    if (
      lowerModel.includes('hopephoto/qwen3-4b') ||
      lowerModel.includes('qwen3-4b')
    ) {
      aliases.push('small');
    } else if (lowerModel.includes('gpt-oss:20b')) {
      aliases.push('medium');
    } else if (lowerModel.includes('qwen3-coder')) {
      aliases.push('large');
    }

    // Generic size aliases based on parameter count
    if (lowerModel.includes('3b') || lowerModel.includes('4b')) {
      if (!aliases.includes('small')) aliases.push('small');
    } else if (lowerModel.includes('7b') || lowerModel.includes('8b')) {
      if (!aliases.includes('medium')) aliases.push('medium');
    } else if (
      lowerModel.includes('13b') ||
      lowerModel.includes('20b') ||
      lowerModel.includes('30b')
    ) {
      if (!aliases.includes('large')) aliases.push('large');
    } else if (lowerModel.includes('70b') || lowerModel.includes('180b')) {
      aliases.push('xlarge');
    }

    return aliases;
  }
}
```

#### Step 3: Implement LM Studio Adapter

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/adapters/lmstudio.ts`
**Operation**: Create

```typescript
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
      baseUrl:
        baseUrl || process.env.LMSTUDIO_HOST || 'http://localhost:1234/v1',
      apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
      provider: 'lmstudio',
      healthCheckEndpoint:
        (baseUrl || process.env.LMSTUDIO_HOST || 'http://localhost:1234') +
        '/v1/models',
    });
  }

  protected transformModels(models: LMStudioModel[]): ModelInfo[] {
    return models
      .filter((model) => {
        // Only include chat-capable models
        return model.capabilities?.chat !== false;
      })
      .map((model) => {
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
```

### Phase 2: Client Integration

#### Step 4: Create Local Model Client

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/core/localClient.ts`
**Operation**: Create

```typescript
/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import { Content, GenerateContentStreamResult } from '@google/genai';
import { Config } from '../config/config.js';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface LocalModelConfig {
  provider: 'ollama' | 'lmstudio';
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class LocalModelClient {
  private client: OpenAI;
  private config: LocalModelConfig;
  private conversationHistory: ChatCompletionMessageParam[] = [];

  constructor(config: Config, modelConfig: LocalModelConfig) {
    this.config = modelConfig;
    this.client = new OpenAI({
      baseURL: modelConfig.baseUrl,
      apiKey: modelConfig.apiKey,
      dangerouslyAllowBrowser: false,
    });

    // Initialize with system prompt if provided
    if (modelConfig.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: modelConfig.systemPrompt,
      });
    }
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          ...this.conversationHistory,
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content || '';

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: response },
      );

      return response;
    } catch (error) {
      throw new Error(
        `Local model error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async generateContentStream(prompt: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        ...this.conversationHistory,
        { role: 'user', content: prompt },
      ],
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens,
      stream: true,
    });

    const fullResponse: string[] = [];

    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse.push(content);
            yield content;
          }
        }

        // Update history after streaming completes
        this.conversationHistory.push(
          { role: 'user', content: prompt },
          { role: 'assistant', content: fullResponse.join('') },
        );
      },
    };
  }

  // Convert from Gemini format to OpenAI format
  convertHistory(geminiHistory: Content[]): void {
    this.conversationHistory = [
      // Keep system prompt if exists
      ...this.conversationHistory.filter((msg) => msg.role === 'system'),
      // Convert Gemini history
      ...(geminiHistory
        .map((content) => this.convertMessage(content))
        .filter(Boolean) as ChatCompletionMessageParam[]),
    ];
  }

  private convertMessage(content: Content): ChatCompletionMessageParam | null {
    if (!content.parts || content.parts.length === 0) return null;

    const textParts = content.parts
      .filter((part) => 'text' in part)
      .map((part) => (part as any).text)
      .join('\n');

    if (!textParts) return null;

    return {
      role: content.role === 'model' ? 'assistant' : 'user',
      content: textParts,
    };
  }

  getHistory(): ChatCompletionMessageParam[] {
    return this.conversationHistory;
  }

  setHistory(history: ChatCompletionMessageParam[]): void {
    this.conversationHistory = history;
  }

  clearHistory(): void {
    // Keep system prompt if exists
    this.conversationHistory = this.conversationHistory.filter(
      (msg) => msg.role === 'system',
    );
  }

  isHealthy(): Promise<boolean> {
    return this.client.models
      .list()
      .then(() => true)
      .catch(() => false);
  }
}
```

#### Step 5: Update Model Discovery Service

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/core/modelDiscovery.ts`
**Operation**: Modify

```typescript
// Add imports at the top
import { OllamaAdapter } from '../adapters/ollama.js';
import { LMStudioAdapter } from '../adapters/lmstudio.js';

// Update constructor in ModelDiscoveryService class (lines 100-102)
constructor() {
  this.adapters.set('gemini', new GeminiAdapter());
  this.adapters.set('ollama', new OllamaAdapter());
  this.adapters.set('lmstudio', new LMStudioAdapter());
}

// Update listAllProvidersModels method (lines 117-138)
async listAllProvidersModels(config: {
  apiKey?: string;
  proxy?: string;
}): Promise<Record<string, ModelInfo[]>> {
  const results: Record<string, ModelInfo[]> = {};

  // Gemini models (requires API key)
  if (config.apiKey) {
    try {
      results.gemini = await this.listAvailableModels(
        'gemini',
        config.apiKey,
        config.proxy,
      );
    } catch (_error) {
      results.gemini = [];
    }
  }

  // Local models (no API key required)
  try {
    const ollamaAdapter = this.adapters.get('ollama') as OllamaAdapter;
    results.ollama = await ollamaAdapter.listModels();
  } catch (_error) {
    results.ollama = [];
  }

  try {
    const lmStudioAdapter = this.adapters.get('lmstudio') as LMStudioAdapter;
    results.lmstudio = await lmStudioAdapter.listModels();
  } catch (_error) {
    results.lmstudio = [];
  }

  return results;
}
```

### Phase 3: Configuration Management

#### Step 6: Update Model Configuration

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/config/models.ts`
**Operation**: Modify

```typescript
// Update PROVIDER_ALIASES (lines 14-23)
export const PROVIDER_ALIASES = {
  gemini: {
    pro: 'models/gemini-2.0-flash-exp',
    flash: DEFAULT_GEMINI_FLASH_MODEL,
    'flash-lite': DEFAULT_GEMINI_FLASH_LITE_MODEL,
  },
  ollama: {
    small: 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest',
    medium: 'gpt-oss:20b',
    large: 'qwen3-coder:latest',
  },
  lmstudio: {
    small: 'gpt-oss',
    medium: 'gpt-oss',
    large: 'gpt-oss',
  },
} as const;

// Add local provider detection
export function isLocalProvider(provider: string): boolean {
  return provider === 'ollama' || provider === 'lmstudio';
}

// Add provider configuration helper
export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  requiresAuth: boolean;
  isLocal: boolean;
}

export function getProviderConfig(provider: SupportedProvider): ProviderConfig {
  switch (provider) {
    case 'ollama':
      return {
        baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434/v1',
        apiKey: 'ollama',
        requiresAuth: false,
        isLocal: true,
      };
    case 'lmstudio':
      return {
        baseUrl: process.env.LMSTUDIO_HOST || 'http://localhost:1234/v1',
        apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
        requiresAuth: false,
        isLocal: true,
      };
    case 'gemini':
    default:
      return {
        requiresAuth: true,
        isLocal: false,
      };
  }
}
```

#### Step 7: Create Settings Schema

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/config/localProviders.ts`
**Operation**: Create

```typescript
/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LocalProviderSettings {
  ollama?: {
    host?: string;
    models?: Record<string, string>; // alias -> model mapping
    defaultModel?: string;
    timeout?: number;
  };
  lmstudio?: {
    host?: string;
    apiKey?: string;
    models?: Record<string, string>;
    defaultModel?: string;
    timeout?: number;
  };
}

export const DEFAULT_LOCAL_SETTINGS: LocalProviderSettings = {
  ollama: {
    host: 'http://localhost:11434',
    timeout: 30000,
    models: {
      small: 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest',
      medium: 'gpt-oss:20b',
      large: 'qwen3-coder:latest',
    },
  },
  lmstudio: {
    host: 'http://localhost:1234',
    apiKey: 'lm-studio',
    timeout: 30000,
    models: {
      default: 'gpt-oss',
    },
  },
};

// Load settings from environment or config file
export function loadLocalProviderSettings(): LocalProviderSettings {
  const settings: LocalProviderSettings = { ...DEFAULT_LOCAL_SETTINGS };

  // Override with environment variables
  if (process.env.OLLAMA_HOST) {
    settings.ollama!.host = process.env.OLLAMA_HOST;
  }

  if (process.env.LMSTUDIO_HOST) {
    settings.lmstudio!.host = process.env.LMSTUDIO_HOST;
  }

  if (process.env.LMSTUDIO_API_KEY) {
    settings.lmstudio!.apiKey = process.env.LMSTUDIO_API_KEY;
  }

  // TODO: Load from ~/.warpio/settings.json

  return settings;
}
```

### Phase 4: CLI Integration

#### Step 8: Update CLI Model Command

**File**: `/mnt/nfs/develop/warpio-cli/packages/cli/src/commands/model.ts`
**Operation**: Modify existing slash command handler

```typescript
// Add local provider handling to the model list command

// In the listModels function, add:
async function listModels(config: Config): Promise<void> {
  const discoveryService = new ModelDiscoveryService();

  // Check for local providers first
  const localProviders = ['ollama', 'lmstudio'];
  const localResults: Record<string, ModelInfo[]> = {};

  for (const provider of localProviders) {
    try {
      const models = await discoveryService.listAvailableModels(
        provider,
        'dummy', // Local providers don't need API key
      );
      if (models.length > 0) {
        localResults[provider] = models;
      }
    } catch (error) {
      console.debug(`${provider} not available:`, error);
    }
  }

  // Then check Gemini if API key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const geminiModels = await discoveryService.listAvailableModels(
        'gemini',
        apiKey,
        config.getProxy(),
      );
      if (geminiModels.length > 0) {
        localResults.gemini = geminiModels;
      }
    } catch (error) {
      console.debug('Gemini models not available:', error);
    }
  }

  // Display results
  if (Object.keys(localResults).length === 0) {
    console.log('No models available. Please ensure:');
    console.log('  - Ollama is running (ollama serve)');
    console.log('  - LM Studio server is started');
    console.log('  - GEMINI_API_KEY is set for Gemini models');
    return;
  }

  // Format and display models by provider
  for (const [provider, models] of Object.entries(localResults)) {
    console.log(`\n${provider.toUpperCase()} Models:`);
    for (const model of models) {
      const aliases = model.aliases?.length
        ? ` (aliases: ${model.aliases.join(', ')})`
        : '';
      console.log(`  - ${model.id}${aliases}`);
      if (model.description) {
        console.log(`    ${model.description}`);
      }
    }
  }
}
```

#### Step 9: Update Client Factory

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/core/clientFactory.ts`
**Operation**: Create

```typescript
/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { GeminiClient } from './client.js';
import { LocalModelClient, LocalModelConfig } from './localClient.js';
import {
  parseProviderModel,
  getProviderConfig,
  isLocalProvider,
} from '../config/models.js';
import { ContentGeneratorConfig } from './contentGenerator.js';

export type ModelClient = GeminiClient | LocalModelClient;

export class ClientFactory {
  static async createClient(
    config: Config,
    model: string,
    systemPrompt?: string,
  ): Promise<ModelClient> {
    const { provider, model: modelName } = parseProviderModel(model);

    if (isLocalProvider(provider)) {
      return this.createLocalClient(config, provider, modelName, systemPrompt);
    } else {
      return this.createGeminiClient(config, modelName);
    }
  }

  private static async createLocalClient(
    config: Config,
    provider: 'ollama' | 'lmstudio',
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
          provider ===
        'ollama'
          ? '  ollama serve'
          : '  Open LM Studio and start the server',
      );
    }

    return client;
  }

  private static async createGeminiClient(
    config: Config,
    model: string,
  ): Promise<GeminiClient> {
    const client = new GeminiClient(config);
    const contentConfig: ContentGeneratorConfig = {
      model,
      // ... other Gemini-specific config
    };
    await client.initialize(contentConfig);
    return client;
  }
}
```

### Phase 5: Error Handling & UX

#### Step 10: Create Provider Health Monitor

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/services/providerHealth.ts`
**Operation**: Create

```typescript
/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { OllamaAdapter } from '../adapters/ollama.js';
import { LMStudioAdapter } from '../adapters/lmstudio.js';

export interface ProviderStatus {
  provider: string;
  available: boolean;
  models?: string[];
  error?: string;
  hint?: string;
}

export class ProviderHealthMonitor {
  private static instance: ProviderHealthMonitor;
  private statusCache = new Map<string, ProviderStatus>();
  private lastCheck = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  static getInstance(): ProviderHealthMonitor {
    if (!this.instance) {
      this.instance = new ProviderHealthMonitor();
    }
    return this.instance;
  }

  async checkAllProviders(): Promise<ProviderStatus[]> {
    const now = Date.now();

    // Return cached results if recent
    if (now - this.lastCheck < this.CACHE_TTL && this.statusCache.size > 0) {
      return Array.from(this.statusCache.values());
    }

    const statuses: ProviderStatus[] = [];

    // Check Ollama
    const ollamaStatus = await this.checkOllama();
    statuses.push(ollamaStatus);
    this.statusCache.set('ollama', ollamaStatus);

    // Check LM Studio
    const lmStudioStatus = await this.checkLMStudio();
    statuses.push(lmStudioStatus);
    this.statusCache.set('lmstudio', lmStudioStatus);

    // Check Gemini
    const geminiStatus = await this.checkGemini();
    statuses.push(geminiStatus);
    this.statusCache.set('gemini', geminiStatus);

    this.lastCheck = now;
    return statuses;
  }

  private async checkOllama(): Promise<ProviderStatus> {
    try {
      const adapter = new OllamaAdapter();
      const models = await adapter.listModels();

      if (models.length === 0) {
        return {
          provider: 'ollama',
          available: false,
          error: 'No models installed',
          hint: 'Install models with: ollama pull llama3',
        };
      }

      return {
        provider: 'ollama',
        available: true,
        models: models.map((m) => m.id),
      };
    } catch (error) {
      return {
        provider: 'ollama',
        available: false,
        error: 'Server not running',
        hint: 'Start Ollama with: ollama serve',
      };
    }
  }

  private async checkLMStudio(): Promise<ProviderStatus> {
    try {
      const adapter = new LMStudioAdapter();
      const models = await adapter.listModels();

      return {
        provider: 'lmstudio',
        available: models.length > 0,
        models: models.map((m) => m.id),
        error: models.length === 0 ? 'No models loaded' : undefined,
        hint: models.length === 0 ? 'Load a model in LM Studio UI' : undefined,
      };
    } catch (error) {
      return {
        provider: 'lmstudio',
        available: false,
        error: 'Server not running',
        hint: 'Start server in LM Studio (⚡ button)',
      };
    }
  }

  private async checkGemini(): Promise<ProviderStatus> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        provider: 'gemini',
        available: false,
        error: 'No API key',
        hint: 'Set GEMINI_API_KEY environment variable',
      };
    }

    // Could do actual API check here
    return {
      provider: 'gemini',
      available: true,
    };
  }

  async getProviderStatus(provider: string): Promise<ProviderStatus | null> {
    // Check cache first
    const cached = this.statusCache.get(provider);
    if (cached && Date.now() - this.lastCheck < this.CACHE_TTL) {
      return cached;
    }

    // Refresh specific provider
    switch (provider) {
      case 'ollama':
        return this.checkOllama();
      case 'lmstudio':
        return this.checkLMStudio();
      case 'gemini':
        return this.checkGemini();
      default:
        return null;
    }
  }

  clearCache(): void {
    this.statusCache.clear();
    this.lastCheck = 0;
  }
}
```

#### Step 11: Add Graceful Fallback

**File**: `/mnt/nfs/develop/warpio-cli/packages/cli/src/utils/modelFallback.ts`
**Operation**: Create

```typescript
/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '@warpio/core';
import { ProviderHealthMonitor } from '@warpio/core/services/providerHealth';
import { parseProviderModel } from '@warpio/core/config/models';

export interface FallbackOptions {
  preferLocal?: boolean;
  silent?: boolean;
}

export class ModelFallbackService {
  private static readonly FALLBACK_CHAIN = [
    'ollama:llama3',
    'lmstudio:gpt-oss',
    'gemini:flash',
  ];

  static async findAvailableModel(
    requestedModel: string,
    config: Config,
    options: FallbackOptions = {},
  ): Promise<string | null> {
    const health = ProviderHealthMonitor.getInstance();
    const { provider } = parseProviderModel(requestedModel);

    // Check if requested model's provider is available
    const status = await health.getProviderStatus(provider);
    if (status?.available) {
      return requestedModel;
    }

    if (!options.silent) {
      console.warn(`⚠️  ${provider} is not available: ${status?.error}`);
      if (status?.hint) {
        console.log(`    ${status.hint}`);
      }
      console.log('    Checking for alternative providers...');
    }

    // Try fallback chain
    for (const fallbackModel of this.FALLBACK_CHAIN) {
      const { provider: fallbackProvider } = parseProviderModel(fallbackModel);

      // Skip if we already tried this provider
      if (fallbackProvider === provider) continue;

      const fallbackStatus = await health.getProviderStatus(fallbackProvider);
      if (fallbackStatus?.available) {
        if (!options.silent) {
          console.log(`✓ Using ${fallbackProvider} as fallback`);
        }
        return fallbackModel;
      }
    }

    // No providers available
    if (!options.silent) {
      console.error('\n❌ No AI providers available. Please set up one of:');
      console.log('  • Ollama: ollama serve');
      console.log('  • LM Studio: Start server in app');
      console.log('  • Gemini: export GEMINI_API_KEY=your-key');
    }

    return null;
  }

  static async ensureModelAvailable(
    model: string,
    config: Config,
  ): Promise<string> {
    const available = await this.findAvailableModel(model, config);

    if (!available) {
      throw new Error(
        'No AI models available. Please ensure at least one provider is running.',
      );
    }

    return available;
  }
}
```

### Phase 6: Testing Strategy

#### Step 12: Create Integration Tests

**File**: `/mnt/nfs/develop/warpio-cli/packages/core/src/adapters/ollama.test.ts`
**Operation**: Create

```typescript
/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaAdapter } from './ollama.js';

describe('OllamaAdapter', () => {
  let adapter: OllamaAdapter;

  beforeEach(() => {
    adapter = new OllamaAdapter();
    vi.clearAllMocks();
  });

  describe('isServerRunning', () => {
    it('should return true when server is accessible', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const result = await adapter.isServerRunning();
      expect(result).toBe(true);
    });

    it('should return false when server is not accessible', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await adapter.isServerRunning();
      expect(result).toBe(false);
    });

    it('should timeout after 3 seconds', async () => {
      global.fetch = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5000)),
        );

      const result = await adapter.isServerRunning();
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should return empty array when server is not running', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const models = await adapter.listModels();
      expect(models).toEqual([]);
    });

    it('should transform Ollama models correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'llama3:8b',
              size: 4_500_000_000,
              details: {
                parameter_size: '8B',
                quantization_level: 'Q4_0',
              },
            },
          ],
        }),
      });

      const models = await adapter.listModels();
      expect(models).toHaveLength(1);
      expect(models[0]).toMatchObject({
        id: 'llama3:8b',
        provider: 'ollama',
        displayName: expect.stringContaining('8B'),
      });
    });

    it('should assign correct aliases', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest' },
            { name: 'gpt-oss:20b' },
            { name: 'qwen3-coder:latest' },
          ],
        }),
      });

      const models = await adapter.listModels();

      const smallModel = models.find((m) => m.id.includes('Qwen3-4B'));
      expect(smallModel?.aliases).toContain('small');

      const mediumModel = models.find((m) => m.id.includes('gpt-oss:20b'));
      expect(mediumModel?.aliases).toContain('medium');

      const largeModel = models.find((m) => m.id.includes('qwen3-coder'));
      expect(largeModel?.aliases).toContain('large');
    });
  });
});
```

#### Step 13: Create E2E Test Suite

**File**: `/mnt/nfs/develop/warpio-cli/test/e2e/local-models.test.ts`
**Operation**: Create

```typescript
/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { OllamaAdapter } from '@warpio/core/adapters/ollama';
import { LMStudioAdapter } from '@warpio/core/adapters/lmstudio';

describe('Local Model Integration', () => {
  const isOllamaAvailable = async () => {
    try {
      const adapter = new OllamaAdapter();
      return await adapter.isServerRunning();
    } catch {
      return false;
    }
  };

  const isLMStudioAvailable = async () => {
    try {
      const adapter = new LMStudioAdapter();
      return await adapter.isServerRunning();
    } catch {
      return false;
    }
  };

  describe('Ollama Integration', () => {
    it('should list models when Ollama is running', async () => {
      const available = await isOllamaAvailable();
      if (!available) {
        console.log('Skipping: Ollama not running');
        return;
      }

      const output = execSync('warpio --model list', { encoding: 'utf-8' });
      expect(output).toContain('OLLAMA Models:');
    });

    it('should execute query with Ollama model', async () => {
      const available = await isOllamaAvailable();
      if (!available) {
        console.log('Skipping: Ollama not running');
        return;
      }

      const output = execSync(
        'warpio -m ollama:llama3 -p "Say hello in one word"',
        { encoding: 'utf-8', timeout: 30000 },
      );
      expect(output.toLowerCase()).toMatch(/hello|hi|hey/);
    });

    it('should use alias for model selection', async () => {
      const available = await isOllamaAvailable();
      if (!available) {
        console.log('Skipping: Ollama not running');
        return;
      }

      const output = execSync('warpio -m ollama:small -p "What is 2+2?"', {
        encoding: 'utf-8',
        timeout: 30000,
      });
      expect(output).toMatch(/4|four/i);
    });
  });

  describe('LM Studio Integration', () => {
    it('should list models when LM Studio is running', async () => {
      const available = await isLMStudioAvailable();
      if (!available) {
        console.log('Skipping: LM Studio not running');
        return;
      }

      const output = execSync('warpio --model list', { encoding: 'utf-8' });
      expect(output).toContain('LMSTUDIO Models:');
    });

    it('should execute query with LM Studio model', async () => {
      const available = await isLMStudioAvailable();
      if (!available) {
        console.log('Skipping: LM Studio not running');
        return;
      }

      const output = execSync(
        'warpio -m lmstudio:gpt-oss -p "Complete: The sky is"',
        { encoding: 'utf-8', timeout: 30000 },
      );
      expect(output.toLowerCase()).toMatch(/blue|clear|grey/);
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to available provider', async () => {
      // Try to use a non-existent provider
      const output = execSync('warpio -m invalid:model -p "test" 2>&1', {
        encoding: 'utf-8',
      });

      // Should fallback to any available provider
      expect(output).toMatch(/Using .* as fallback/);
    });

    it('should show helpful error when no providers available', async () => {
      // This test would require mocking all providers as unavailable
      // Skip in real environment
    });
  });
});
```

### Phase 7: Documentation

#### Step 14: Create User Documentation

**File**: `/mnt/nfs/develop/warpio-cli/docs/warpio/local-models.md`
**Operation**: Create

````markdown
# Local AI Models in Warpio CLI

Warpio CLI supports running AI models locally through Ollama and LM Studio, providing privacy, cost savings, and offline capabilities.

## Quick Start

### Ollama

1. **Install Ollama**: https://ollama.ai
2. **Start server**: `ollama serve`
3. **Pull a model**: `ollama pull llama3`
4. **Use in Warpio**: `warpio -m ollama:llama3 -p "Your query"`

### LM Studio

1. **Install LM Studio**: https://lmstudio.ai
2. **Load a model** in the UI
3. **Start server** (⚡ button)
4. **Use in Warpio**: `warpio -m lmstudio:gpt-oss -p "Your query"`

## Model Selection

### Direct Model Names

```bash
# Ollama models
warpio -m ollama:llama3:8b
warpio -m ollama:mistral:latest
warpio -m ollama:codellama:13b

# LM Studio models
warpio -m lmstudio:gpt-oss
warpio -m lmstudio:mistral-7b-instruct
```
````

### Using Aliases

```bash
# Size-based aliases
warpio -m ollama:small   # Uses Qwen3-4B
warpio -m ollama:medium  # Uses gpt-oss:20b
warpio -m ollama:large   # Uses qwen3-coder

# All LM Studio sizes use gpt-oss
warpio -m lmstudio:small
warpio -m lmstudio:medium
warpio -m lmstudio:large
```

### List Available Models

```bash
# List all available models across providers
warpio --model list

# Output example:
OLLAMA Models:
  - llama3:8b (aliases: medium)
  - mistral:7b (aliases: mistral, medium)
  - qwen3-coder:latest (aliases: large)

LMSTUDIO Models:
  - gpt-oss (aliases: small, medium, large)
```

## Configuration

### Environment Variables

```bash
# Custom Ollama endpoint
export OLLAMA_HOST=http://192.168.1.100:11434

# Custom LM Studio endpoint
export LMSTUDIO_HOST=http://localhost:8080
export LMSTUDIO_API_KEY=custom-key  # If authentication enabled
```

### Settings File

Create `~/.warpio/settings.json`:

```json
{
  "providers": {
    "ollama": {
      "host": "http://localhost:11434",
      "defaultModel": "llama3:8b",
      "aliases": {
        "small": "llama3:3b",
        "medium": "llama3:8b",
        "large": "llama3:70b"
      }
    },
    "lmstudio": {
      "host": "http://localhost:1234",
      "apiKey": "lm-studio",
      "defaultModel": "gpt-oss"
    }
  }
}
```

## Automatic Fallback

Warpio automatically falls back to available providers:

```bash
# If Ollama isn't running, falls back to LM Studio or Gemini
warpio -m ollama:llama3 -p "Hello"
# Output: ⚠️ ollama is not available: Server not running
#         ✓ Using lmstudio as fallback
```

## Provider Health Check

Check which providers are available:

```bash
warpio --check-providers

# Output:
✓ Ollama: Running (3 models available)
✗ LM Studio: Not running (hint: Start server in LM Studio)
✓ Gemini: API key configured
```

## Performance Tips

### Ollama

- **Pre-load models**: `ollama run llama3` keeps model in memory
- **GPU acceleration**: Automatic if CUDA/Metal available
- **Quantization**: Use Q4 models for speed vs Q8 for quality

### LM Studio

- **GPU offloading**: Configure in model settings
- **Context length**: Adjust based on available RAM
- **Batch size**: Increase for better throughput

## Troubleshooting

### Ollama Issues

```bash
# Check if running
curl http://localhost:11434/api/tags

# View logs
journalctl -u ollama -f

# List loaded models
ollama list
```

### LM Studio Issues

- Ensure server is started (⚡ button green)
- Check firewall isn't blocking port 1234
- Verify model is loaded in UI

### Connection Errors

```bash
# Test Ollama connection
warpio --test-provider ollama

# Test LM Studio connection
warpio --test-provider lmstudio

# Use verbose mode for debugging
warpio -m ollama:llama3 -p "test" --debug
```

## Privacy & Security

Local models provide:

- **Complete privacy**: No data leaves your machine
- **No API costs**: Run unlimited queries
- **Offline operation**: Works without internet
- **Data sovereignty**: Full control over your data

## Model Recommendations

### For Code

- **Ollama**: `codellama:13b`, `deepseek-coder:6.7b`
- **LM Studio**: `Code-Llama-13B-Instruct`

### For General Use

- **Small (4-7B)**: Fast responses, lower quality
- **Medium (13-20B)**: Balanced performance
- **Large (30B+)**: Best quality, slower

### For Scientific Computing

- **Ollama**: `qwen3-coder:latest` (optimized for technical tasks)
- **LM Studio**: Models with scientific training data

## Integration with Personas

Local models work seamlessly with Warpio personas:

```bash
# Use data-expert persona with local model
warpio --persona data-expert -m ollama:large analyze_data.py

# Research persona with LM Studio
warpio --persona research-expert -m lmstudio:gpt-oss query
```

## Advanced Usage

### Streaming Responses

```bash
# Real-time streaming with local models
warpio -m ollama:llama3 --stream -p "Explain quantum computing"
```

### Custom System Prompts

```bash
# Override persona prompt with local model
warpio -m ollama:mistral --system "You are a pirate" -p "Hello"
```

### Model Chaining

```bash
# Start with fast model, refine with better model
warpio -m ollama:small -p "Draft a function" | \
warpio -m ollama:large -p "Improve this code"
```

````

#### Step 15: Update Main Documentation

**File**: `/mnt/nfs/develop/warpio-cli/docs/warpio/models.md`
**Operation**: Modify to include local provider information

Add new section:

```markdown
## Local AI Providers

Warpio supports running models locally for privacy and cost savings:

### Ollama
- **Setup**: Install from https://ollama.ai
- **Usage**: `warpio -m ollama:llama3`
- **Models**: Any Ollama-compatible model
- **Aliases**: small, medium, large

### LM Studio
- **Setup**: Install from https://lmstudio.ai
- **Usage**: `warpio -m lmstudio:gpt-oss`
- **Models**: Any GGUF format model
- **API**: OpenAI-compatible

See [Local Models Guide](./local-models.md) for detailed setup.
````

## Testing Plan

### Unit Tests

1. **Adapter Tests**: Mock HTTP responses, verify model transformation
2. **Discovery Tests**: Test provider detection and model listing
3. **Fallback Tests**: Verify graceful degradation
4. **Config Tests**: Environment variable and settings loading

### Integration Tests

1. **Provider Availability**: Check actual server connections
2. **Model Execution**: Run simple queries with each provider
3. **Alias Resolution**: Verify size-based aliases work
4. **Error Handling**: Test offline scenarios

### E2E Tests

1. **Full Workflow**: From CLI to model response
2. **Persona Integration**: Test with different personas
3. **MCP Compatibility**: Ensure tools work with local models
4. **Performance**: Measure response times

## Implementation Phases

### Phase 1: Core Infrastructure (2-3 days)

- [ ] Base OpenAI adapter
- [ ] Ollama adapter implementation
- [ ] LM Studio adapter implementation
- [ ] Model discovery integration

### Phase 2: Client Integration (2 days)

- [ ] Local model client
- [ ] Client factory updates
- [ ] Provider configuration

### Phase 3: CLI Updates (1-2 days)

- [ ] Model command enhancements
- [ ] Provider health checks
- [ ] Fallback logic

### Phase 4: Testing (2 days)

- [ ] Unit test suite
- [ ] Integration tests
- [ ] E2E validation

### Phase 5: Documentation (1 day)

- [ ] User guide
- [ ] API documentation
- [ ] Troubleshooting guide

## Success Criteria

1. **Seamless Integration**: `warpio -m ollama:llama3` works out of the box
2. **Automatic Fallback**: Gracefully handles unavailable providers
3. **Model Discovery**: `warpio --model list` shows all available models
4. **Alias Support**: Size-based aliases work across providers
5. **Error Messages**: Clear, actionable error messages
6. **Performance**: Local models respond within reasonable time
7. **Documentation**: Complete guide for setup and usage

## Dependencies to Add

```json
{
  "dependencies": {
    "openai": "^4.0.0"
  }
}
```

## Environment Variables

```bash
# Ollama configuration
OLLAMA_HOST=http://localhost:11434

# LM Studio configuration
LMSTUDIO_HOST=http://localhost:1234
LMSTUDIO_API_KEY=lm-studio

# Provider preferences
WARPIO_PREFER_LOCAL=true
WARPIO_FALLBACK_CHAIN=ollama,lmstudio,gemini
```

## Potential Challenges

1. **OpenAI SDK Compatibility**: May need adjustments for local providers
2. **Streaming Support**: Different providers handle streaming differently
3. **Model Naming**: Inconsistent naming conventions across providers
4. **Context Length**: Local models have varying context limits
5. **Performance**: Local models may be slower than cloud

## Future Enhancements

1. **Model Caching**: Pre-load frequently used models
2. **Multi-GPU Support**: Distribute large models
3. **Quantization Options**: Let users choose precision
4. **Model Downloads**: Auto-download missing models
5. **Provider Plugins**: Extensible provider system
6. **Response Caching**: Cache common queries locally
7. **Model Benchmarking**: Built-in performance testing
