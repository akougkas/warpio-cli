/**
 * Warpio Standalone Persona System - Main Exports
 * Clean, zero-dependency persona system for Warpio CLI
 */

// Core types and interfaces
export type {
  WarpioPersonaDefinition,
  MCPAutoConfig,
  ProviderPreferences,
  WarpioPersonaHooks,
  WarpioConfig,
} from './types.js';

// Main manager classes
export { WarpioPersonaRegistry } from './registry.js';
export { WarpioPersonaManager } from './manager.js';
import { WarpioPersonaManager } from './manager.js';

// CLI integration
export type { WarpioCliArgs, WarpioCliHooks } from './cli-hooks.js';
export { createWarpioCliHooks } from './cli-hooks.js';

// System prompt integration
export { enhanceSystemPromptWithPersona, isWarpioPersonaActive } from './system-prompt.js';

// Built-in personas
export { getBuiltInPersonas, warpioDefaultPersona } from './personas/index.js';

// Configuration system
export {
  WarpioConfigLoader,
  WarpioRuntimeConfig,
  WarpioConfigFile,  
  WarpioProviderConfig,
  WarpioModelConfig,
  WarpioConfigurationError,
} from './config/loader.js';

export {
  WarpioConfigValidator,
  ValidationResult,
  ConnectionTestResult,
} from './config/validator.js';

// Convenience functions for integration
export function initializeWarpioSystem() {
  const manager = WarpioPersonaManager.getInstance();
  manager.setConfig({
    enableMCPAutoConfig: true,
  });
  return manager;
}