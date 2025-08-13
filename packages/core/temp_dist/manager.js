/**
 * Warpio Persona Manager - Clean Interface
 * Replaces the old PersonaManager with zero Gemini dependencies
 */
import { WarpioPersonaRegistry } from './registry.js';
// Import MCP and Provider integration when ready
// import { WarpioMCPIntegration } from './mcp-integration.js';
// import { WarpioProviderIntegration } from './provider-integration.js';
export class WarpioPersonaManager {
    static instance;
    config = {};
    activePersona = null;
    registry;
    // private mcpIntegration: WarpioMCPIntegration;
    // private providerIntegration: WarpioProviderIntegration;
    constructor() {
        this.registry = WarpioPersonaRegistry.getInstance();
        // TODO: Initialize integrations when ready
        // this.mcpIntegration = new WarpioMCPIntegration();
        // this.providerIntegration = new WarpioProviderIntegration();
    }
    static getInstance() {
        if (!WarpioPersonaManager.instance) {
            WarpioPersonaManager.instance = new WarpioPersonaManager();
        }
        return WarpioPersonaManager.instance;
    }
    async activatePersona(personaName) {
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
        // TODO: Configure MCP servers when MCP integration is ready
        // if (this.config.enableMCPAutoConfig && persona.mcpConfigs) {
        //   await this.mcpIntegration.configureMCPServers(persona.mcpConfigs);
        // }
        // TODO: Set up provider preferences when provider integration is ready
        // if (persona.providerPreferences) {
        //   this.providerIntegration.setProviderPreferences(persona.providerPreferences);
        // }
        // Call activation hooks
        const hooks = this.registry.getHooks();
        if (hooks.onActivate) {
            await hooks.onActivate(persona);
        }
        return true;
    }
    async deactivatePersona() {
        if (!this.activePersona)
            return;
        // Call deactivation hooks
        const hooks = this.registry.getHooks();
        if (hooks.onDeactivate) {
            await hooks.onDeactivate(this.activePersona);
        }
        // TODO: Clean up MCP servers when MCP integration is ready
        // if (this.config.enableMCPAutoConfig && this.activePersona.mcpConfigs) {
        //   await this.mcpIntegration.cleanupMCPServers(this.activePersona.mcpConfigs);
        // }
        this.activePersona = null;
        this.config.activePersona = undefined;
    }
    getActivePersona() {
        return this.activePersona;
    }
    listPersonas() {
        return this.registry.listPersonas();
    }
    getPersona(name) {
        return this.registry.getPersona(name);
    }
    getPersonaHelp(personaName) {
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
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return this.config;
    }
    setHooks(hooks) {
        this.registry.setHooks(hooks);
    }
    // Tool filtering interface
    filterTools(availableTools) {
        if (!this.activePersona) {
            return availableTools;
        }
        const hooks = this.registry.getHooks();
        if (hooks.onToolFilter) {
            return hooks.onToolFilter(availableTools, this.activePersona);
        }
        // Default filtering: only return tools that are in the persona's tool list
        return availableTools.filter(tool => this.activePersona.tools.includes(tool));
    }
    // System prompt interface
    enhanceSystemPrompt(basePrompt) {
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
}
