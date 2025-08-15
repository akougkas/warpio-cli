/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Warpio Persona Slash Command
 * Uses standard Gemini CLI slash command infrastructure
 */

// Define minimal types needed for slash commands
// These match the CLI layer's SlashCommand interface
interface SlashCommand {
  name: string;
  kind: string;
  description: string;
  subCommands?: SlashCommand[];
  action?: (context: unknown, args?: string) => 
    | void 
    | { type: 'message'; messageType: 'info' | 'error'; content: string }
    | Promise<void | { type: 'message'; messageType: 'info' | 'error'; content: string }>;
}

/**
 * Creates the persona slash command that can be registered with the CLI
 */
export function createPersonaSlashCommand(): SlashCommand | null {
  try {
    return {
      name: 'persona',
      kind: 'BUILT_IN',
      description: 'manage and switch Warpio personas',
      subCommands: [
        {
          name: 'list',
          kind: 'BUILT_IN',
          description: 'list available experts',
          action: async () => {
            const { WarpioPersonaManager } = await import('../manager.js');
            const manager = WarpioPersonaManager.getInstance();
            const personas = manager.listPersonas();

            let content = '\n🎭 Available Experts:\n';
            personas.forEach((name) => {
              const persona = manager.getPersona(name);
              if (persona) {
                content += `  • ${name} - ${persona.description}\n`;
              }
            });

            return {
              type: 'message',
              content,
              messageType: 'info',
            };
          },
        },
        {
          name: 'help',
          kind: 'BUILT_IN',
          description: 'explain persona flow and available experts',
          action: async () => {
            const { WarpioPersonaManager } = await import('../manager.js');
            const manager = WarpioPersonaManager.getInstance();
            const personas = manager.listPersonas();

            let content =
              '\n🎭 Warpio Persona System\n\nPersonas are specialized AI experts for different scientific computing tasks.\n\n📋 Available Experts:\n';

            personas.forEach((name) => {
              const persona = manager.getPersona(name);
              if (persona) {
                content += `  • ${name} - ${persona.description}\n`;
              }
            });

            content += '\n💡 Usage:\n';
            content +=
              '  /persona list                    # List all experts\n';
            content +=
              '  /persona <expert-name>           # Switch to expert\n';
            content += '  /persona help                    # Show this help\n';
            content += '\n🚀 Command Line:\n';
            content += '  npx warpio --persona <expert> -p "your task"\n';

            return {
              type: 'message',
              content,
              messageType: 'info',
            };
          },
        },
      ],

      // Handle direct persona switching: /persona <name>
      action: async (_context, args) => {
        if (!args || args.length === 0) {
          return {
            type: 'message',
            content: 'Usage: /persona <expert-name> | list | help\n\nPersona commands:\n  /persona list     - List available experts\n  /persona help     - Explain persona system\n  /persona <name>   - Switch to expert',
            messageType: 'info',
          };
        }

        const command = typeof args === 'string' ? args.split(' ')[0] : args[0];

        // If it's a known subcommand, let it handle
        if (command === 'list' || command === 'help') {
          return;
        }

        // Otherwise treat as persona name for direct switching
        const { WarpioPersonaManager } = await import('../manager.js');
        const manager = WarpioPersonaManager.getInstance();

        const personaName = args;
        const success = await manager.activatePersona(personaName);

        if (success) {
          return {
            type: 'message',
            content: `✅ Activated expert: ${personaName}\n🔄 Note: Restart the session to use the new persona.`,
            messageType: 'info',
          };
        } else {
          return {
            type: 'message',
            content: `❌ Expert '${personaName}' not found\n\nUse /persona list to see available experts`,
            messageType: 'error',
          };
        }
      },
    };
  } catch {
    // If Warpio system is unavailable, return null so command isn't registered
    return null;
  }
}