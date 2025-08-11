/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { OllamaAdapter } from '../adapters/ollama.js';
// import { LMStudioAdapter } from '../adapters/lmstudio.js'; // Temporarily disabled

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

    // Check LM Studio - temporarily disabled
    // const lmStudioStatus = await this.checkLMStudio();
    // statuses.push(lmStudioStatus);
    // this.statusCache.set('lmstudio', lmStudioStatus);

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
        models: models.map(m => m.id),
      };
    } catch {
      return {
        provider: 'ollama',
        available: false,
        error: 'Server not running',
        hint: 'Start Ollama with: ollama serve',
      };
    }
  }

  // private async checkLMStudio(): Promise<ProviderStatus> {
  //   try {
  //     const adapter = new LMStudioAdapter();
  //     const models = await adapter.listModels();
      
  //     return {
  //       provider: 'lmstudio',
  //       available: models.length > 0,
  //       models: models.map((m: any) => m.id),
  //       error: models.length === 0 ? 'No models loaded' : undefined,
  //       hint: models.length === 0 ? 'Load a model in LM Studio UI' : undefined,
  //     };
  //   } catch {
  //     return {
  //       provider: 'lmstudio',
  //       available: false,
  //       error: 'Server not running',
  //       hint: 'Start server in LM Studio (⚡ button)',
  //     };
  //   }
  // }

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
      // case 'lmstudio': // Temporarily disabled
      //   return this.checkLMStudio();
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