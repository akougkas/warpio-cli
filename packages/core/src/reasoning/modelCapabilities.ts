/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReasoningCapability {
  supportsThinking: boolean;
  thinkingType: 'native' | 'pattern-based' | 'none';
  provider: 'ollama' | 'lm-studio' | 'gemini' | 'openai-compatible';
  thinkingLevel?: 'low' | 'medium' | 'high';
  thinkingPatterns?: RegExp[];  // Required for pattern-based providers
  defaultBudget?: number;
  streamSeparation: boolean;    // Can separate thinking from response
  nativeApiSupport?: boolean;   // Provider has native thinking API
}

export class WarpioReasoningRegistry {
  private static capabilities = new Map<string, ReasoningCapability>();
  
  static {
    // Ollama reasoning models (Native API support)
    this.register('ollama:gpt-oss:20b', {
      supportsThinking: true,
      thinkingType: 'native',
      provider: 'ollama',
      thinkingLevel: 'high',  // Use 'high' for reasoning models
      nativeApiSupport: true,
      thinkingPatterns: [
        /^<thinking>.*?<\/thinking>/s,
        /^\[REASONING\].*?\[\/REASONING\]/s,
        /^Let me think.*?(?=\n\n)/s
      ],
      defaultBudget: 8192,
      streamSeparation: true
    });
    
    this.register('ollama:deepseek-r1:*', {
      supportsThinking: true,
      thinkingType: 'native',
      provider: 'ollama',
      thinkingLevel: 'high',
      nativeApiSupport: true,
      thinkingPatterns: [/^<think>.*?<\/think>/s],
      defaultBudget: 16384,
      streamSeparation: true
    });
    
    // LM Studio models (Pattern-based detection only)
    this.register('lm-studio:gpt-oss:*', {
      supportsThinking: true,
      thinkingType: 'pattern-based',
      provider: 'lm-studio',
      nativeApiSupport: false,
      thinkingPatterns: [
        /^<thinking>.*?<\/thinking>/s,
        /^\[REASONING\].*?\[\/REASONING\]/s,
        /^Let me think.*?(?=\n\n)/s
      ],
      defaultBudget: 8192,
      streamSeparation: false
    });
  }
  
  static register(modelPattern: string, capability: ReasoningCapability): void {
    this.capabilities.set(modelPattern, capability);
  }
  
  static getCapability(modelId: string): ReasoningCapability | null {
    // Direct match first
    if (this.capabilities.has(modelId)) {
      return this.capabilities.get(modelId)!;
    }
    
    // Pattern matching for wildcards
    for (const [pattern, capability] of this.capabilities.entries()) {
      if (this.matchesPattern(modelId, pattern)) {
        return capability;
      }
    }
    
    return null;
  }
  
  static isThinkingSupported(modelId: string): boolean {
    const capability = this.getCapability(modelId);
    return capability?.supportsThinking ?? false;
  }
  
  static getThinkingType(modelId: string): 'native' | 'pattern-based' | 'none' {
    const capability = this.getCapability(modelId);
    return capability?.thinkingType ?? 'none';
  }
  
  static getThinkingLevel(modelId: string): 'low' | 'medium' | 'high' | undefined {
    const capability = this.getCapability(modelId);
    return capability?.thinkingLevel;
  }
  
  static getThinkingPatterns(modelId: string): RegExp[] {
    const capability = this.getCapability(modelId);
    return capability?.thinkingPatterns ?? [];
  }
  
  static supportsNativeThinking(modelId: string): boolean {
    const capability = this.getCapability(modelId);
    return capability?.nativeApiSupport ?? false;
  }
  
  private static matchesPattern(modelId: string, pattern: string): boolean {
    // Convert simple wildcard patterns to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(modelId);
  }
  
  static getAllSupportedModels(): string[] {
    return Array.from(this.capabilities.keys());
  }
  
  static getDebugInfo(modelId: string): object {
    return {
      modelId,
      capability: this.getCapability(modelId),
      isSupported: this.isThinkingSupported(modelId),
      thinkingType: this.getThinkingType(modelId),
      nativeSupport: this.supportsNativeThinking(modelId)
    };
  }
}