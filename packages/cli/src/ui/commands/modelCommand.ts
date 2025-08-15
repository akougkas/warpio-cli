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
          const { ModelManager } = await import('@google/gemini-cli-core');
          const modelManager = ModelManager.getInstance();
          await modelManager.listAllModels();
        } catch (_error) {
          const errorMsg =
            _error instanceof Error ? _error.message : String(_error);
          return {
            type: 'message',
            content: `Model discovery unavailable: ${errorMsg}\n\nTo configure providers, set these environment variables:\n  WARPIO_PROVIDER=lmstudio\n  LMSTUDIO_HOST=http://localhost:1234/v1\n  LMSTUDIO_MODEL=your-model-name`,
            messageType: 'error',
          };
        }
      },
    },
    {
      name: 'info',
      description: 'show current model and provider status',
      kind: CommandKind.BUILT_IN,
      action: async (_context, args) => {
        try {
          const { ModelManager } = await import('@google/gemini-cli-core');
          const modelManager = ModelManager.getInstance();
          if (args) {
            // Show info for specific model
            await modelManager.showModelInfo(args);
          } else {
            // Show current model status
            modelManager.showCurrentStatus();
          }
        } catch (_error) {
          const errorMsg =
            _error instanceof Error ? _error.message : String(_error);
          const provider = process.env.WARPIO_PROVIDER || 'gemini';
          return {
            type: 'message',
            content: `Model info unavailable: ${errorMsg}\n\nCurrent provider: ${provider}`,
            messageType: 'error',
          };
        }
      },
    },
    {
      name: 'set',
      description: 'switch to a different model',
      kind: CommandKind.BUILT_IN,
      action: async (_context, args) => {
        if (!args) {
          return {
            type: 'message',
            content:
              'Usage: /model set <model_name>\nExamples:\n  /model set qwen3-1.7b\n  /model set qwen3-4b-instruct-2507\n  /model set gemini-2.5-flash',
            messageType: 'info',
          };
        }

        try {
          const { ModelManager } = await import('@google/gemini-cli-core');
          const modelManager = ModelManager.getInstance();
          const result = modelManager.switchToModel(args);

          if (!result.success) {
            return {
              type: 'message',
              content: `Failed to switch model: ${result.error}`,
              messageType: 'error',
            };
          } else {
            return {
              type: 'message',
              content: `✅ Switched to model: ${args}\n⚠️  Note: Restart the session to use the new model.`,
              messageType: 'info',
            };
          }
        } catch (_error) {
          const errorMsg =
            _error instanceof Error ? _error.message : String(_error);
          return {
            type: 'message',
            content: `Model switching unavailable: ${errorMsg}`,
            messageType: 'error',
          };
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
          return {
            type: 'message',
            content: '✅ Model cache refreshed successfully',
            messageType: 'info',
          };
        } catch (_error) {
          const errorMsg =
            _error instanceof Error ? _error.message : String(_error);
          return {
            type: 'message',
            content: `Model refresh unavailable: ${errorMsg}`,
            messageType: 'error',
          };
        }
      },
    },
  ],
  action: async (_context, args) => {
    // Default action when just "/model" is typed
    if (!args) {
      try {
        const { ModelManager } = await import('@google/gemini-cli-core');
        const modelManager = ModelManager.getInstance();
        modelManager.showCurrentStatus();
      } catch (_error) {
        return {
          type: 'message',
          content:
            'Model management commands:\n  /model info     - show current model status\n  /model list     - list all available models\n  /model set      - switch to different model\n  /model refresh  - refresh model cache',
          messageType: 'info',
        };
      }
    }
  },
};
