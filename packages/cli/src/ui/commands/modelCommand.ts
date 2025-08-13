/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand } from './types.js';
// Command types only, no need for MessageType in this file

export const modelCommand: SlashCommand = {
  name: 'model',
  kind: CommandKind.BUILT_IN,
  description: 'manage and switch AI models',
  subCommands: [
    {
      name: 'list',
      description: 'list all available models',
      kind: CommandKind.BUILT_IN,
      action: async (_context) => {
        try {
          // Dynamic import to avoid dependency issues if Warpio is unavailable
          const { ModelManager } = await import('@google/gemini-cli-core');
          const modelManager = ModelManager.getInstance();
          await modelManager.listAllModels();
        } catch (_error) {
          console.error('Model discovery unavailable:', _error instanceof Error ? _error.message : String(_error));
          console.log('\nTo configure providers, set these environment variables:');
          console.log('  WARPIO_PROVIDER=lmstudio');
          console.log('  LMSTUDIO_HOST=http://localhost:1234/v1');
          console.log('  LMSTUDIO_MODEL=your-model-name');
        }
      },
    },
    {
      name: 'current',
      altNames: ['status'],
      description: 'show current model and provider status',
      kind: CommandKind.BUILT_IN,
      action: async (_context) => {
        try {
          const { ModelManager } = await import('@google/gemini-cli-core');
          const modelManager = ModelManager.getInstance();
          modelManager.showCurrentStatus();
        } catch (_error) {
          console.error('Model status unavailable:', _error instanceof Error ? _error.message : String(_error));
          const provider = process.env.WARPIO_PROVIDER || 'gemini';
          console.log(`\nCurrent provider: ${provider}`);
        }
      },
    },
    {
      name: 'set',
      description: 'switch to a different model (format: provider::model)',
      kind: CommandKind.BUILT_IN,
      action: async (_context, args) => {
        if (!args) {
          console.log('Usage: /model set <provider::model>');
          console.log('Examples:');
          console.log('  /model set gemini::gemini-2.0-flash');
          console.log('  /model set lmstudio::qwen3-4b');
          console.log('  /model set ollama::llama2');
          return;
        }

        try {
          const { ModelManager } = await import('@google/gemini-cli-core');
          const modelManager = ModelManager.getInstance();
          const result = modelManager.switchToModel(args);
          
          if (!result.success) {
            console.error(`Failed to switch model: ${result.error}`);
          } else {
            console.log('⚠️  Note: Restart the session to use the new model.');
          }
        } catch (_error) {
          console.error('Model switching unavailable:', _error instanceof Error ? _error.message : String(_error));
        }
      },
    },
    {
      name: 'test',
      description: 'test connections to all configured providers',
      kind: CommandKind.BUILT_IN,
      action: async (_context) => {
        try {
          const { ModelManager } = await import('@google/gemini-cli-core');
          const modelManager = ModelManager.getInstance();
          await modelManager.testAllConnections();
        } catch (_error) {
          console.error('Connection testing unavailable:', _error instanceof Error ? _error.message : String(_error));
        }
      },
    },
    {
      name: 'refresh',
      description: 'refresh model cache and show updated information',
      kind: CommandKind.BUILT_IN,
      action: async (_context) => {
        try {
          const { ModelManager } = await import('@google/gemini-cli-core');
          const modelManager = ModelManager.getInstance();
          await modelManager.refreshModels();
        } catch (_error) {
          console.error('Model refresh unavailable:', _error instanceof Error ? _error.message : String(_error));
        }
      },
    }
  ],
  action: async (_context, args) => {
    // Default action when just "/model" is typed
    if (!args) {
      try {
        const { ModelManager } = await import('@google/gemini-cli-core');
        const modelManager = ModelManager.getInstance();
        modelManager.showCurrentStatus();
      } catch (_error) {
        console.log('Model management commands:');
        console.log('  /model current  - show current model status');
        console.log('  /model list     - list all available models');  
        console.log('  /model set      - switch to different model');
        console.log('  /model test     - test provider connections');
        console.log('  /model refresh  - refresh model cache');
      }
    }
  },
};