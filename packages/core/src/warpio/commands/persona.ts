/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Warpio Persona Slash Command
 * Integrates with the CLI slash command system
 */

// We'll need to import the proper types, but for now let's define what we need
export interface WarpioPersonaSlashCommand {
  name: string;
  kind: string;
  description: string;
  subCommands?: WarpioPersonaSlashCommand[];
  action?: (context: unknown, args?: string[]) => Promise<void> | void;
}

/**
 * Creates the persona slash command that can be registered with the CLI
 */
export function createPersonaSlashCommand(): WarpioPersonaSlashCommand | null {
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

            console.log('\n🎭 Available Experts:');
            personas.forEach((name) => {
              const persona = manager.getPersona(name);
              if (persona) {
                console.log(`  • ${name}`);
              }
            });
            console.log('');
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

            console.log('\n🎭 Warpio Persona System');
            console.log(
              '\nPersonas are specialized AI experts for different scientific computing tasks.\n',
            );

            console.log('📋 Available Experts:');
            personas.forEach((name) => {
              const persona = manager.getPersona(name);
              if (persona) {
                console.log(`  • ${name} - ${persona.description}`);
              }
            });

            console.log('\n💡 Usage:');
            console.log(
              '  /persona list                    # List all experts',
            );
            console.log(
              '  /persona <expert-name>           # Switch to expert',
            );
            console.log('  /persona help                    # Show this help');

            console.log('\n🚀 Command Line:');
            console.log('  npx warpio --persona <expert> -p "your task"');
            console.log('');
          },
        },
      ],

      // Handle direct persona switching: /persona <name>
      action: async (_context, args) => {
        if (!args || args.length === 0) {
          console.log('Usage: /persona <expert-name> | list | help');
          return;
        }

        const command = args[0];

        // If it's a known subcommand, let it handle
        if (command === 'list' || command === 'help') {
          return;
        }

        // Otherwise treat as persona name for direct switching
        const { WarpioPersonaManager } = await import('../manager.js');
        const manager = WarpioPersonaManager.getInstance();

        console.log(`🔄 Switching to: ${command}...`);
        const success = await manager.activatePersona(command);

        if (success) {
          console.log(`✅ Activated expert: ${command}`);
        } else {
          console.log(`❌ Expert '${command}' not found`);
          console.log('\nUse /persona list to see available experts');
        }
      },
    };
  } catch {
    // If Warpio system is unavailable, return null so command isn't registered
    return null;
  }
}
