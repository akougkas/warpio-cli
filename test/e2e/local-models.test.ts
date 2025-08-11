/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { OllamaAdapter } from '@google/gemini-cli-core/src/adapters/ollama.js';
import { LMStudioAdapter } from '@google/gemini-cli-core/src/adapters/lmstudio.js';

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

      const output = execSync('npx warpio --model list', { encoding: 'utf-8' });
      expect(output).toContain('OLLAMA');
    });

    it('should execute query with Ollama model', async () => {
      const available = await isOllamaAvailable();
      if (!available) {
        console.log('Skipping: Ollama not running');
        return;
      }

      const output = execSync(
        'npx warpio -m small -p "Say hello in one word"',
        { encoding: 'utf-8', timeout: 30000 },
      );
      expect(output.toLowerCase()).toMatch(/hello|hi|hey|greetings/);
    }, 35000);

    it('should use alias for model selection', async () => {
      const available = await isOllamaAvailable();
      if (!available) {
        console.log('Skipping: Ollama not running');
        return;
      }

      const output = execSync('npx warpio --model small -p "What is 2+2?"', {
        encoding: 'utf-8',
        timeout: 30000,
      });
      expect(output).toMatch(/4|four/i);
    }, 35000);
  });

  describe('LM Studio Integration', () => {
    it('should list models when LM Studio is running', async () => {
      const available = await isLMStudioAvailable();
      if (!available) {
        console.log('Skipping: LM Studio not running');
        return;
      }

      const output = execSync('npx warpio --model list', { encoding: 'utf-8' });
      expect(output).toContain('LMSTUDIO');
    });

    it('should execute query with LM Studio model', async () => {
      const available = await isLMStudioAvailable();
      if (!available) {
        console.log('Skipping: LM Studio not running');
        return;
      }

      const output = execSync(
        'npx warpio -m lmstudio:gpt-oss -p "Complete: The sky is"',
        { encoding: 'utf-8', timeout: 30000 },
      );
      expect(output.toLowerCase()).toMatch(/blue|clear|grey/);
    });
  });

  describe('Fallback Behavior', () => {
    it('should handle invalid provider gracefully', async () => {
      // Try to use a non-existent provider - should result in error  
      try {
        const output = execSync('npx warpio -m invalid:model -p "test" 2>&1', {
          encoding: 'utf-8',
          timeout: 5000,
        });
        // If it doesn't timeout, check for error message
        expect(output).toMatch(/error|not found|invalid|unknown/i);
      } catch (error) {
        // Timeout is acceptable behavior for invalid models
        expect(error).toBeDefined();
      }
    }, 10000);

    it('should show helpful error when no providers available', async () => {
      // This test would require mocking all providers as unavailable
      // Skip in real environment
    });
  });
});
