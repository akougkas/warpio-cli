/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  WarpioReasoningRegistry, 
  WarpioThinkingProcessor, 
  ThinkingStrategyFactory 
} from '../../packages/core/src/reasoning/index.js';

describe('WarpioReasoningRegistry', () => {
  describe('model capability registration', () => {
    it('should recognize gpt-oss:20b as a thinking model', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const isSupported = WarpioReasoningRegistry.isThinkingSupported(modelId);
      const thinkingType = WarpioReasoningRegistry.getThinkingType(modelId);
      
      expect(isSupported).toBe(true);
      expect(thinkingType).toBe('native');
    });

    it('should recognize deepseek-r1 models as thinking models', () => {
      const modelId = 'ollama:deepseek-r1:latest';
      const isSupported = WarpioReasoningRegistry.isThinkingSupported(modelId);
      const thinkingType = WarpioReasoningRegistry.getThinkingType(modelId);
      
      expect(isSupported).toBe(true);
      expect(thinkingType).toBe('native');
    });

    it('should not recognize regular models as thinking models', () => {
      const modelId = 'ollama:llama3:8b';
      const isSupported = WarpioReasoningRegistry.isThinkingSupported(modelId);
      const thinkingType = WarpioReasoningRegistry.getThinkingType(modelId);
      
      expect(isSupported).toBe(false);
      expect(thinkingType).toBe('none');
    });

    it('should support pattern matching for wildcards', () => {
      const modelId = 'ollama:deepseek-r1:32b';
      const capability = WarpioReasoningRegistry.getCapability(modelId);
      
      expect(capability).toBeTruthy();
      expect(capability?.supportsThinking).toBe(true);
      expect(capability?.thinkingType).toBe('native');
    });

    it('should get thinking level for supported models', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const level = WarpioReasoningRegistry.getThinkingLevel(modelId);
      
      expect(level).toBe('high');
    });

    it('should get thinking patterns for supported models', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const patterns = WarpioReasoningRegistry.getThinkingPatterns(modelId);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toBeInstanceOf(RegExp);
    });
  });

  describe('debug and utility functions', () => {
    it('should provide debug info for models', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const debugInfo = WarpioReasoningRegistry.getDebugInfo(modelId);
      
      expect(debugInfo).toHaveProperty('modelId', modelId);
      expect(debugInfo).toHaveProperty('isSupported', true);
      expect(debugInfo).toHaveProperty('thinkingType', 'native');
      expect(debugInfo).toHaveProperty('nativeSupport', true);
    });

    it('should list all supported models', () => {
      const supportedModels = WarpioReasoningRegistry.getAllSupportedModels();
      
      expect(supportedModels.length).toBeGreaterThan(0);
      expect(supportedModels).toContain('ollama:gpt-oss:20b');
    });
  });
});

describe('WarpioThinkingProcessor', () => {
  describe('basic functionality', () => {
    it('should create processor for thinking model', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const processor = new WarpioThinkingProcessor(modelId);
      
      expect(processor).toBeDefined();
      expect(processor.getCapability().supportsThinking).toBe(true);
    });

    it('should create processor for non-thinking model', () => {
      const modelId = 'ollama:llama3:8b';
      const processor = new WarpioThinkingProcessor(modelId);
      
      expect(processor).toBeDefined();
      expect(processor.getCapability().supportsThinking).toBe(false);
    });

    it('should process simple content stream for non-thinking models', async () => {
      const modelId = 'ollama:llama3:8b';
      const processor = new WarpioThinkingProcessor(modelId);
      
      const inputStream = async function* () {
        yield 'Hello ';
        yield 'world!';
      };

      const tokens = [];
      for await (const token of processor.processStream(inputStream())) {
        tokens.push(token);
      }

      expect(tokens.length).toBe(2);
      expect(tokens[0]).toEqual({ type: 'content', text: 'Hello ' });
      expect(tokens[1]).toEqual({ type: 'content', text: 'world!' });
    });

    it('should detect thinking patterns in stream', async () => {
      const modelId = 'ollama:gpt-oss:20b';
      const processor = new WarpioThinkingProcessor(modelId, { 
        timeoutMs: 1000,
        enableDebug: false 
      });
      
      const inputStream = async function* () {
        yield '<thinking>Let me consider this problem</thinking>';
        yield 'The answer is 42.';
      };

      const tokens = [];
      for await (const token of processor.processStream(inputStream())) {
        tokens.push(token);
      }

      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe('thinking');
      expect(tokens[0].text).toBe('<thinking>Let me consider this problem</thinking>');
      expect(tokens[0].metadata?.subject).toBeTruthy();
      expect(tokens[1].type).toBe('content');
      expect(tokens[1].text).toBe('The answer is 42.');
    });

    it('should handle timeout gracefully', async () => {
      const modelId = 'ollama:gpt-oss:20b';
      const processor = new WarpioThinkingProcessor(modelId, { 
        timeoutMs: 100,  // Very short timeout
        enableDebug: false 
      });
      
      const slowStream = async function* () {
        yield 'Starting...';
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 200));
        yield 'This should not be reached';
      };

      const tokens = [];
      for await (const token of processor.processStream(slowStream())) {
        tokens.push(token);
      }

      // Should get at least the first token and handle timeout gracefully
      expect(tokens.length).toBeGreaterThanOrEqual(1);
      expect(tokens[0].type).toBe('content');
      expect(tokens[0].text).toBe('Starting...');
    });
  });

  describe('utility methods', () => {
    it('should provide static thinking support check', () => {
      expect(WarpioThinkingProcessor.isThinkingSupported('ollama:gpt-oss:20b')).toBe(true);
      expect(WarpioThinkingProcessor.isThinkingSupported('ollama:llama3:8b')).toBe(false);
    });

    it('should provide static thinking type check', () => {
      expect(WarpioThinkingProcessor.getThinkingType('ollama:gpt-oss:20b')).toBe('native');
      expect(WarpioThinkingProcessor.getThinkingType('ollama:llama3:8b')).toBe('none');
    });

    it('should track thinking token count', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const processor = new WarpioThinkingProcessor(modelId);
      
      expect(processor.getThinkingTokenCount()).toBe(0);
      
      // Token count is tracked internally during processing
      // This test verifies the getter exists and returns a number
      expect(typeof processor.getThinkingTokenCount()).toBe('number');
    });

    it('should reset processor state', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const processor = new WarpioThinkingProcessor(modelId);
      
      processor.reset();
      expect(processor.getThinkingTokenCount()).toBe(0);
    });
  });
});

describe('ThinkingStrategyFactory', () => {
  describe('strategy selection', () => {
    it('should return OllamaThinkingStrategy for ollama provider', () => {
      const strategy = ThinkingStrategyFactory.getStrategy('ollama');
      expect(strategy.constructor.name).toBe('OllamaThinkingStrategy');
    });

    it('should return LMStudioThinkingStrategy for lm-studio provider', () => {
      const strategy = ThinkingStrategyFactory.getStrategy('lm-studio');
      expect(strategy.constructor.name).toBe('LMStudioThinkingStrategy');
    });

    it('should return GeminiThinkingStrategy for gemini provider', () => {
      const strategy = ThinkingStrategyFactory.getStrategy('gemini');
      expect(strategy.constructor.name).toBe('GeminiThinkingStrategy');
    });

    it('should return LMStudioThinkingStrategy as default fallback', () => {
      const strategy = ThinkingStrategyFactory.getStrategy('unknown-provider');
      expect(strategy.constructor.name).toBe('LMStudioThinkingStrategy');
    });
  });

  describe('configuration utilities', () => {
    it('should configure thinking for supported model', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const provider = 'ollama';
      const options = {};

      ThinkingStrategyFactory.configureThinkingForModel(modelId, provider, options);

      // For Ollama with native support, should add think parameter
      expect(options).toHaveProperty('think');
    });

    it('should not configure thinking for non-thinking model', () => {
      const modelId = 'ollama:llama3:8b';
      const provider = 'ollama';
      const options = {};

      ThinkingStrategyFactory.configureThinkingForModel(modelId, provider, options);

      // Should not add think parameter for non-thinking models
      expect(options).not.toHaveProperty('think');
    });

    it('should provide debug info for model and provider', () => {
      const modelId = 'ollama:gpt-oss:20b';
      const provider = 'ollama';
      
      const debugInfo = ThinkingStrategyFactory.getDebugInfo(modelId, provider);
      
      expect(debugInfo).toHaveProperty('modelId', modelId);
      expect(debugInfo).toHaveProperty('provider', provider);
      expect(debugInfo).toHaveProperty('isSupported', true);
      expect(debugInfo).toHaveProperty('strategy', 'OllamaThinkingStrategy');
    });
  });
});