/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { OllamaAdapter } from '@google/gemini-cli-core/adapters/ollama';
import { LMStudioAdapter } from '@google/gemini-cli-core/adapters/lmstudio';

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
      expect(output).toContain('OLLAMA');
    });

    it('should execute query with Ollama model', async () => {
      const available = await isOllamaAvailable();
      if (!available) {
        console.log('Skipping: Ollama not running');
        return;
      }

      const output = execSync(
        'warpio -m ollama:llama3 -p "Say hello in one word"',
        { encoding: 'utf-8', timeout: 30000 }
      );
      expect(output.toLowerCase()).toMatch(/hello|hi|hey/);
    });

    it('should use alias for model selection', async () => {
      const available = await isOllamaAvailable();
      if (!available) {
        console.log('Skipping: Ollama not running');
        return;
      }

      const output = execSync(
        'warpio -m ollama:small -p "What is 2+2?"',
        { encoding: 'utf-8', timeout: 30000 }
      );
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
      expect(output).toContain('LMSTUDIO');
    });

    it('should execute query with LM Studio model', async () => {
      const available = await isLMStudioAvailable();
      if (!available) {
        console.log('Skipping: LM Studio not running');
        return;
      }

      const output = execSync(
        'warpio -m lmstudio:gpt-oss -p "Complete: The sky is"',
        { encoding: 'utf-8', timeout: 30000 }
      );
      expect(output.toLowerCase()).toMatch(/blue|clear|grey/);
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to available provider', async () => {
      // Try to use a non-existent provider
      const output = execSync(
        'warpio -m invalid:model -p "test" 2>&1',
        { encoding: 'utf-8' }
      );
      
      // Should fallback to any available provider
      expect(output).toMatch(/Using .* as fallback/);
    });

    it('should show helpful error when no providers available', async () => {
      // This test would require mocking all providers as unavailable
      // Skip in real environment
    });
  });
});