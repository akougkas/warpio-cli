/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlashCommand, CommandContext, CommandKind } from './types.js';
import {
  ModelDiscoveryService,
  resolveModelAlias,
  parseProviderModel,
} from '@google/gemini-cli-core';
import { MessageType, type HistoryItemInfo } from '../types.js';

let cachedModels:
  | Array<{ provider: string; models: Array<{ id: string; aliases?: string[] }> }>
  | null = null;

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'List or switch AI models',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'list',
      description: 'List all available models',
      kind: CommandKind.BUILT_IN,
      async action(context: CommandContext) {
        const config = context.services.config;
        const { ui } = context;
        
        if (!config) {
          ui.addItem({
            type: MessageType.ERROR,
            text: '❌ Configuration not available',
          }, Date.now());
          return;
        }
        const modelDiscovery = new ModelDiscoveryService();

        try {
          ui.addItem({
            type: MessageType.INFO,
            text: '🤖 Fetching available models...',
          }, Date.now());

          // Get API key from config or environment
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            ui.addItem({
              type: MessageType.INFO,
              text:
                '❌ No API key found. Set GEMINI_API_KEY environment variable.',
            }, Date.now());
            return;
          }

          const allModels = await modelDiscovery.listAllProvidersModels({
            apiKey,
            proxy: config.getProxy(),
          });

          let output = '🤖 **Available AI Models**\n\n';

          for (const [provider, models] of Object.entries(allModels)) {
            if (models.length === 0) {
              output += `📡 **${provider.toUpperCase()}**: No models available\n`;
              continue;
            }

            output += `📡 **${provider.toUpperCase()}** (${models.length} models):\n`;
            for (const model of models) {
              const aliases =
                model.aliases && model.aliases.length > 0
                  ? ` *(${model.aliases.join(', ')})*`
                  : '';
              output += `   • \`${model.id}\`${aliases}\n`;
            }
            output += '\n';
          }

          output += '💡 **Usage Examples:**\n';
          output += '   `/model flash` - Switch to flash model\n';
          output += '   `/model pro` - Switch to pro model\n';
          output += '   `/model openai:gpt-4` - Switch provider and model\n';

          // Cache models for completion
          cachedModels = Object.entries(allModels).map(
            ([provider, models]) => ({
              provider,
              models: models.map((m) => ({ id: m.id, aliases: m.aliases })),
            }),
          );

          ui.addItem({
            type: MessageType.INFO,
            text: output,
          }, Date.now());
        } catch (error) {
          ui.addItem({
            type: MessageType.INFO,
            text: `❌ Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }, Date.now());
        }
      },
    },
  ],
  async action(context: CommandContext, args?: string) {
    const config = context.services.config;
    const { ui } = context;
    
    if (!config) {
      ui.addItem({
        type: MessageType.ERROR,
        text: '❌ Configuration not available',
      }, Date.now());
      return;
    }

    if (!args || args.trim() === '') {
      ui.addItem({
        type: MessageType.INFO,
        text:
          '❓ **Model Command Usage:**\n\n' +
          '`/model list` - List all available models\n' +
          '`/model <name>` - Switch to model (e.g., `/model flash`, `/model pro`)\n' +
          '`/model <provider>:<name>` - Switch provider and model (e.g., `/model openai:gpt-4`)\n\n' +
          `📍 **Current model:** \`${config.getModel()}\` *(${config.getProvider()})*`,
      }, Date.now());
      return;
    }

    const modelInput = args.trim();

    // Handle 'list' subcommand
    if (modelInput === 'list') {
      const listCommand = modelCommand.subCommands?.find(
        (cmd) => cmd.name === 'list',
      );
      if (listCommand?.action) {
        await listCommand.action(context, '');
      }
      return;
    }

    // Handle model switching
    try {
      const { provider, model: modelName } = parseProviderModel(modelInput);
      const resolvedModel = resolveModelAlias(modelName, provider);

      // Update model in config
      config.setModel(resolvedModel);

      // Reset fallback mode when switching models
      config.setFallbackMode(false);

      ui.addItem({
        type: MessageType.INFO,
        text:
          `✅ **Model updated** to \`${resolvedModel}\` *(${provider})*\n\n` +
          'The new model will be used for subsequent conversations.',
      }, Date.now());

      // Optional: Quick validation to ensure model works
      // This is commented out to avoid unnecessary API calls
      // try {
      //   const testResult = await config.getGeminiClient().countTokens('test', resolvedModel);
      //   if (testResult) {
      //     ui.addHistoryItem({
      //       type: 'message',
      //       content: '✅ Model validation successful.',
      //       timestamp: Date.now(),
      //     });
      //   }
      // } catch (validationError) {
      //   ui.addHistoryItem({
      //     type: 'message',
      //     content: `⚠️ Model set but validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`,
      //     timestamp: Date.now(),
      //   });
      // }
    } catch (error) {
      ui.addItem({
        type: MessageType.INFO,
        text:
          `❌ **Failed to switch model:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
          'Check the model name and try again.',
      }, Date.now());
    }
  },
  completion: async (context: CommandContext, currentInput: string) => {
    const parts = currentInput.split(' ');

    if (parts.length <= 1) {
      // Complete subcommands and model names
      const suggestions = ['list'];

      // Add cached model suggestions
      if (cachedModels) {
        for (const providerData of cachedModels) {
          for (const model of providerData.models) {
            // Add full model ID
            suggestions.push(model.id);
            // Add aliases
            if (model.aliases) {
              suggestions.push(...model.aliases);
            }
          }
        }
      } else {
        // Add some common aliases when cache is not available
        suggestions.push('pro', 'flash', 'flash-lite');
      }

      return suggestions;
    }

    return [];
  },
};
