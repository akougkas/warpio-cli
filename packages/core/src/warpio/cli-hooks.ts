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
}

export interface WarpioCliHooks {
  parsePersonaArgs(args: { persona?: string }): WarpioCliArgs;
  handlePersonaCommands(args: WarpioCliArgs): Promise<boolean>; // Returns true if command was handled (exit)
  validatePersona(personaName: string): Promise<boolean>;
}

export function createWarpioCliHooks(): WarpioCliHooks {
  return {
    parsePersonaArgs(args: { persona?: string }): WarpioCliArgs {
      return {
        persona: args.persona,
      };
    },

    async handlePersonaCommands(_args: WarpioCliArgs): Promise<boolean> {
      // No CLI commands to handle, just return false to continue
      return false;
    },

    async validatePersona(personaName: string): Promise<boolean> {
      const { WarpioPersonaManager } = await import('./manager.js');
      const manager = WarpioPersonaManager.getInstance();
      const availablePersonas = manager.listPersonas();
      return availablePersonas.includes(personaName);
    },
  };
}
