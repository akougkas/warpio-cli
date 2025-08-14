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
          description: 'list all available personas',
          action: async () => {
            const { WarpioPersonaManager } = await import('../manager.js');
            const manager = WarpioPersonaManager.getInstance();
            const personas = manager.listPersonas();
            
            console.log('\n🎭 Available Personas:');
            personas.forEach(name => {
              const persona = manager.getPersona(name);
              if (persona) {
                console.log(`  • ${name} - ${persona.description}`);
              }
            });
            console.log('');
          },
        },
        {
          name: 'current',
          kind: 'BUILT_IN',
          description: 'show current active persona',
          action: async () => {
            const { WarpioPersonaManager } = await import('../manager.js');
            const manager = WarpioPersonaManager.getInstance();
            const active = manager.getActivePersona();
            
            if (active) {
              console.log(`\n🎭 Active: ${active.name}`);
              console.log(`📝 ${active.description}\n`);
            } else {
              console.log('\n🎭 No active persona\n');
            }
          },
        },
        {
          name: 'set',
          kind: 'BUILT_IN',
          description: 'switch to a different persona',
          action: async (_context, args) => {
            if (!args || args.length === 0) {
              console.log('Usage: /persona set <name>');
              console.log('\nUse /persona list to see available personas');
              return;
            }

            const personaName = args[0];
            const { WarpioPersonaManager } = await import('../manager.js');
            const manager = WarpioPersonaManager.getInstance();
            
            console.log(`🔄 Switching to: ${personaName}...`);
            const success = await manager.activatePersona(personaName);
            
            if (success) {
              console.log(`✅ Activated: ${personaName}`);
            } else {
              console.log(`❌ Failed to activate: ${personaName}`);
              console.log('Use /persona list to see available personas');
            }
          },
        },
        {
          name: 'reset',
          kind: 'BUILT_IN', 
          description: 'reset to default warpio persona',
          action: async () => {
            const { WarpioPersonaManager } = await import('../manager.js');
            const manager = WarpioPersonaManager.getInstance();
            
            console.log('🔄 Resetting to default...');
            await manager.activatePersona('warpio');
            console.log('✅ Reset to default persona');
          },
        },
      ],
    };
  } catch {
    // If Warpio system is unavailable, return null so command isn't registered
    return null;
  }
}