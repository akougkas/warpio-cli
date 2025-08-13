/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Warpio CLI Integration Hooks
 * Minimal interface points for CLI integration
 */

export interface WarpioCliArgs {
  persona?: string;
  listPersonas?: boolean;
  personaHelp?: string;
}

export interface WarpioCliHooks {
  parsePersonaArgs(args: any): WarpioCliArgs;
  handlePersonaCommands(args: WarpioCliArgs): Promise<boolean>; // Returns true if command was handled (exit)
  validatePersona(personaName: string): Promise<boolean>;
}

export function createWarpioCliHooks(): WarpioCliHooks {
  return {
    parsePersonaArgs(args: any): WarpioCliArgs {
      return {
        persona: args.persona,
        listPersonas: args.listPersonas,
        personaHelp: args.personaHelp,
      };
    },

    async handlePersonaCommands(args: WarpioCliArgs): Promise<boolean> {
      const { WarpioPersonaManager } = await import('./manager.js');
      const manager = WarpioPersonaManager.getInstance();

      if (args.listPersonas) {
        console.log('Available Warpio personas:');
        const personas = manager.listPersonas();
        for (const persona of personas) {
          const definition = manager.getPersona(persona);
          if (definition) {
            console.log(`  ${persona} - ${definition.description}`);
          }
        }
        console.log(
          '\nUse "warpio --persona <name>" to launch with a specific persona.',
        );
        console.log(
          'Use "warpio --persona-help <name>" for detailed information about a persona.',
        );
        return true; // Exit after listing
      }

      if (args.personaHelp) {
        const helpText = manager.getPersonaHelp(args.personaHelp);
        console.log(helpText);
        return true; // Exit after help
      }

      return false; // Don't exit, continue with normal flow
    },

    async validatePersona(personaName: string): Promise<boolean> {
      const { WarpioPersonaManager } = await import('./manager.js');
      const manager = WarpioPersonaManager.getInstance();
      const availablePersonas = manager.listPersonas();
      return availablePersonas.includes(personaName);
    },
  };
}
