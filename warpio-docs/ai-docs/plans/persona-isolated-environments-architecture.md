# Persona Isolated Environments Architecture Plan

## Vision
Create a clean, isolated persona system that maintains 100% upstream compatibility while providing specialized scientific computing experiences through persona activation.

## Core Principles

1. **Zero Gemini Core Modifications**: All persona code lives in `/packages/core/src/warpio/`
2. **Complete Feature Preservation**: All Gemini CLI features work identically with personas
3. **Progressive Enhancement**: Personas enhance but never break base functionality
4. **Clean Isolation**: Each persona has its own environment configuration

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Gemini CLI Core (Untouched)        │
│  - Client, Tools, Prompts, Multi-turn, etc.  │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│         Warpio Integration Layer             │
│  - Hooks into prompt system ✓                │
│  - Tool registry filtering                   │
│  - MCP configuration injection               │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│       Persona Isolated Environment           │
│  ┌─────────────────────────────────────┐    │
│  │ Environment Configuration:          │    │
│  │ - MCP servers (isolated JSON)       │    │
│  │ - Tool allowlist                    │    │
│  │ - System prompt enhancement         │    │
│  │ - Provider preferences              │    │
│  │ - Conversation context              │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Implementation Details

### 1. Persona Environment Structure

```typescript
interface PersonaEnvironment {
  // Core configuration
  name: string;
  description: string;
  
  // Isolated MCP configuration
  mcpConfigPath: string;  // ~/.warpio/personas/{name}/mcp.json
  mcpServers: MCPServerConfig[];  // Loaded from JSON
  
  // Tool management
  availableTools: string[];  // Filtered subset of global tools
  toolFilterStrategy: 'allowlist' | 'denylist';
  
  // Prompt enhancement
  systemPrompt: string;
  promptEnhancer?: (basePrompt: string) => string;
  
  // Provider configuration
  providerPreferences?: {
    preferred: string;  // e.g., 'lmstudio'
    model?: string;     // e.g., 'qwen3-4b'
    fallback?: string;  // e.g., 'gemini'
  };
  
  // Conversation management
  conversationPreprocessor?: (input: string) => string;
  responsePostprocessor?: (output: string) => string;
  contextInjector?: (history: Message[]) => Message[];
  
  // Lifecycle hooks
  onActivate?: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
  onToolCall?: (tool: string, params: any) => void;
}
```

### 2. File System Layout

```
~/.warpio/
├── personas/
│   ├── data-expert/
│   │   ├── mcp.json         # MCP server configurations
│   │   ├── config.json      # Persona settings
│   │   ├── prompts/         # Additional prompt templates
│   │   └── context/         # Saved conversation contexts
│   ├── hpc-expert/
│   │   ├── mcp.json
│   │   ├── config.json
│   │   └── scripts/         # HPC-specific scripts
│   └── analysis-expert/
│       ├── mcp.json
│       ├── config.json
│       └── notebooks/       # Jupyter templates
```

### 3. MCP Isolation Strategy

Each persona gets its own MCP configuration file that's loaded/unloaded on activation:

```json
// ~/.warpio/personas/data-expert/mcp.json
{
  "servers": {
    "hdf5-mcp": {
      "command": "uvx",
      "args": ["iowarp-mcps", "hdf5"],
      "env": {},
      "description": "HDF5 file operations"
    },
    "adios-mcp": {
      "command": "uvx",
      "args": ["iowarp-mcps", "adios"],
      "env": {},
      "description": "ADIOS data streaming"
    }
  }
}
```

### 4. CLI Integration Points

#### Non-Interactive Mode (-p flag)
```bash
# This must work seamlessly
npx warpio --persona data-expert -p "Convert data.nc to HDF5 format"

# Flow:
1. Parse CLI args → detect --persona
2. Activate persona environment
3. Load isolated MCPs
4. Filter tools
5. Enhance prompt
6. Execute non-interactive query
7. Cleanup and exit
```

#### Interactive Mode with Slash Commands
```bash
# In interactive session
/persona data-expert analyze results.hdf5

# Flow:
1. Parse slash command
2. Save current context
3. Activate target persona
4. Execute task in new environment
5. Return result to original persona
6. Restore original environment
```

### 5. Persona Handoff Protocol

**Context Transfer Package:**
```typescript
interface PersonaHandoff {
  // Task definition
  task: string;
  sourcePersona: string;
  targetPersona: string;
  
  // Context preservation
  conversationHistory: Message[];
  workingDirectory: string;
  environmentVariables: Record<string, string>;
  
  // Results channel
  resultFormat: 'text' | 'structured' | 'file';
  resultPath?: string;
  
  // Execution mode
  mode: 'blocking' | 'async';
  timeout?: number;
}
```

### 6. Integration with Existing Features

#### Tool Registry Integration
```typescript
// In tool discovery/registration
async discoverTools(): Promise<void> {
  // 1. Discover base tools
  const baseTools = await this.discoverBaseTools();
  
  // 2. If persona active, apply filter
  if (personaManager.isActive()) {
    const filtered = personaManager.filterTools(baseTools);
    this.registerTools(filtered);
  } else {
    this.registerTools(baseTools);
  }
  
  // 3. Load persona-specific MCPs
  if (personaManager.isActive()) {
    const mcpTools = await personaManager.loadMCPTools();
    this.registerTools(mcpTools);
  }
}
```

#### Prompt System Integration
```typescript
// Already working - in core/prompts.ts
if (isWarpioPersonaActive()) {
  return enhanceSystemPromptWithPersona(basePrompt);
}
```

### 7. Provider Selection per Persona

```typescript
// Each persona can specify preferred provider
const dataExpertConfig = {
  providerPreferences: {
    preferred: 'lmstudio',
    model: 'llama3-70b',  // Better for technical tasks
    fallback: 'gemini'
  }
};

// On activation
if (persona.providerPreferences) {
  process.env.WARPIO_PROVIDER = persona.providerPreferences.preferred;
  process.env.WARPIO_MODEL = persona.providerPreferences.model;
}
```

## Key Design Decisions

1. **MCP Loading Strategy**: Load on activation, unload on switch (clean isolation)
2. **Tool Filtering**: Apply at registry level, not per-call (performance)
3. **Context Preservation**: Use handoff protocol for persona switching
4. **Non-Interactive Support**: Full compatibility with -p flag
5. **Upstream Safety**: All code in /warpio/, zero core modifications

## Migration Path

1. **Phase 1**: Remove config-test persona, clean up backwards compatibility
2. **Phase 2**: Implement PersonaEnvironment interface
3. **Phase 3**: Add MCP isolation and loading
4. **Phase 4**: Implement handoff protocol
5. **Phase 5**: Add slash command support

## Open Questions

1. How should persona switching work in multi-turn conversations?
2. Should MCPs persist across persona switches or fully reload?
3. How to handle persona-specific memory/context files?
4. Should personas be able to call other personas (delegation)?

## Investigation Findings

### ✅ Non-Interactive Mode Compatibility
- **Full compatibility confirmed**: `--persona` flag works seamlessly with `-p`
- Persona activation happens BEFORE interactive/non-interactive branching
- Example: `npx warpio --persona data-expert -p "Convert data.nc to HDF5"`
- No special handling needed - personas are mode-agnostic

### ✅ Handoff Protocol Implementation
- **Fully implemented** in `contextHandoverService.ts` and `handoverTool.ts`
- MessagePack optimization (3-5x faster, 60-80% smaller)
- Complete CLI integration with `--context-from` and `--task` flags
- **BUT**: Tool not registered in tool registry (bug/incomplete)
- **CRITICAL**: Currently in core/src, needs migration to warpio/

### ⚠️ MCP Integration Status
- **NOT IMPLEMENTED**: Personas define `mcpConfigs` but no loading occurs
- Missing bridge between persona MCPs and `Config.updateMcpServers()`
- Infrastructure exists but activation logic missing

### 🔴 Entanglement Issues

#### Current Problematic Files in Core
1. `/packages/core/src/services/contextHandoverService.ts` - Should move to warpio/
2. `/packages/core/src/tools/handoverTool.ts` - Should move to warpio/
3. CLI integration in `gemini.tsx` - Needs conditional loading

#### Clean Persona Files (Already Isolated)
- `/packages/core/src/warpio/manager.ts` ✅
- `/packages/core/src/warpio/personas/*.ts` ✅
- `/packages/core/src/warpio/registry.ts` ✅

## Revised Architecture Plan

### Phase 1: Cleanup & Disentanglement
1. **Remove config-test persona** - Internal test utility not needed
2. **Move handoff system to warpio/**
   - `contextHandoverService.ts` → `/warpio/services/`
   - `handoverTool.ts` → `/warpio/tools/`
3. **Make handoff conditional** - Only load if Warpio is available
4. **Fix tool registration** - Add HandoverToPersonaTool to registry

### Phase 2: MCP Isolation Implementation
```typescript
// New: /packages/core/src/warpio/mcp-manager.ts
class WarpioMCPManager {
  async loadPersonaMCPs(persona: WarpioPersonaDefinition) {
    // 1. Generate isolated MCP config
    const mcpConfig = this.generateMCPConfig(persona.mcpConfigs);
    
    // 2. Save to persona directory
    const configPath = `~/.warpio/personas/${persona.name}/mcp.json`;
    await this.saveMCPConfig(configPath, mcpConfig);
    
    // 3. Update Config dynamically
    this.config.updateMcpServers(mcpConfig);
  }
  
  async unloadPersonaMCPs() {
    // Clear MCP servers when switching personas
    this.config.updateMcpServers({});
  }
}
```

### Phase 3: Complete Isolation Architecture
```
packages/core/src/
├── warpio/                      # ALL Warpio code here
│   ├── manager.ts               # Main persona manager
│   ├── registry.ts              # Persona registry
│   ├── mcp-manager.ts           # NEW: MCP isolation
│   ├── services/
│   │   └── handover.ts          # MOVED from core
│   ├── tools/
│   │   └── handover-tool.ts     # MOVED from core
│   └── personas/
│       ├── warpio-default.ts
│       ├── data-expert.ts
│       ├── analysis-expert.ts
│       ├── hpc-expert.ts
│       ├── research-expert.ts
│       └── workflow-expert.ts
└── (Gemini core files untouched)
```

### Phase 4: Integration Points
```typescript
// Minimal hooks in Gemini core:

// 1. In prompts.ts (already working)
if (isWarpioPersonaActive()) {
  return enhanceSystemPromptWithPersona(basePrompt);
}

// 2. In config.ts (needs addition)
if (isWarpioAvailable()) {
  const { HandoverToPersonaTool } = await import('../warpio/tools/handover-tool.js');
  registerCoreTool(HandoverToPersonaTool, this);
}

// 3. In gemini.tsx (make conditional)
if (argv.contextFrom && isWarpioAvailable()) {
  const { handoverService } = await import('../warpio/services/handover.js');
  // ... handover logic
}
```

## Implementation Priority

1. **Immediate**: Remove config-test, clean up backwards compatibility
2. **High**: Move handoff system to warpio/, fix tool registration
3. **High**: Implement MCP isolation and loading
4. **Medium**: Add slash commands for persona switching
5. **Low**: Advanced features (delegation, multi-persona workflows)

## Success Criteria

- ✅ Zero modifications to Gemini core files (only conditional imports)
- ✅ All Warpio code in `/packages/core/src/warpio/`
- ✅ Personas work with `-p` flag
- ✅ MCPs load/unload per persona
- ✅ Handoff protocol works between personas
- ✅ Easy upstream merges (git merge with no conflicts)

---

*Updated: Investigation complete, architecture refined for maximum isolation*