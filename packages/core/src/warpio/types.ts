/**
 * Standalone Warpio Persona System Types
 * Zero dependencies on Gemini CLI core
 */

export interface WarpioPersonaDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  mcpConfigs?: MCPAutoConfig[];
  providerPreferences?: ProviderPreferences;
  metadata?: {
    version?: string;
    author?: string;
    categories?: string[];
  };
}

export interface MCPAutoConfig {
  serverName: string;
  serverPath: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ProviderPreferences {
  preferred: 'gemini' | 'lmstudio' | 'ollama';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface WarpioPersonaHooks {
  onActivate?: (persona: WarpioPersonaDefinition) => void | Promise<void>;
  onDeactivate?: (persona: WarpioPersonaDefinition) => void | Promise<void>;
  onToolFilter?: (
    tools: string[],
    persona: WarpioPersonaDefinition,
  ) => string[];
  onSystemPrompt?: (
    basePrompt: string,
    persona: WarpioPersonaDefinition,
  ) => string;
}

export interface WarpioConfig {
  activePersona?: string;
  personaSearchPaths?: string[];
  enableMCPAutoConfig?: boolean;
}
