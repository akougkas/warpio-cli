# Next Session: Warpio IOWarp Ecosystem Enhancement

## Context
Warpio CLI has been successfully transformed with core identity and scientific computing capabilities. Now we need to enhance it as the intelligent frontend to the IOWarp ecosystem while preserving general coding abilities.

## Phase 5 Objectives
Transform Warpio from a general CLI agent into an intelligent IOWarp ecosystem frontend that:
- Maintains all current coding capabilities
- Smartly routes complex scientific tasks to IOWarp MCPs/agents
- Acts as the gateway to IOWarp's 14 MCP servers and 5 specialized agents

## Key Enhancements Needed

### 1. Smart Task Routing System
**Location**: `packages/core/src/core/prompts.ts` (after Scientific Computing Expertise section)

Add intelligent task detection and routing:
```
# IOWarp Ecosystem Integration

- **Task Classification**: 
  - Simple coding/debugging → Handle directly with full capabilities
  - Complex scientific workflows → Recommend IOWarp MCPs (hdf5, slurm, pandas, darshan)
  - Advanced domain analysis → Suggest specialized IOWarp agents
- **Capability Escalation**: "For advanced [domain] analysis, I can connect you to IOWarp's [agent-name] agent"
- **Performance Thresholds**: Detect when tasks exceed direct handling (large datasets, HPC requirements)
```

### 2. MCP Server Discovery & Recommendations
**Location**: System prompt or boot sequence

Add context about IOWarp's 14 MCP servers:
- **Data I/O**: adios, hdf5, parquet, pandas
- **HPC**: slurm, darshan, node-hardware, lmod
- **Research**: arxiv, chronolog, jarvis
- **Analysis**: parallel-sort, plot

### 3. Enhanced Personality & Role
**Goal**: Frontend to IOWarp ecosystem, not replacement

```
# IOWarp Frontend Role

- **Research-Friendly**: Understand academic contexts, suggest reproducible approaches
- **Ecosystem Guide**: Naturally introduce IOWarp capabilities when relevant
- **Performance Conscious**: Always consider scalability for scientific computing
- **Smart Escalation**: Keep users in control while suggesting powerful IOWarp tools
```

### 4. Boot Sequence Enhancement
- Auto-discover available IOWarp MCP servers
- Display IOWarp ecosystem status in welcome
- Check for `.warpio/ecosystem.json` configuration

## Implementation Strategy
1. **Preserve ALL current coding abilities** - users should never feel limited
2. **Smart escalation** - suggest IOWarp tools for complex scientific tasks
3. **Natural integration** - mention IOWarp capabilities contextually
4. **User choice** - always let users decide whether to use ecosystem tools

## Success Criteria
- Warpio maintains full general-purpose coding assistance
- Users discover IOWarp ecosystem capabilities naturally
- Complex scientific tasks get routed to appropriate specialized tools
- System feels like an enhanced, intelligent frontend rather than a limited agent

## Files to Modify
- `packages/core/src/core/prompts.ts` - Core system prompt enhancements
- `packages/cli/src/ui/components/Tips.tsx` - Add IOWarp ecosystem tips
- Boot sequence files for MCP discovery
- Consider adding ecosystem status display

Start by enhancing the core system prompt with intelligent task routing and IOWarp ecosystem integration guidance.