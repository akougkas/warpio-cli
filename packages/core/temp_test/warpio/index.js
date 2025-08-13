/**
 * Warpio Standalone Persona System - Main Exports
 * Clean, zero-dependency persona system for Warpio CLI
 */
// Main manager classes
export { WarpioPersonaRegistry } from './registry.js';
export { WarpioPersonaManager } from './manager.js';
import { WarpioPersonaManager } from './manager.js';
export { createWarpioCliHooks } from './cli-hooks.js';
// System prompt integration
export { enhanceSystemPromptWithPersona, isWarpioPersonaActive } from './system-prompt.js';
// Built-in personas
export { getBuiltInPersonas, warpioDefaultPersona } from './personas/index.js';
// Convenience functions for integration
export function initializeWarpioSystem() {
    const manager = WarpioPersonaManager.getInstance();
    manager.setConfig({
        enableMCPAutoConfig: true,
    });
    return manager;
}
