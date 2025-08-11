/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaAdapter } from '@google/gemini-cli-core/src/adapters/ollama.js';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Warpio Adapters Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OllamaAdapter', () => {
    it('should initialize with correct default configuration', () => {
      const adapter = new OllamaAdapter();
      expect(adapter).toBeDefined();
    });

    it('should initialize with custom base URL', () => {
      const customUrl = 'http://custom-ollama:11434/v1';
      const adapter = new OllamaAdapter(customUrl);
      expect(adapter).toBeDefined();
    });

    it('should handle server health check failure gracefully', async () => {
      const adapter = new OllamaAdapter();
      
      // Mock fetch to fail
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));
      
      const isRunning = await adapter.isServerRunning();
      expect(isRunning).toBe(false);
    });

    it('should return empty models list when server is down', async () => {
      const adapter = new OllamaAdapter();
      
      // Mock server as down
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));
      
      const models = await adapter.listModels();
      expect(models).toEqual([]);
    });

    it('should parse Ollama models correctly', async () => {
      const adapter = new OllamaAdapter();
      
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'llama3:latest',
              size: 4661224384,
              parameter_size: '7B',
              quantization_level: 'Q4_0'
            }
          ]
        })
      };
      
      // Mock successful health check and model fetch
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce(mockResponse as Response);
      
      const models = await adapter.listModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('llama3:latest');
      expect(models[0].provider).toBe('ollama');
    });

    it('should generate correct aliases for known models', async () => {
      const adapter = new OllamaAdapter();
      
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [
            { name: 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest' },
            { name: 'gpt-oss:20b' },
            { name: 'qwen3-coder:latest' }
          ]
        })
      };
      
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce(mockResponse as Response);
      
      const models = await adapter.listModels();
      
      const smallModel = models.find(m => m.id === 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest');
      const mediumModel = models.find(m => m.id === 'gpt-oss:20b');
      const largeModel = models.find(m => m.id === 'qwen3-coder:latest');
      
      expect(smallModel?.aliases).toContain('small');
      expect(mediumModel?.aliases).toContain('medium');
      expect(largeModel?.aliases).toContain('large');
    });
  });

  describe('Provider Health Monitoring', () => {
    it('should validate credentials correctly', async () => {
      const adapter = new OllamaAdapter();
      
      // Mock successful health check
      vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
      
      const isValid = await adapter.validateCredentials();
      expect(isValid).toBe(true);
    });

    it('should handle network timeouts gracefully', async () => {
      const adapter = new OllamaAdapter();
      
      // Mock timeout
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      const isRunning = await adapter.isServerRunning();
      expect(isRunning).toBe(false);
    });
  });
});