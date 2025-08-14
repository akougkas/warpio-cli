/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Warpio Persona Manager - Clean Interface
 * Replaces the old PersonaManager with zero Gemini dependencies
 */

import {
  WarpioPersonaDefinition,
  WarpioConfig,
  WarpioPersonaHooks,
} from './types.js';
import { WarpioPersonaRegistry } from './registry.js';
// MCP integration not yet implemented
import {
  createWarpioContentGenerator,
  createWarpioLanguageModel,
} from './provider-integration.js';
import type { ContentGenerator } from '../core/contentGenerator.js';

export class WarpioPersonaManager {
  private static instance: WarpioPersonaManager;
  private config: WarpioConfig = {};
  private activePersona: WarpioPersonaDefinition | null = null;
  private registry: WarpioPersonaRegistry;

  private constructor() {
    this.registry = WarpioPersonaRegistry.getInstance();
    // MCP integration will be added in future releases

    // ALWAYS activate default persona on initialization
    this.initializeDefaultPersona();
  }

  /**
   * Initialize default persona automatically
   * This ensures Warpio provider integration works without requiring explicit persona activation
   */
  private async initializeDefaultPersona(): Promise<void> {
    try {
      // Only activate default if no persona is already active
      if (!this.activePersona) {
        await this.activatePersona('warpio');
      }
    } catch (error) {
      console.warn(
        'Failed to initialize default persona:',
        error instanceof Error ? error.message : String(error),
      );
      // Continue without persona if activation fails
    }
  }

  static getInstance(): WarpioPersonaManager {
    if (!WarpioPersonaManager.instance) {
      WarpioPersonaManager.instance = new WarpioPersonaManager();
    }
    return WarpioPersonaManager.instance;
  }

  async activatePersona(personaName: string): Promise<boolean> {
    const persona = this.registry.getPersona(personaName);
    if (!persona) {
      return false;
    }

    // Deactivate current persona
    if (this.activePersona) {
      await this.deactivatePersona();
    }

    this.activePersona = persona;
    this.config.activePersona = personaName;

    // Provider preferences are now handled via environment variables

    // Call activation hooks
    const hooks = this.registry.getHooks();
    if (hooks.onActivate) {
      await hooks.onActivate(persona);
    }

    return true;
  }

  async deactivatePersona(): Promise<void> {
    if (!this.activePersona) return;

    // Call deactivation hooks
    const hooks = this.registry.getHooks();
    if (hooks.onDeactivate) {
      await hooks.onDeactivate(this.activePersona);
    }

    // Provider preferences are cleared automatically via environment variables

    this.activePersona = null;
    this.config.activePersona = undefined;
  }

  getActivePersona(): WarpioPersonaDefinition | null {
    return this.activePersona;
  }

  listPersonas(): string[] {
    return this.registry.listPersonas();
  }

  getPersona(name: string): WarpioPersonaDefinition | null {
    return this.registry.getPersona(name);
  }

  getPersonaHelp(personaName: string): string {
    const persona = this.registry.getPersona(personaName);
    if (!persona) {
      return `Persona '${personaName}' not found. Use 'warpio --list-personas' to see available personas.`;
    }

    return `
Persona: ${persona.name}

Description: ${persona.description}

Available Tools: ${persona.tools.join(', ')}

System Prompt Preview:
${persona.systemPrompt.substring(0, 200)}...

Usage: warpio --persona ${personaName}
`;
  }

  setConfig(config: WarpioConfig): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): WarpioConfig {
    return this.config;
  }

  setHooks(hooks: WarpioPersonaHooks): void {
    this.registry.setHooks(hooks);
  }

  // Tool filtering interface
  filterTools(availableTools: string[]): string[] {
    if (!this.activePersona) {
      return availableTools;
    }

    const hooks = this.registry.getHooks();
    if (hooks.onToolFilter) {
      return hooks.onToolFilter(availableTools, this.activePersona);
    }

    // Default filtering: only return tools that are in the persona's tool list
    return availableTools.filter((tool) =>
      this.activePersona!.tools.includes(tool),
    );
  }

  // System prompt interface
  enhanceSystemPrompt(basePrompt: string): string {
    if (!this.activePersona) {
      return basePrompt;
    }

    const hooks = this.registry.getHooks();
    if (hooks.onSystemPrompt) {
      return hooks.onSystemPrompt(basePrompt, this.activePersona);
    }

    // Default enhancement: prepend persona system prompt
    return `${this.activePersona.systemPrompt.trim()}\n\n---\n\n${basePrompt}`;
  }

  // Provider integration methods
  getContentGenerator(): ContentGenerator | null {
    if (!this.activePersona) {
      // This should rarely happen since default persona is auto-activated
      console.debug('No active persona - attempting to initialize default');
      this.initializeDefaultPersona();
      return null;
    }

    return createWarpioContentGenerator();
  }

  getLanguageModel() {
    if (!this.activePersona) {
      // This should rarely happen since default persona is auto-activated
      console.debug('No active persona - attempting to initialize default');
      this.initializeDefaultPersona();
      return null;
    }

    return createWarpioLanguageModel();
  }

  async testProviders() {
    // Provider testing is now handled via the model manager
    return {};
  }

  getProviderIntegration() {
    // Provider integration is now handled via functional APIs
    return null;
  }
}
