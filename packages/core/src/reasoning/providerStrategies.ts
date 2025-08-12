/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReasoningCapability, WarpioReasoningRegistry } from './modelCapabilities.js';
import { ThinkingToken, WarpioThinkingProcessor } from './thinkingProcessor.js';

export interface ThinkingStrategy {
  configureRequest(options: any, capability: ReasoningCapability): void;
  processStream(stream: AsyncIterable<string>, modelId: string): AsyncIterable<ThinkingToken>;
}

export class OllamaThinkingStrategy implements ThinkingStrategy {
  configureRequest(options: any, capability: ReasoningCapability): void {
    // Ollama native API support - set the think parameter
    if (capability.supportsThinking && capability.nativeApiSupport) {
      // Use the thinking level or default to true for native support
      options.think = capability.thinkingLevel || true;
      
      // Set timeout to prevent hanging
      if (!options.timeout) {
        options.timeout = 30000; // 30s timeout for reasoning models
      }
    }
  }
  
  async *processStream(
    stream: AsyncIterable<string>, 
    modelId: string
  ): AsyncIterable<ThinkingToken> {
    // Ollama includes thinking in stream, use processor to extract
    const processor = new WarpioThinkingProcessor(modelId, {
      timeoutMs: 30000,  // 30s timeout to prevent GPT-OSS:20b hanging
      enableDebug: false  // Set to true for debugging
    });
    
    yield* processor.processStream(stream);
  }
}

export class LMStudioThinkingStrategy implements ThinkingStrategy {
  configureRequest(options: any, capability: ReasoningCapability): void {
    // LM Studio has no native support - rely on pattern detection only
    // No special configuration needed, but we can set timeout
    if (!options.timeout) {
      options.timeout = 30000; // 30s timeout
    }
  }
  
  async *processStream(
    stream: AsyncIterable<string>, 
    modelId: string
  ): AsyncIterable<ThinkingToken> {
    // LM Studio requires pure pattern-based detection
    const processor = new WarpioThinkingProcessor(modelId, {
      timeoutMs: 30000,  // 30s timeout
      enableDebug: false
    });
    
    yield* processor.processStream(stream);
  }
}

export class GeminiThinkingStrategy implements ThinkingStrategy {
  configureRequest(options: any, capability: ReasoningCapability): void {
    // Gemini uses existing thinking configuration
    // This will integrate with existing Gemini thinking support
    if (capability.supportsThinking) {
      // Use existing Gemini thinking configuration patterns
      options.thinkingConfig = {
        includeThoughts: true,
        thinkingBudget: capability.defaultBudget ?? 8192
      };
    }
  }
  
  async *processStream(
    stream: AsyncIterable<string>, 
    modelId: string
  ): AsyncIterable<ThinkingToken> {
    // For Gemini, we'd integrate with existing thinking stream processing
    // For now, pass through (existing Gemini handling will work)
    for await (const chunk of stream) {
      yield { type: 'content', text: chunk };
    }
  }
}

export class ThinkingStrategyFactory {
  static getStrategy(provider: string): ThinkingStrategy {
    switch (provider.toLowerCase()) {
      case 'ollama':
        return new OllamaThinkingStrategy();
      case 'lm-studio':
      case 'lmstudio':
        return new LMStudioThinkingStrategy();
      case 'gemini':
        return new GeminiThinkingStrategy();
      default:
        // Default to LM Studio strategy for OpenAI-compatible providers
        return new LMStudioThinkingStrategy();
    }
  }
  
  static configureThinkingForModel(
    modelId: string, 
    provider: string, 
    options: any
  ): void {
    const capability = WarpioReasoningRegistry.getCapability(modelId);
    if (!capability?.supportsThinking) {
      return; // No thinking support, no configuration needed
    }
    
    const strategy = this.getStrategy(provider);
    strategy.configureRequest(options, capability);
  }
  
  static async *processThinkingStream(
    stream: AsyncIterable<string>,
    modelId: string, 
    provider: string
  ): AsyncIterable<ThinkingToken> {
    const capability = WarpioReasoningRegistry.getCapability(modelId);
    if (!capability?.supportsThinking) {
      // No thinking support, pass through as content
      for await (const chunk of stream) {
        yield { type: 'content', text: chunk };
      }
      return;
    }
    
    const strategy = this.getStrategy(provider);
    yield* strategy.processStream(stream, modelId);
  }
  
  // Debug utilities
  static getDebugInfo(modelId: string, provider: string): object {
    const capability = WarpioReasoningRegistry.getCapability(modelId);
    const strategy = this.getStrategy(provider);
    
    return {
      modelId,
      provider,
      capability,
      strategy: strategy.constructor.name,
      isSupported: capability?.supportsThinking ?? false,
      thinkingType: capability?.thinkingType ?? 'none',
      nativeSupport: capability?.nativeApiSupport ?? false
    };
  }
}