/**
 * Copyright 2025 IOWarp Team
 * 
 * Test suite for ModelManager - Unified model selection and loading
 * 
 * This test suite validates the core functionality of the new ModelManager
 * architecture, focusing on model parsing and client creation logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelManager } from '../../packages/core/src/core/modelManager.js';

describe('ModelManager', () => {
  let manager: ModelManager;
  
  beforeEach(() => {
    manager = ModelManager.getInstance();
  });

  describe('parseModel', () => {
    it('parses provider::model format correctly', () => {
      const result = manager.parseModel('lmstudio::qwen3-4b@q4_k_m:latest');
      
      expect(result).toEqual({
        provider: 'lmstudio',
        modelName: 'qwen3-4b@q4_k_m:latest',
        originalInput: 'lmstudio::qwen3-4b@q4_k_m:latest'
      });
    });
    
    it('parses ollama provider format', () => {
      const result = manager.parseModel('ollama::llama3:70b');
      
      expect(result).toEqual({
        provider: 'ollama',
        modelName: 'llama3:70b',
        originalInput: 'ollama::llama3:70b'
      });
    });
    
    it('parses gemini provider format', () => {
      const result = manager.parseModel('gemini::gemini-2.5-flash');
      
      expect(result).toEqual({
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        originalInput: 'gemini::gemini-2.5-flash'
      });
    });

    it('handles bare model names as Gemini', () => {
      const result = manager.parseModel('flash');
      
      expect(result).toEqual({
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        originalInput: 'flash'
      });
    });
    
    it('handles bare model names without aliases', () => {
      const result = manager.parseModel('custom-gemini-model');
      
      expect(result).toEqual({
        provider: 'gemini',
        modelName: 'custom-gemini-model',
        originalInput: 'custom-gemini-model'
      });
    });

    it('preserves complex model names with special characters', () => {
      const complexName = 'model-name@version:tag.variant';
      const result = manager.parseModel(`ollama::${complexName}`);
      
      expect(result.modelName).toBe(complexName);
    });
    
    it('handles case insensitive provider names', () => {
      const result = manager.parseModel('LMSTUDIO::model-name');
      
      expect(result.provider).toBe('lmstudio');
    });

    it('resolves Gemini aliases correctly', () => {
      const testCases = [
        { input: 'pro', expected: 'gemini-2.5-pro' },
        { input: 'flash', expected: 'gemini-2.5-flash' },
        { input: 'flash-lite', expected: 'gemini-2.5-flash-lite' },
        { input: 'flash-002', expected: 'gemini-2.0-flash-002' },
        { input: 'flash-thinking', expected: 'gemini-2.0-flash-thinking-exp-1219' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = manager.parseModel(input);
        expect(result.modelName).toBe(expected);
      });
    });

    it('throws error for invalid provider', () => {
      expect(() => {
        manager.parseModel('invalid::model-name');
      }).toThrow('Invalid provider "invalid". Valid providers: gemini, ollama, lmstudio');
    });
    
    it('throws error for empty model name after separator', () => {
      expect(() => {
        manager.parseModel('ollama::');
      }).toThrow('Empty model name after provider separator');
    });
    
    it('throws error for empty input', () => {
      expect(() => {
        manager.parseModel('');
      }).toThrow('Model input must be a non-empty string');
    });
    
    it('throws error for non-string input', () => {
      expect(() => {
        manager.parseModel(null as any);
      }).toThrow('Model input must be a non-empty string');
    });
  });

  describe('validateModelFormat', () => {
    it('validates correct model formats', () => {
      const validFormats = [
        'flash',
        'gemini-2.5-flash',
        'ollama::llama3:70b',
        'lmstudio::qwen3-4b@q4_k_m:latest',
        'gemini::custom-model'
      ];
      
      validFormats.forEach(format => {
        expect(manager.validateModelFormat(format)).toBe(true);
      });
    });
    
    it('invalidates incorrect model formats', () => {
      const invalidFormats = [
        '',
        'invalid::',
        'unknown-provider::model',
        null,
        undefined
      ];
      
      invalidFormats.forEach(format => {
        expect(manager.validateModelFormat(format as any)).toBe(false);
      });
    });
  });

  describe('getProviderInfo', () => {
    it('returns correct Gemini provider info', () => {
      const info = manager.getProviderInfo('gemini');
      
      expect(info).toEqual({
        name: 'Google Gemini',
        type: 'gemini',
        requiresAuth: true,
        envVars: ['GEMINI_API_KEY'],
        defaultModel: 'gemini-2.5-flash'
      });
    });
    
    it('returns correct Ollama provider info', () => {
      const info = manager.getProviderInfo('ollama');
      
      expect(info).toEqual({
        name: 'Ollama',
        type: 'openai',
        requiresAuth: false,
        envVars: ['OLLAMA_HOST'],
        defaultModel: 'qwen3:8b',
        defaultHost: 'http://localhost:11434'
      });
    });
    
    it('returns correct LMStudio provider info', () => {
      const info = manager.getProviderInfo('lmstudio');
      
      expect(info).toEqual({
        name: 'LM Studio',
        type: 'openai',
        requiresAuth: false,
        envVars: ['LMSTUDIO_HOST', 'LMSTUDIO_API_KEY'],
        defaultModel: 'qwen3-4b-instruct-2507@q8_0',
        defaultHost: 'http://localhost:1234'
      });
    });
  });

  describe('singleton behavior', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = ModelManager.getInstance();
      const instance2 = ModelManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});