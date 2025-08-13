# Standalone Warpio Persona System - Complete Architecture Plan
Generated: 2025-08-13-06-08-13
Requested by: User
Type: Major Architecture Refactoring

## Executive Summary

Design and implement a completely standalone Warpio persona system that is cleanly separated from Gemini CLI core files to enable easier upstream merges. The new system will have ZERO dependencies on Gemini CLI core files and will integrate seamlessly with the Vercel AI SDK provider system while supporting all existing persona features.

## Technical Analysis

- **Current State**: Persona system is tightly integrated with Gemini core (`config.ts`, `prompts.ts`, `persona-manager.ts`)
- **Target State**: Completely standalone `/packages/core/src/warpio/` system with clean interfaces
- **Complexity**: High - Requires careful extraction and abstraction while preserving all functionality
- **Risk Level**: Medium-High - Must not break existing functionality or upstream compatibility

## Current Architecture Problems

### Integration Points Found
1. **CLI Arguments**: Persona args handled in `/packages/cli/src/config/config.ts:74-76, 230-241`
2. **System Prompt Injection**: In `/packages/core/src/core/prompts.ts:25, 373-384`
3. **PersonaManager**: In `/packages/core/src/personas/persona-manager.ts` (820+ lines)
4. **Gemini Integration**: Direct imports in main CLI and config files
5. **Tool Filtering**: Built into PersonaManager but not clearly separated

### Dependencies to Remove
- `PersonaManager` imports in core Gemini files
- Persona CLI argument handling in Gemini config
- System prompt injection logic in Gemini prompts
- Direct file system dependencies (GEMINI_CONFIG_DIR)

## Implementation Plan

### Phase 1: Create Standalone Warpio Directory Structure

**Files to create:**
```
/packages/core/src/warpio/
├── index.ts                     # Main exports
├── types.ts                     # Core types and interfaces
├── registry.ts                  # Persona registry system
├── manager.ts                   # Clean persona manager
├── provider-integration.ts      # Vercel AI SDK integration
├── cli-hooks.ts                # Minimal CLI integration points
├── system-prompt.ts            # Isolated system prompt logic
├── tool-filter.ts              # Tool filtering logic
├── mcp-integration.ts          # IOWarp MCP auto-configuration
└── personas/
    ├── index.ts                # Built-in persona definitions
    ├── warpio-default.ts       # Default persona
    ├── data-expert.ts          # Data I/O specialist
    ├── analysis-expert.ts      # Data analysis specialist
    ├── hpc-expert.ts           # HPC optimization specialist
    ├── research-expert.ts      # Research documentation specialist
    └── workflow-expert.ts      # Workflow orchestration specialist
```

**Code Implementation:**

#### `/packages/core/src/warpio/types.ts`
```typescript
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
  onToolFilter?: (tools: string[], persona: WarpioPersonaDefinition) => string[];
  onSystemPrompt?: (basePrompt: string, persona: WarpioPersonaDefinition) => string;
}

export interface WarpioConfig {
  activePersona?: string;
  personaSearchPaths?: string[];
  enableMCPAutoConfig?: boolean;
}
```

#### `/packages/core/src/warpio/registry.ts`
```typescript
/**
 * Warpio Persona Registry - Standalone System
 * Clean separation from Gemini CLI core
 */

import { WarpioPersonaDefinition, WarpioPersonaHooks } from './types.js';
import { getBuiltInPersonas } from './personas/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'node:os';

export class WarpioPersonaRegistry {
  private static instance: WarpioPersonaRegistry;
  private personas = new Map<string, WarpioPersonaDefinition>();
  private hooks: WarpioPersonaHooks = {};
  private searchPaths: string[] = [];

  private constructor() {
    this.initializeDefaults();
  }

  static getInstance(): WarpioPersonaRegistry {
    if (!WarpioPersonaRegistry.instance) {
      WarpioPersonaRegistry.instance = new WarpioPersonaRegistry();
    }
    return WarpioPersonaRegistry.instance;
  }

  private initializeDefaults(): void {
    // Load built-in personas
    const builtInPersonas = getBuiltInPersonas();
    for (const persona of builtInPersonas) {
      this.personas.set(persona.name, persona);
    }

    // Set default search paths
    this.searchPaths = [
      path.join(process.cwd(), '.warpio', 'personas'),
      path.join(homedir(), '.warpio', 'personas'),
    ];
  }

  registerPersona(persona: WarpioPersonaDefinition): void {
    this.personas.set(persona.name, persona);
  }

  getPersona(name: string): WarpioPersonaDefinition | null {
    // Check registered personas first
    if (this.personas.has(name)) {
      return this.personas.get(name)!;
    }

    // Try loading from filesystem
    const loadedPersona = this.loadPersonaFromFs(name);
    if (loadedPersona) {
      this.personas.set(name, loadedPersona);
      return loadedPersona;
    }

    return null;
  }

  listPersonas(): string[] {
    const personaNames = new Set(this.personas.keys());
    
    // Add personas from filesystem
    for (const searchPath of this.searchPaths) {
      if (fs.existsSync(searchPath)) {
        const files = fs.readdirSync(searchPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            personaNames.add(path.basename(file, '.md'));
          }
        }
      }
    }

    return Array.from(personaNames).sort();
  }

  setHooks(hooks: WarpioPersonaHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  getHooks(): WarpioPersonaHooks {
    return this.hooks;
  }

  private loadPersonaFromFs(name: string): WarpioPersonaDefinition | null {
    for (const searchPath of this.searchPaths) {
      const personaPath = path.join(searchPath, `${name}.md`);
      if (fs.existsSync(personaPath)) {
        return this.parsePersonaFile(personaPath);
      }
    }
    return null;
  }

  private parsePersonaFile(filePath: string): WarpioPersonaDefinition | null {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
      if (!match) return null;

      const [, frontmatter, systemPrompt] = match;
      const metadata: Record<string, unknown> = {};
      
      frontmatter.split('\n').forEach((line) => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          if (key.trim() === 'tools') {
            metadata[key.trim()] = value.split(',').map((t) => t.trim());
          } else {
            metadata[key.trim()] = value;
          }
        }
      });

      return {
        name: (metadata.name as string) || path.basename(filePath, '.md'),
        description: (metadata.description as string) || 'Custom persona',
        tools: (metadata.tools as string[]) || ['Bash', 'Read', 'Write', 'Edit'],
        systemPrompt: systemPrompt.trim(),
        metadata: {
          version: metadata.version as string | undefined,
          author: metadata.author as string | undefined,
          categories: (metadata.categories as string)?.split(',').map((c: string) => c.trim()),
        },
      };
    } catch (error) {
      console.error(`Error parsing persona file ${filePath}:`, error);
      return null;
    }
  }
}
```

#### `/packages/core/src/warpio/manager.ts`
```typescript
/**
 * Warpio Persona Manager - Clean Interface
 * Replaces the old PersonaManager with zero Gemini dependencies
 */

import { WarpioPersonaDefinition, WarpioConfig, WarpioPersonaHooks } from './types.js';
import { WarpioPersonaRegistry } from './registry.js';
import { WarpioMCPIntegration } from './mcp-integration.js';
import { WarpioProviderIntegration } from './provider-integration.js';

export class WarpioPersonaManager {
  private static instance: WarpioPersonaManager;
  private config: WarpioConfig = {};
  private activePersona: WarpioPersonaDefinition | null = null;
  private registry: WarpioPersonaRegistry;
  private mcpIntegration: WarpioMCPIntegration;
  private providerIntegration: WarpioProviderIntegration;

  private constructor() {
    this.registry = WarpioPersonaRegistry.getInstance();
    this.mcpIntegration = new WarpioMCPIntegration();
    this.providerIntegration = new WarpioProviderIntegration();
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

    // Configure MCP servers
    if (this.config.enableMCPAutoConfig && persona.mcpConfigs) {
      await this.mcpIntegration.configureMCPServers(persona.mcpConfigs);
    }

    // Set up provider preferences
    if (persona.providerPreferences) {
      this.providerIntegration.setProviderPreferences(persona.providerPreferences);
    }

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

    // Clean up MCP servers
    if (this.config.enableMCPAutoConfig && this.activePersona.mcpConfigs) {
      await this.mcpIntegration.cleanupMCPServers(this.activePersona.mcpConfigs);
    }

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
    return availableTools.filter(tool => this.activePersona!.tools.includes(tool));
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
}
```

#### `/packages/core/src/warpio/cli-hooks.ts`
```typescript
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
        console.log('\nUse "warpio --persona <name>" to launch with a specific persona.');
        console.log('Use "warpio --persona-help <name>" for detailed information about a persona.');
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
```

#### `/packages/core/src/warpio/provider-integration.ts`
```typescript
/**
 * Warpio Provider Integration with Vercel AI SDK
 * Persona-specific provider configuration
 */

import { ProviderPreferences } from './types.js';
import { ProviderConfig, createWarpioProviderRegistry } from '../providers/registry.js';

export class WarpioProviderIntegration {
  private currentPreferences: ProviderPreferences | null = null;
  private originalConfig: ProviderConfig | null = null;

  setProviderPreferences(preferences: ProviderPreferences): void {
    this.currentPreferences = preferences;
    
    // Store original config for restoration
    if (!this.originalConfig) {
      this.originalConfig = this.getCurrentProviderConfig();
    }

    // Override environment variables temporarily
    process.env.WARPIO_PROVIDER = preferences.preferred;
    if (preferences.model) {
      process.env.WARPIO_MODEL = preferences.model;
    }
  }

  clearProviderPreferences(): void {
    if (this.originalConfig) {
      // Restore original config
      process.env.WARPIO_PROVIDER = this.originalConfig.provider;
      if (this.originalConfig.model) {
        process.env.WARPIO_MODEL = this.originalConfig.model;
      }
    }
    this.currentPreferences = null;
    this.originalConfig = null;
  }

  getCurrentPreferences(): ProviderPreferences | null {
    return this.currentPreferences;
  }

  createPersonaCustomProvider(personaName: string) {
    if (!this.currentPreferences) {
      return null;
    }

    const registry = createWarpioProviderRegistry();
    const providerName = this.currentPreferences.preferred;
    const modelName = this.currentPreferences.model || 'default';
    
    try {
      const model = registry.languageModel(`${providerName}:${modelName}`);
      
      // Apply persona-specific settings
      if (this.currentPreferences.temperature !== undefined) {
        // Configure temperature through model settings
        // This would be implemented based on Vercel AI SDK patterns
      }
      
      return model;
    } catch (error) {
      console.warn(`Failed to create custom provider for ${personaName}:`, error);
      return null;
    }
  }

  private getCurrentProviderConfig(): ProviderConfig {
    return {
      provider: (process.env.WARPIO_PROVIDER as any) || 'gemini',
      model: process.env.WARPIO_MODEL,
      baseURL: process.env.WARPIO_BASE_URL,
      apiKey: process.env.WARPIO_API_KEY,
    };
  }
}
```

### Phase 2: Create Built-in Persona Definitions

**File: `/packages/core/src/warpio/personas/index.ts`**
```typescript
/**
 * Built-in Warpio Personas
 * Clean separation from old persona-manager.ts
 */

import { WarpioPersonaDefinition, MCPAutoConfig } from '../types.js';

// Import individual persona definitions
import { warpioDefaultPersona } from './warpio-default.js';
import { dataExpertPersona } from './data-expert.js';
import { analysisExpertPersona } from './analysis-expert.js';
import { hpcExpertPersona } from './hpc-expert.js';
import { researchExpertPersona } from './research-expert.js';
import { workflowExpertPersona } from './workflow-expert.js';

export function getBuiltInPersonas(): WarpioPersonaDefinition[] {
  return [
    warpioDefaultPersona,
    dataExpertPersona,
    analysisExpertPersona,
    hpcExpertPersona,
    researchExpertPersona,
    workflowExpertPersona,
  ];
}

export {
  warpioDefaultPersona,
  dataExpertPersona,
  analysisExpertPersona,
  hpcExpertPersona,
  researchExpertPersona,
  workflowExpertPersona,
};
```

### Phase 3: Integration with Existing Systems

#### A. CLI Integration (Minimal Changes)

**File: `/packages/cli/src/config/warpio-integration.ts` (NEW)**
```typescript
/**
 * Warpio CLI Integration Layer
 * Minimal hook into existing CLI without modifying Gemini core
 */

import { WarpioPersonaManager, createWarpioCliHooks } from '@google/gemini-cli-core';

let warpioManager: WarpioPersonaManager | null = null;
const cliHooks = createWarpioCliHooks();

export async function initializeWarpio(): Promise<void> {
  warpioManager = WarpioPersonaManager.getInstance();
  warpioManager.setConfig({
    enableMCPAutoConfig: true,
  });
}

export async function handleWarpioCliArgs(args: any): Promise<boolean> {
  const warpioArgs = cliHooks.parsePersonaArgs(args);
  return await cliHooks.handlePersonaCommands(warpioArgs);
}

export async function activateWarpioPersona(personaName: string): Promise<boolean> {
  if (!warpioManager) {
    await initializeWarpio();
  }
  return await warpioManager!.activatePersona(personaName);
}

export function getWarpioPersonaManager(): WarpioPersonaManager | null {
  return warpioManager;
}
```

**Modification: `/packages/cli/src/config/config.ts`**
```typescript
// Add import at top
import { handleWarpioCliArgs, activateWarpioPersona } from './warpio-integration.js';

// In parseArguments() function, add before return:
  // Handle Warpio persona commands (returns true if we should exit)
  const shouldExit = await handleWarpioCliArgs(argv);
  if (shouldExit) {
    process.exit(0);
  }

// In loadCliConfig() function, after Config creation:
  // Activate Warpio persona if specified
  if (activePersona) {
    const success = await activateWarpioPersona(activePersona);
    if (!success) {
      throw new Error(
        `Invalid persona: ${activePersona}. Use 'warpio --list-personas' to see available personas.`
      );
    }
  }
```

#### B. System Prompt Integration

**File: `/packages/core/src/warpio/system-prompt.ts`**
```typescript
/**
 * Warpio System Prompt Integration
 * Clean replacement for persona prompt injection in prompts.ts
 */

import { WarpioPersonaManager } from './manager.js';

export function enhanceSystemPromptWithPersona(basePrompt: string): string {
  const manager = WarpioPersonaManager.getInstance();
  return manager.enhanceSystemPrompt(basePrompt);
}

export function isWarpioPersonaActive(): boolean {
  const manager = WarpioPersonaManager.getInstance();
  return manager.getActivePersona() !== null;
}
```

**Modification: `/packages/core/src/core/prompts.ts`**
```typescript
// Add import at top
import { enhanceSystemPromptWithPersona, isWarpioPersonaActive } from '../warpio/system-prompt.js';

// Replace the persona logic in getCoreSystemPrompt():
export function getCoreSystemPrompt(
  userMemory?: string,
  activePersona?: PersonaDefinition | null, // Keep for backward compatibility but ignore
): string {
  // ... existing code until line 372 ...

  const memorySuffix = userMemory ? `\n\n## User Memory\n${userMemory}` : '';

  // Use Warpio system instead of old persona logic
  if (isWarpioPersonaActive()) {
    return enhanceSystemPromptWithPersona(`${basePrompt}${memorySuffix}`);
  }

  return `${basePrompt}${memorySuffix}`;
}
```

#### C. Tool Registry Integration

**File: `/packages/core/src/warpio/tool-filter.ts`**
```typescript
/**
 * Warpio Tool Filtering Integration
 * Clean interface to existing tool registry
 */

import { WarpioPersonaManager } from './manager.js';

export function filterToolsForPersona(availableTools: string[]): string[] {
  const manager = WarpioPersonaManager.getInstance();
  return manager.filterTools(availableTools);
}

export function isToolAllowedForPersona(toolName: string): boolean {
  const manager = WarpioPersonaManager.getInstance();
  const activePersona = manager.getActivePersona();
  
  if (!activePersona) {
    return true; // No persona active, allow all tools
  }

  return activePersona.tools.includes(toolName);
}
```

### Phase 4: MCP Integration

**File: `/packages/core/src/warpio/mcp-integration.ts`**
```typescript
/**
 * Warpio MCP Auto-Configuration
 * Automatic IOWarp MCP server setup per persona
 */

import { MCPAutoConfig } from './types.js';
import { spawn } from 'child_process';

export class WarpioMCPIntegration {
  private activeMCPServers: Set<string> = new Set();

  async configureMCPServers(configs: MCPAutoConfig[]): Promise<void> {
    for (const config of configs) {
      try {
        await this.startMCPServer(config);
        this.activeMCPServers.add(config.serverName);
      } catch (error) {
        console.warn(`Failed to start MCP server ${config.serverName}:`, error);
      }
    }
  }

  async cleanupMCPServers(configs: MCPAutoConfig[]): Promise<void> {
    for (const config of configs) {
      if (this.activeMCPServers.has(config.serverName)) {
        await this.stopMCPServer(config);
        this.activeMCPServers.delete(config.serverName);
      }
    }
  }

  private async startMCPServer(config: MCPAutoConfig): Promise<void> {
    // Implementation would depend on how MCP servers are managed
    // This is a placeholder for the actual MCP server lifecycle management
    console.log(`Starting MCP server: ${config.serverName}`);
  }

  private async stopMCPServer(config: MCPAutoConfig): Promise<void> {
    console.log(`Stopping MCP server: ${config.serverName}`);
  }

  getActiveMCPServers(): string[] {
    return Array.from(this.activeMCPServers);
  }
}
```

### Phase 5: Migration Strategy

#### Step 1: Create New System (Non-Breaking)
1. Implement all new files in `/packages/core/src/warpio/`
2. Add exports to `/packages/core/src/index.ts`
3. Test new system in isolation

#### Step 2: CLI Integration (Minimal Changes)
1. Add `/packages/cli/src/config/warpio-integration.ts`
2. Make minimal changes to existing CLI files
3. Test CLI functionality with new system

#### Step 3: System Prompt Integration
1. Modify `/packages/core/src/core/prompts.ts` to use new system
2. Keep old interface for backward compatibility
3. Test prompt generation

#### Step 4: Remove Old System (Breaking Change)
1. Remove `/packages/core/src/personas/persona-manager.ts`
2. Remove persona-related code from config files
3. Update imports and exports
4. Remove old PersonaManager from exports

#### Step 5: Verification
1. Test all persona functionality
2. Verify upstream merge capability
3. Test MCP integration
4. Performance testing

### Phase 6: File-by-File Implementation Guide

#### High Priority (Core System)
1. `/packages/core/src/warpio/types.ts` - Core interfaces
2. `/packages/core/src/warpio/registry.ts` - Persona registry
3. `/packages/core/src/warpio/manager.ts` - Main manager class
4. `/packages/core/src/warpio/personas/warpio-default.ts` - Default persona

#### Medium Priority (Integration)
5. `/packages/core/src/warpio/cli-hooks.ts` - CLI integration
6. `/packages/core/src/warpio/system-prompt.ts` - Prompt integration
7. `/packages/cli/src/config/warpio-integration.ts` - CLI wrapper

#### Low Priority (Advanced Features)
8. `/packages/core/src/warpio/provider-integration.ts` - Provider system
9. `/packages/core/src/warpio/mcp-integration.ts` - MCP auto-config
10. All other persona definition files

#### Cleanup (Breaking Changes)
11. Remove old persona-manager.ts
12. Clean up imports and exports
13. Update documentation

### Success Metrics

- [ ] Zero dependencies on Gemini CLI core files
- [ ] All existing persona functionality preserved
- [ ] Clean integration with Vercel AI SDK
- [ ] Upstream merge capability maintained
- [ ] MCP auto-configuration working
- [ ] Performance equivalent or better
- [ ] CLI compatibility maintained
- [ ] All 5 personas functional

## Next Steps

1. **Immediate**: Begin implementation with Phase 1 (core types and registry)
2. **Week 1**: Complete standalone Warpio system implementation
3. **Week 2**: Integration testing and CLI hooks
4. **Week 3**: MCP integration and provider customization
5. **Week 4**: Migration from old system and cleanup

## Risk Mitigation

- **Backward Compatibility**: Keep old interfaces during transition
- **Testing**: Comprehensive testing at each phase
- **Rollback Plan**: Ability to revert to old system if needed
- **Documentation**: Clear migration guide for users
- **Performance**: Monitor performance impact during migration

This architecture ensures a clean, maintainable, and extensible persona system that can evolve independently from the upstream Gemini CLI while providing all the advanced features that make Warpio unique.