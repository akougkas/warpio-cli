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
    }, 10000); // Set timeout to 10 seconds for this test
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
