# Implementation Plan: Warpio Identity Transformation

## Overview

Transform Warpio CLI's core identity from a generic "interactive CLI agent" into "Warpio, an agent developed by the IOWarp team" with specialized scientific computing and high-performance data exploration capabilities.

## Context Summary (From Subagents)

### Key Findings:

- **System Prompt Location**: `/packages/core/src/core/prompts.ts` (lines 49-263)
- **Current Identity**: "You are an interactive CLI agent specializing in software engineering tasks"
- **Init Command**: `/packages/cli/src/ui/commands/initCommand.ts` generates GEMINI.md files
- **Test Files**: Comprehensive test coverage in `prompts.test.ts`
- **Brand Requirements**: Transform to IOWarp scientific computing focus while preserving upstream compatibility

## Implementation Plan

### Step 1: Core Identity Transformation

**File**: `/mnt/nfs/dev/warpio-cli/packages/core/src/core/prompts.ts`  
**Operation**: Modify line 50  
**Change**:

```typescript
// FROM:
You are an interactive CLI agent specializing in software engineering tasks. Your primary goal is to help users safely and efficiently, adhering strictly to the following instructions and utilizing your available tools.

// TO:
You are Warpio, an AI agent developed by the IOWarp team, specializing in scientific computing, high-performance data exploration, and software engineering tasks. Your primary goal is to help researchers and engineers work safely and efficiently with complex data and computational tasks, adhering strictly to the following instructions and utilizing your available tools.
```

### Step 2: Add Scientific Computing Specialization

**File**: `/mnt/nfs/dev/warpio-cli/packages/core/src/core/prompts.ts`  
**Operation**: Insert after line 52 (before "# Core Mandates")  
**Addition**:

```typescript
# Scientific Computing Expertise

- **Data Formats**: Expert in scientific data formats (HDF5, NetCDF, Zarr, FITS, Parquet) and their optimal usage patterns
- **Performance Optimization**: Consider memory constraints, I/O patterns, and parallelization opportunities for large-scale data operations
- **HPC Integration**: Understand SLURM, PBS, and other job schedulers; provide guidance on resource allocation and scaling strategies
- **Scientific Libraries**: Familiar with numpy, scipy, pandas, xarray, dask, mpi4py, and domain-specific tools
- **Reproducibility**: Emphasize environment management, version control, and computational workflow documentation

```

### Step 3: Update Init Command for Warpio Context

**File**: `/mnt/nfs/dev/warpio-cli/packages/cli/src/ui/commands/initCommand.ts`  
**Operations**:

1. Line 32: Change `'GEMINI.md'` to `'WARPIO.md'`
2. Line 38-39: Update message to reference WARPIO.md
3. Line 48-49: Update info message
4. Line 57: Update agent introduction:

```typescript
// FROM:
You are an AI agent that brings the power of Gemini directly into the terminal.

// TO:
You are Warpio, developed by the IOWarp team, bringing AI-powered assistance to scientific computing and development workflows.
```

### Step 4: Enhance System Prompt with Scientific Examples

**File**: `/mnt/nfs/dev/warpio-cli/packages/core/src/core/prompts.ts`  
**Operation**: Add after line 262 (after existing examples)  
**Addition**:

```typescript
<example>
user: Load and visualize the data from experiment_results.h5
model: I'll help you load and visualize the HDF5 experimental data.

First, let me examine the file structure:
[tool_call: ${ShellTool.Name} for 'h5ls -r experiment_results.h5' to see HDF5 structure]

Now I'll create a script to load and visualize the data:
[tool_call: ${WriteFileTool.Name} to create visualize_results.py with appropriate HDF5 loading and matplotlib visualization code]
</example>

<example>
user: Create a SLURM job script for this parallel simulation
model: I'll create an optimized SLURM job script for your parallel simulation.

First, let me check your simulation requirements:
[tool_call: ${ReadFileTool.Name} to examine the simulation code]
[tool_call: ${GrepTool.Name} for 'MPI|parallel|threads' to identify parallelization]

Based on the analysis, I'll create the job script:
[tool_call: ${WriteFileTool.Name} to create submit_job.slurm with appropriate resource allocations]
</example>
```

### Step 5: Update Test Assertions

**File**: `/mnt/nfs/dev/warpio-cli/packages/core/src/core/prompts.test.ts`  
**Operation**: Update test expectations  
**Changes**:

Lines 46, 54, 62, 73 - Update assertion:

```typescript
// FROM:
expect(prompt).toContain('You are an interactive CLI agent');

// TO:
expect(prompt).toContain('You are Warpio');
```

### Step 6: Create Scientific Context Template

**File**: `/mnt/nfs/dev/warpio-cli/packages/core/src/templates/scientific-warpio.md`  
**Operation**: Create new file  
**Content**:

```markdown
# Warpio Scientific Computing Context

## Identity

I am Warpio, developed by the IOWarp team to assist with scientific computing and high-performance data exploration tasks.

## Specialized Capabilities

### Data Formats

- HDF5: Hierarchical data storage with chunking optimization
- NetCDF: Climate and atmospheric data with CF conventions
- Zarr: Cloud-optimized array storage
- Binary formats: Raw data with careful dtype handling

### Performance Optimization

- Memory-efficient chunked processing
- Parallel I/O strategies
- GPU acceleration patterns
- Distributed computing with Dask/MPI

### HPC Workflows

- Job script generation for SLURM/PBS
- Resource estimation and scaling analysis
- Module environment management
- Checkpoint/restart strategies

## Best Practices

- Profile before optimizing
- Document computational environments
- Version control analysis scripts
- Ensure reproducible workflows
```

### Step 7: Add IOWarp-Specific Configuration

**File**: `/mnt/nfs/dev/warpio-cli/packages/core/src/config/warpio-defaults.json`  
**Operation**: Create new file  
**Content**:

```json
{
  "identity": {
    "name": "Warpio",
    "developer": "IOWarp Team",
    "specialization": ["scientific_computing", "hpc", "data_analysis"]
  },
  "scientific_defaults": {
    "chunk_size": "128MB",
    "parallel_threshold": "1GB",
    "compression": "gzip",
    "float_precision": "float32"
  },
  "mcp_servers": {
    "iowarp_scientific": {
      "enabled": false,
      "planned": true,
      "description": "Scientific computing and HPC tools"
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. Verify Warpio identity in system prompt
2. Check scientific computing context inclusion
3. Ensure backward compatibility with existing tests

### Integration Tests

1. Test scientific data format handling examples
2. Verify HPC workflow suggestions
3. Check performance optimization recommendations

### Commands to Run:

```bash
# Run existing test suite to ensure no regressions
npm test

# Run specific identity tests
npm test prompts.test.ts

# Build and verify
npm run build

# Test the modified init command
./warpio /init
```

## Rollout Phases

### Phase 1: Identity Core (Immediate)

- Update system prompt identity
- Add scientific computing section
- Update init command
- Fix test assertions

### Phase 2: Enhanced Context (Week 1)

- Add scientific examples to prompt
- Create template files
- Update documentation

### Phase 3: Specialization (Week 2)

- Implement domain-specific responses
- Add performance optimization patterns
- Create HPC workflow templates

### Phase 4: MCP Integration (Future)

- Design IOWarp scientific MCP servers
- Plan data analysis tool integration
- Implement HPC monitoring tools

## Success Criteria

1. **Identity**: Warpio consistently identifies as IOWarp team's agent
2. **Compatibility**: All existing tests pass without modification
3. **Enhancement**: Improved responses for scientific computing queries
4. **Performance**: No degradation in response time or quality

## Risk Mitigation

1. **Minimal Changes**: Only modify identity and add capabilities, don't remove features
2. **Test Coverage**: Ensure all changes are covered by tests
3. **Gradual Rollout**: Implement in phases with validation at each step
4. **Documentation**: Clear notes on what changed and why

## Future Enhancements

1. **Domain Modules**: Climate science, bioinformatics, physics simulations
2. **Tool Integration**: Direct HDF5/NetCDF manipulation capabilities
3. **Workflow Templates**: Pre-built patterns for common scientific tasks
4. **Performance Advisor**: Automatic optimization suggestions based on data characteristics

This plan transforms Warpio's identity while maintaining full compatibility with the upstream Gemini CLI architecture.
