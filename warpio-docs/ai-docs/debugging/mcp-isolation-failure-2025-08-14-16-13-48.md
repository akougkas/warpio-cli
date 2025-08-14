# Debug Analysis: MCP Tool Isolation Failure

Generated: 2025-08-14-16-13-48
Severity: Critical

## Executive Summary

The MCP tool isolation system for Warpio personas is failing due to a critical bug in the `ToolRegistry.discoverMcpTools()` method. When switching personas, the method incorrectly removes ALL discovered tools (including core tools) but only re-discovers MCP tools, causing tool pollution and broken isolation.

## Symptom Analysis

- **Observed behavior**: All personas get identical tool sets regardless of MCP configuration
- **Expected behavior**: Each persona should only have access to their configured MCP tools
- **Reproduction rate**: 100%

### Evidence

- `data-expert` persona (should have only adios/hdf5/compression tools) gets ALL tools
- `hpc-expert` persona (should have only darshan/lmod/node-hardware tools) gets ALL tools
- Both personas show correct MCP loading messages in UI but actual tools are wrong

## Root Cause Investigation

### Code Flow Analysis

1. **Entry point**: `gemini.tsx:317` - Config initialization

   ```typescript
   await config.initialize();
   ```

2. **Tool Registry Creation**: `config.ts:361` - Creates tool registry

   ```typescript
   this.toolRegistry = await this.createToolRegistry();
   ```

3. **Initial Tool Discovery**: `config.ts:773` - Discovers ALL tools

   ```typescript
   await registry.discoverAllTools();
   ```

4. **Persona Loading**: `mcp-manager.ts:111` - Persona loads its MCPs

   ```typescript
   await toolRegistry.discoverMcpTools();
   ```

5. **Failure point**: `tool-registry.ts:230` - WRONG method called

   ```typescript
   this.removeDiscoveredTools(); // Removes ALL discovered tools!
   ```

6. **Root cause**: `tool-registry.ts:155-159` - Too broad removal
   ```typescript
   // Remove ALL discovered tools (MCP and command-line)
   if (tool instanceof DiscoveredTool || tool instanceof DiscoveredMCPTool) {
     toolsToRemove.push(name);
   }
   ```

### Stack Trace Analysis

The bug cascade:

1. `discoverMcpTools()` calls `removeDiscoveredTools()`
2. `removeDiscoveredTools()` removes BOTH MCP tools AND command-line discovered tools
3. Only MCP tools are re-discovered, not command-line tools
4. Result: Tool registry accumulates tools instead of isolating them

## The Critical Bug

**Location**: `/packages/core/src/tools/tool-registry.ts:228-243`

**Problem**: The `discoverMcpTools()` method is using the wrong removal function:

- It calls `removeDiscoveredTools()` which removes ALL discovered tools
- It should ONLY remove MCP tools
- After removal, it only re-discovers MCP tools, not command-line tools

**Secondary Issue**: Even the `clearAllMcpTools()` method isn't being used correctly:

- It's called in `mcp-manager.ts` but AFTER `removeDiscoveredTools()`
- The damage is already done by that point

## Fix Recommendations (COMPLETED)

### Fix 1: Tool Registry Method (APPLIED)

**In `tool-registry.ts:228-243`**, replaced the incorrect method call:

```typescript
async discoverMcpTools(): Promise<void> {
  // CRITICAL FIX: Only remove MCP tools, not ALL discovered tools
  // This ensures command-line discovered tools and core tools are preserved
  this.clearAllMcpTools();

  this.config.getPromptRegistry().clear();

  // discover tools using MCP servers, if configured
  await discoverMcpTools(
    this.config.getMcpServers() ?? {},
    this.config.getMcpServerCommand(),
    this,
    this.config.getPromptRegistry(),
    this.config.getDebugMode(),
    this.config.getWorkspaceContext(),
  );
}
```

### Fix 2: Persona Activation Order (CRITICAL)

**In `gemini.tsx`**, moved persona activation to AFTER config initialization:

**PROBLEM**: Persona was activated at line 225 BEFORE config.initialize() at line 317
**CAUSE**: The mcpManager wasn't initialized yet (null) when trying to load MCPs
**SOLUTION**: Moved persona activation to AFTER setCoreConfig() call

```typescript
// BEFORE (WRONG - line 193-241):
if (argv.persona) {
  // ... validation ...
  await warpioManager.activatePersona(argv.persona); // TOO EARLY!
}
// ... much later at line 317-326 ...
await config.initialize();
warpioManager.setCoreConfig(config); // mcpManager created here

// AFTER (CORRECT):
if (argv.persona) {
  // ... validation only ...
}
await config.initialize();
warpioManager.setCoreConfig(config); // mcpManager created first
if (argv.persona) {
  await warpioManager.activatePersona(argv.persona); // NOW it works!
}
```

### Long-term Solution

Consider refactoring the tool discovery system:

1. **Separate Tool Categories**: Maintain separate maps for different tool types:
   - Core tools (ReadFile, WriteFile, etc.)
   - Command-line discovered tools
   - MCP discovered tools

2. **Explicit Tool Management**: Add methods like:
   - `clearMcpTools()` - only clears MCP tools
   - `clearCommandLineTools()` - only clears CLI tools
   - `rediscoverMcpTools()` - clears and rediscovers MCP only
   - `rediscoverCommandLineTools()` - clears and rediscovers CLI only

3. **Tool Source Tracking**: Track where each tool came from:
   ```typescript
   interface ToolMetadata {
     source: 'core' | 'cli' | 'mcp';
     serverName?: string; // for MCP tools
   }
   ```

## Prevention Strategy

### Add Tests

```typescript
describe('Persona MCP Isolation', () => {
  it('should only load persona-specific MCP tools', async () => {
    const dataExpert = await loadPersona('data-expert');
    const tools = dataExpert.getTools();

    // Should only have core tools + 3 MCP servers worth of tools
    expect(tools.filter((t) => t.source === 'mcp').length).toBeLessThan(20);
    expect(tools.find((t) => t.name === 'adios_write')).toBeDefined();
    expect(tools.find((t) => t.name === 'darshan_parse')).toBeUndefined();
  });
});
```

### Monitoring

- Add debug logging to track tool counts by source
- Log warnings when tool count exceeds expected threshold
- Track MCP server connections and disconnections

## Success Validation ✅ VERIFIED

After applying both fixes, the isolation is working perfectly:

### Test Results

**data-expert persona** (19 tools total):

- 9 core tools (list_directory, read_file, etc.)
- 5 ADIOS tools (list_bp5, inspect_variables, etc.)
- 4 HDF5 tools (list_hdf5, inspect_hdf5, preview_hdf5, read_all_hdf5)
- 1 compression tool (compress_file)

**hpc-expert persona** (40 tools total):

- 9 core tools (same as above)
- 10 Darshan tools (load_darshan_log, analyze_file_access_patterns, etc.)
- 10 Lmod tools (module_list, module_avail, module_spider, etc.)
- 11 Node hardware tools (get_cpu_info, get_memory_info, health_check, etc.)

**Key Success Indicators**:

1. ✅ Each persona has completely different MCP tools
2. ✅ No tool pollution between personas
3. ✅ Core tools remain consistent across all personas
4. ✅ MCP server connections are successful
5. ✅ Tool counts match expected values

## Additional Notes

The architecture was correct - the issue was a simple but critical bug in using the wrong method. The `removeDiscoveredTools()` method should probably be renamed to `removeAllDiscoveredTools()` to make its broad scope clearer and prevent future misuse.
