# MCP Isolation Fix - Root Cause Analysis Update

Generated: 2025-08-14-16-15-00
Severity: Critical

## Root Cause - Timing Issue

The real issue is **initialization order**:

1. `gemini.tsx:137` - Settings loaded with ALL MCPs from `.gemini/settings.json`
2. `gemini.tsx:154` - Config created with ALL MCPs passed to it
3. `config.ts:361` - Config constructor calls `createToolRegistry()`
4. `config.ts:773` - `createToolRegistry()` calls `discoverAllTools()`
5. ALL MCP tools are discovered and loaded into registry
6. `gemini.tsx:323` - ONLY NOW we set core config for personas
7. Persona activation tries to clear tools but they're already loaded

## The Problem

By the time personas try to isolate MCPs, the damage is done - all tools are already discovered and registered. The `clearAllMcpTools()` method doesn't help because:

1. Tools are already discovered
2. The AI model has already been initialized with all tools
3. The tool registry clearing happens too late

## Correct Solution

We need to **prevent initial MCP loading** when a persona is specified:

### Option 1: Strip MCPs from Config when Persona is Active

```typescript
// In cli/src/config/config.ts loadCliConfig():
let mcpServers = mergeMcpServers(settings, activeExtensions);

// If persona is specified, don't load any MCPs initially
// The persona will load its own MCPs later
if (argv.persona) {
  mcpServers = {};
}
```

### Option 2: Delay Tool Discovery

```typescript
// In core/src/config/config.ts constructor:
// Only discover tools if no persona will be activated
if (!params.skipInitialToolDiscovery) {
  this.toolRegistry = await this.createToolRegistry();
}
```

### Option 3: Full Isolation Architecture

Create separate Config instances per persona with only their MCPs.

## Recommended Fix (Option 1)

The simplest and most effective fix is to prevent MCPs from being loaded initially when a persona is specified.

### Implementation

1. **Modify `loadCliConfig` in `cli/src/config/config.ts`**:
   - Check if `argv.persona` is specified
   - If yes, pass empty MCPs to Config
   - Persona will load its own MCPs later

2. **Ensure persona MCP loading works**:
   - Persona activation loads its MCPs
   - Tool discovery happens with only persona MCPs
   - True isolation achieved

### Benefits

- Minimal code changes
- No architecture changes needed
- Works with existing persona system
- Clean isolation from the start

## Why Previous Fix Failed

The previous fix attempted to clear tools after they were loaded, but:

1. Tools were already discovered during Config initialization
2. The AI model was initialized with all tools visible
3. Clearing the registry doesn't affect the model's tool knowledge

The correct approach is to **prevent** the tools from being loaded in the first place, not try to remove them after.
