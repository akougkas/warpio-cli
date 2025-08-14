# MCP Isolation Fix Summary

Generated: 2025-08-14-16-13-48
Type: Bug Fix Implementation
Status: ✅ COMPLETED

## Problem Statement

MCP tool isolation for Warpio personas was completely broken. All personas were getting the same tool sets regardless of their configured MCPs, defeating the purpose of persona-specific tool isolation.

## Root Causes Identified

### Issue 1: Wrong Tool Removal Method

- **Location**: `/packages/core/src/tools/tool-registry.ts:230`
- **Problem**: `discoverMcpTools()` was calling `removeDiscoveredTools()` which removes ALL discovered tools (MCP + command-line), then only re-discovering MCP tools
- **Impact**: Lost command-line discovered tools on every persona switch

### Issue 2: Initialization Order Bug

- **Location**: `/packages/cli/src/gemini.tsx:225`
- **Problem**: Persona activation happened BEFORE `config.initialize()` and `setCoreConfig()`
- **Impact**: `mcpManager` was null when trying to load persona MCPs, so no MCPs were ever loaded

## Fixes Applied

### Fix 1: Corrected Tool Registry Method

```typescript
// /packages/core/src/tools/tool-registry.ts
async discoverMcpTools(): Promise<void> {
  // Changed from: this.removeDiscoveredTools(); // WRONG!
  this.clearAllMcpTools(); // CORRECT - only clears MCP tools

  this.config.getPromptRegistry().clear();
  await discoverMcpTools(...);
}
```

### Fix 2: Fixed Initialization Order

```typescript
// /packages/cli/src/gemini.tsx
// MOVED persona activation from line 225 to AFTER line 323

// BEFORE (wrong order):
if (argv.persona) {
  await warpioManager.activatePersona(argv.persona); // Too early!
}
// ... 100 lines later ...
await config.initialize();
warpioManager.setCoreConfig(config);

// AFTER (correct order):
await config.initialize();
warpioManager.setCoreConfig(config); // Sets up mcpManager
if (argv.persona) {
  await warpioManager.activatePersona(argv.persona); // Now works!
}
```

### Fix 3: Cleaned Up Redundant Code

- Removed redundant `clearAllMcpTools()` calls in `mcp-manager.ts`
- Added debug logging for troubleshooting
- Simplified the MCP loading flow

## Test Results

### Before Fix

- All personas had identical tools (50+ tools each)
- MCPs showed as loading but weren't actually discovered
- Tool isolation completely broken

### After Fix

✅ **data-expert**: 19 tools (9 core + 10 from ADIOS/HDF5/compression MCPs)
✅ **hpc-expert**: 40 tools (9 core + 31 from Darshan/Lmod/node-hardware MCPs)
✅ **Complete isolation**: No shared MCP tools between personas

## Files Modified

1. `/packages/core/src/tools/tool-registry.ts` - Fixed tool removal method
2. `/packages/cli/src/gemini.tsx` - Fixed initialization order
3. `/packages/core/src/warpio/mcp-manager.ts` - Cleaned up redundant code
4. `/packages/core/src/tools/mcp-client.ts` - Added debug logging

## Verification Commands

```bash
# Test data-expert persona
npx warpio --persona data-expert -p "list tools"
# Should show: ADIOS, HDF5, compression tools

# Test hpc-expert persona
npx warpio --persona hpc-expert -p "list tools"
# Should show: Darshan, Lmod, node-hardware tools

# Debug mode to see MCP discovery
DEBUG_MODE=true npx warpio --persona data-expert -p "test"
```

## Lessons Learned

1. **Initialization order matters**: Always ensure dependencies are initialized before use
2. **Method naming clarity**: `removeDiscoveredTools()` should be `removeAllDiscoveredTools()` to prevent misuse
3. **Debug logging is essential**: Added logging helped quickly identify the initialization order issue
4. **Test isolation thoroughly**: Need automated tests for persona MCP isolation

## Next Steps

1. Add automated tests for persona MCP isolation
2. Consider renaming ambiguous methods for clarity
3. Document the initialization order requirements
4. Add health checks for MCP loading status

## Impact

This fix enables the core feature of Warpio personas - isolated tool environments for different scientific computing tasks. Users can now switch between specialized personas with confidence that each has only the appropriate tools for its domain.
