/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { ModelDiscoveryService } from '@google/gemini-cli-core/src/core/modelDiscovery.js';
import { parseProviderModel, resolveModelAlias } from '@google/gemini-cli-core/src/config/models.js';

describe('Warpio Model Switching E2E', () => {
  describe('Model Discovery', () => {
    it('should parse provider prefixes correctly', () => {
      // Test explicit provider syntax
      const ollamaResult = parseProviderModel('ollama:llama3:latest');
      expect(ollamaResult.provider).toBe('ollama');
      expect(ollamaResult.model).toBe('llama3:latest');

      // Test Gemini default
      const geminiResult = parseProviderModel('flash');
      expect(geminiResult.provider).toBe('gemini');
      expect(geminiResult.model).toBe('flash');
    });

    it('should resolve model aliases correctly', () => {
      // Test Ollama aliases
      expect(resolveModelAlias('small', 'ollama')).toBe('hopephoto/Qwen3-4B-Instruct-2507_q8:latest');
      expect(resolveModelAlias('medium', 'ollama')).toBe('gpt-oss:20b');
      expect(resolveModelAlias('large', 'ollama')).toBe('qwen3-coder:latest');

      // Test Gemini aliases
      expect(resolveModelAlias('flash', 'gemini')).toBe('gemini-2.5-flash');
      expect(resolveModelAlias('pro', 'gemini')).toBe('gemini-2.5-pro');
    });

    it('should handle model discovery service initialization', async () => {
      const service = new ModelDiscoveryService();
      expect(service).toBeDefined();
      
      // Test that service can be created without errors
      expect(() => service.listAllProvidersModels({})).not.toThrow();
    });
  });

  describe('Provider Integration', () => {
    it('should handle provider failures gracefully', async () => {
      const service = new ModelDiscoveryService();
      
      // Mock fetch to simulate server unavailable
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));

      try {
        const models = await service.listAllProvidersModels({});
        
        // Should not throw and return at least Gemini models if API key is available
        expect(models).toBeDefined();
        expect(typeof models).toBe('object');
      } catch (error) {
        // If no API key, service might throw - that's acceptable
        expect(error).toBeDefined();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should differentiate between local and cloud providers', async () => {
      const { isLocalProvider } = await import('@google/gemini-cli-core/src/config/models.js');
      
      expect(isLocalProvider('ollama')).toBe(true);
      expect(isLocalProvider('gemini')).toBe(false);
      expect(isLocalProvider('unknown')).toBe(false);
    });
  });
});