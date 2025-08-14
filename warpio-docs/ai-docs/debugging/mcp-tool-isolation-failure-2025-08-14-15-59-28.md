# Debug Analysis: MCP Tool Isolation Failure

Generated: 2025-08-14-15-59-28
Severity: Critical
Requested by: User

## Executive Summary

The persona MCP isolation system is failing because the tool registry doesn't properly clear tools when MCPs change. While the MCP configuration updates correctly (shown in CLI output), the actual tools remain from the initial load due to the tool registry maintaining a persistent Map that isn't properly cleared when `discoverMcpTools()` is called.

## Symptom Analysis

- **Observed behavior**: All personas have access to ALL MCP tools regardless of their configuration
- **Expected behavior**: Each persona should only have access to its configured MCP tools
- **Reproduction rate**: 100% - consistent failure across all personas

### Evidence

1. **data-expert persona** (configured with adios, hdf5, compression):
   - Shows correct MCPs in UI: "🔧 Loading MCPs: adios-mcp, hdf5-mcp, compression-mcp"
   - But has access to ArXiv, lmod, plot, node-hardware tools (from other MCPs)

2. **hpc-expert persona** (configured with darshan, lmod, node-hardware):
   - Shows correct MCPs in UI: "🔧 Loading MCPs: darshan-mcp, lmod-mcp, node-hardware-mcp"
   - But has access to ArXiv, ADIOS, HDF5, plot tools (from other MCPs)

## Root Cause Investigation

### Code Flow Analysis

1. **Entry point**: `/packages/cli/src/gemini.tsx:137`
   - Loads settings from `.gemini/settings.json` containing ALL MCPs
   
2. **Settings merge**: `/packages/cli/src/config/settings.ts:116-120`
   - Merges MCPs from user, workspace, and system settings
   - Result: ALL 8 MCPs are loaded into the config

3. **Initial tool discovery**: `/packages/core/src/config/config.ts:773`
   - `discoverAllTools()` called during Config initialization
   - Discovers tools from ALL 8 MCPs and adds to tool registry Map

4. **Persona activation**: `/packages/core/src/warpio/mcp-manager.ts:63-96`
   - Correctly updates `config.mcpServers` with persona-specific MCPs
   - Calls `toolRegistry.discoverMcpTools()` to refresh

5. **Failed isolation**: `/packages/core/src/tools/tool-registry.ts:190-205`
   - `discoverMcpTools()` calls `removeDiscoveredTools()` 
   - But `removeDiscoveredTools()` only removes tools that are instances of `DiscoveredTool` or `DiscoveredMCPTool`
   - **CRITICAL BUG**: Core tools are NOT removed, and MCP tools might not be properly typed

### Root Cause

The tool registry's `removeDiscoveredTools()` method (line 153-159) has two critical issues:

1. **Incomplete tool removal**: Only removes tools that are `instanceof DiscoveredTool` or `DiscoveredMCPTool`, but not all MCP tools might match these types
2. **No validation of tool source**: Doesn't verify which MCP server a tool came from before removal
3. **Registry persistence**: The tool Map persists across MCP changes without proper cleanup

## Fix Recommendations

### Immediate Fix

1. **Enhanced tool removal in tool-registry.ts**:
```typescript
// In tool-registry.ts:153-159, replace removeDiscoveredTools with:
private removeDiscoveredTools(): void {
  const toolsToRemove: string[] = [];
  for (const [name, tool] of this.tools.entries()) {
    // Remove ALL discovered tools (MCP and command-line)
    if (tool instanceof DiscoveredTool || tool instanceof DiscoveredMCPTool) {
      toolsToRemove.push(name);
    }
  }
  
  // Clear all discovered tools
  for (const name of toolsToRemove) {
    this.tools.delete(name);
  }
}
```

2. **Add explicit MCP tool clearing**:
```typescript
// New method in tool-registry.ts
clearAllMcpTools(): void {
  const toolsToRemove: string[] = [];
  for (const [name, tool] of this.tools.entries()) {
    // Check if it's an MCP tool by any means
    if (tool instanceof DiscoveredMCPTool || 
        (tool as any).serverName !== undefined) {
      toolsToRemove.push(name);
    }
  }
  
  for (const name of toolsToRemove) {
    this.tools.delete(name);
  }
}
```

3. **Update MCP Manager to ensure clean slate**:
```typescript
// In mcp-manager.ts:loadPersonaMCPs()
async loadPersonaMCPs(persona: WarpioPersonaDefinition): Promise<void> {
  // ... existing code ...
  
  // CRITICAL: Clear ALL MCP tools before loading new ones
  const toolRegistry = await this.config.getToolRegistry();
  if (typeof (toolRegistry as any).clearAllMcpTools === 'function') {
    (toolRegistry as any).clearAllMcpTools();
  }
  
  // Update MCP servers
  this.config.updateMcpServers(mcpServers);
  
  // Discover new tools
  await toolRegistry.discoverMcpTools();
}
```

### Long-term Solution

1. **Tool Registry Refactoring**:
   - Maintain separate Maps for core tools vs MCP tools
   - Track tool source (which MCP server) in tool metadata
   - Implement proper tool lifecycle management

2. **MCP Isolation Architecture**:
   - Create separate tool registry instances per persona
   - OR implement tool filtering at the registry level
   - Add validation to ensure tools match current MCP configuration

3. **Testing Infrastructure**:
   - Add unit tests for tool isolation
   - Add integration tests for persona MCP switching
   - Implement tool count validation

## Prevention Strategy

### Immediate Actions

1. **Add debug logging**:
   - Log tool count before/after MCP changes
   - Log which tools are being removed/added
   - Track tool source MCP server

2. **Add validation**:
   - After loading persona MCPs, validate tool count matches expected
   - Check that only expected MCP tools are available
   - Fail fast if isolation is broken

### Long-term Improvements

1. **Architectural changes**:
   - Decouple tool discovery from Config initialization
   - Make tool registry MCP-aware with proper isolation
   - Consider using dependency injection for tool registry

2. **Testing**:
   - Unit tests for `removeDiscoveredTools()`
   - Integration tests for persona switching
   - E2E tests validating tool isolation

3. **Monitoring**:
   - Add metrics for tool registry size
   - Track MCP discovery performance
   - Monitor tool usage by persona

## Implementation Priority

1. **Critical (Now)**: Fix `removeDiscoveredTools()` to properly clear all MCP tools
2. **High (Next)**: Add `clearAllMcpTools()` method and use in MCP manager
3. **Medium (Later)**: Refactor tool registry for better isolation
4. **Low (Future)**: Add comprehensive testing and monitoring

## Success Metrics

- [ ] `data-expert` persona has exactly 3 MCP tool sets (adios, hdf5, compression)
- [ ] `hpc-expert` persona has exactly 3 different MCP tool sets (darshan, lmod, node-hardware)
- [ ] No tool leakage between personas
- [ ] Tool discovery completes in < 2 seconds per persona
- [ ] Zero regression in existing functionality

## Related Files

- `/packages/core/src/tools/tool-registry.ts` - Tool registry with broken removal
- `/packages/core/src/warpio/mcp-manager.ts` - MCP isolation logic
- `/packages/core/src/config/config.ts` - Config and MCP server management
- `/packages/cli/src/config/settings.ts` - Settings merging that loads all MCPs
- `.gemini/settings.json` - Global MCP definitions causing the initial load