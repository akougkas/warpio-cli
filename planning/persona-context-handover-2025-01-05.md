# Implementation Plan: Persona Context Handover System

## Overview

This plan details the implementation of a revolutionary persona context handover system for Warpio CLI that enables seamless chaining of multiple Warpio instances with different personas for complex multi-agent workflows.

## Vision

Enable scenarios like:

1. **Data-IO Expert** → reads/processes scientific data → hands off to **Visualization Expert** for charts
2. **HPC Expert** → analyzes system resources → delegates to **Performance Expert** for optimization
3. **Research Expert** → processes papers → passes context to **Workflow Expert** for automation

## Architecture Design

### 1. Context Exchange Protocol

#### Context File Format

We'll use JSON format for structured context exchange with the following schema:

```typescript
interface ContextHandover {
  // Metadata
  version: '1.0.0';
  timestamp: string;
  handoverId: string; // UUID for tracking

  // Source persona info
  source: {
    persona: string;
    sessionId: string;
    workingDirectory: string;
    environment: Record<string, string>;
  };

  // Target persona info
  target: {
    persona: string;
    task: string;
    interactive: boolean;
    returnResults: boolean;
  };

  // Work artifacts
  artifacts: {
    files: Array<{
      path: string;
      type: 'data' | 'code' | 'analysis' | 'document';
      description: string;
      format?: string; // e.g., "hdf5", "parquet", "jupyter"
    }>;
    data: Record<string, any>; // Structured data to pass
    insights: string[]; // Key findings/recommendations
  };

  // Execution context
  context: {
    history: Array<{
      persona: string;
      task: string;
      summary: string;
      timestamp: string;
    }>;
    mcpServers?: string[]; // Active MCP servers
    memorySnapshot?: string; // Optional memory state
  };

  // Results (filled by target persona)
  results?: {
    status: 'success' | 'failure' | 'partial';
    output?: string;
    artifacts?: string[]; // New files created
    error?: string;
    nextSteps?: string[];
  };
}
```

### 2. CLI Interface Extensions

#### New Command Line Arguments

```typescript
// In packages/cli/src/config/config.ts - extend CliArgs interface
export interface CliArgs {
  // ... existing args ...

  // Context handover arguments
  contextFrom?: string; // Path to context file from invoking persona
  contextReturn?: string; // Path to write results back
  nonInteractive?: boolean; // Run in batch mode
  handoverTimeout?: number; // Timeout for batch execution (ms)
  contextFormat?: 'json' | 'yaml'; // Context file format (default: json)
}
```

#### Updated parseArguments Function

```typescript
// In parseArguments() function, add:
.option('context-from', {
  type: 'string',
  description: 'Load context from another Warpio persona execution',
})
.option('context-return', {
  type: 'string',
  description: 'Path to write execution results for handover',
})
.option('non-interactive', {
  type: 'boolean',
  description: 'Run in non-interactive batch mode for handovers',
  default: false,
})
.option('handover-timeout', {
  type: 'number',
  description: 'Timeout for batch execution in milliseconds',
  default: 300000, // 5 minutes
})
```

### 3. Core Components

#### A. ContextHandoverService

Create `/packages/core/src/services/contextHandoverService.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { ContextHandover } from '../types/contextHandover.js';

export class ContextHandoverService {
  private static readonly CONTEXT_DIR = path.join(
    process.env.HOME || '',
    '.warpio',
    'handovers',
  );

  /**
   * Initialize handover directory
   */
  static initialize(): void {
    if (!fs.existsSync(this.CONTEXT_DIR)) {
      fs.mkdirSync(this.CONTEXT_DIR, { recursive: true });
    }
  }

  /**
   * Create a context handover file
   */
  static async createHandover(params: {
    sourcePersona: string;
    targetPersona: string;
    task: string;
    artifacts: ContextHandover['artifacts'];
    sessionId: string;
    interactive?: boolean;
  }): Promise<string> {
    this.initialize();

    const handoverId = uuidv4();
    const handover: ContextHandover = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      handoverId,
      source: {
        persona: params.sourcePersona,
        sessionId: params.sessionId,
        workingDirectory: process.cwd(),
        environment: this.getRelevantEnv(),
      },
      target: {
        persona: params.targetPersona,
        task: params.task,
        interactive: params.interactive ?? false,
        returnResults: true,
      },
      artifacts: params.artifacts,
      context: {
        history: [], // Will be populated from conversation history
        mcpServers: this.getActiveMcpServers(),
      },
    };

    const contextPath = path.join(
      this.CONTEXT_DIR,
      `handover-${handoverId}.json`,
    );

    await fs.promises.writeFile(contextPath, JSON.stringify(handover, null, 2));

    return contextPath;
  }

  /**
   * Load a context handover file
   */
  static async loadHandover(contextPath: string): Promise<ContextHandover> {
    const content = await fs.promises.readFile(contextPath, 'utf-8');
    return JSON.parse(content) as ContextHandover;
  }

  /**
   * Execute a persona with context handover
   */
  static async executeWithHandover(params: {
    targetPersona: string;
    contextPath: string;
    interactive?: boolean;
    timeout?: number;
  }): Promise<ContextHandover> {
    const args = [
      '--persona',
      params.targetPersona,
      '--context-from',
      params.contextPath,
    ];

    if (!params.interactive) {
      args.push('--non-interactive');
    }

    return new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [path.join(process.cwd(), 'dist', 'cli.js'), ...args],
        {
          stdio: params.interactive ? 'inherit' : 'pipe',
          env: {
            ...process.env,
            WARPIO_HANDOVER_MODE: '1',
          },
          timeout: params.timeout,
        },
      );

      let output = '';
      if (!params.interactive) {
        child.stdout?.on('data', (data) => {
          output += data.toString();
        });
        child.stderr?.on('data', (data) => {
          output += data.toString();
        });
      }

      child.on('exit', async (code) => {
        try {
          // Re-read the context file for results
          const updatedHandover = await this.loadHandover(params.contextPath);

          if (!params.interactive && !updatedHandover.results) {
            updatedHandover.results = {
              status: code === 0 ? 'success' : 'failure',
              output,
            };
          }

          resolve(updatedHandover);
        } catch (error) {
          reject(error);
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * Get relevant environment variables for handover
   */
  private static getRelevantEnv(): Record<string, string> {
    const relevantVars = [
      'SLURM_JOB_ID',
      'PBS_JOBID',
      'LSF_JOBID',
      'CUDA_VISIBLE_DEVICES',
      'OMP_NUM_THREADS',
      'MKL_NUM_THREADS',
      'PYTHONPATH',
      'LD_LIBRARY_PATH',
      'MODULE_PATH',
      'CONDA_DEFAULT_ENV',
    ];

    return relevantVars.reduce(
      (acc, varName) => {
        if (process.env[varName]) {
          acc[varName] = process.env[varName]!;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  /**
   * Get list of active MCP servers
   */
  private static getActiveMcpServers(): string[] {
    // TODO: Implement by querying active MCP connections
    return [];
  }
}
```

#### B. Handover Commands

Create `/packages/core/src/tools/handoverTool.ts`:

```typescript
import { z } from 'zod';
import { ToolImplementation } from '../types/tools.js';
import { ContextHandoverService } from '../services/contextHandoverService.js';

const handoverSchema = z.object({
  targetPersona: z
    .string()
    .describe('Target persona name (e.g., analysis-expert)'),
  task: z.string().describe('Specific task for the target persona'),
  files: z
    .array(
      z.object({
        path: z.string(),
        type: z.enum(['data', 'code', 'analysis', 'document']),
        description: z.string(),
      }),
    )
    .optional()
    .describe('Files to share with target persona'),
  data: z.record(z.any()).optional().describe('Structured data to pass'),
  insights: z.array(z.string()).optional().describe('Key insights to share'),
  interactive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Run target persona interactively'),
  waitForResults: z
    .boolean()
    .optional()
    .default(true)
    .describe('Wait for target persona to complete'),
});

export const handoverTool: ToolImplementation = {
  name: 'handover_to_persona',
  description: 'Hand over work to another Warpio persona with context',
  inputSchema: handoverSchema,
  execute: async (args, context) => {
    const { config } = context;
    const currentPersona = config.getActivePersona();

    if (!currentPersona) {
      throw new Error('No active persona for handover');
    }

    // Create handover context
    const contextPath = await ContextHandoverService.createHandover({
      sourcePersona: currentPersona.name,
      targetPersona: args.targetPersona,
      task: args.task,
      artifacts: {
        files: args.files || [],
        data: args.data || {},
        insights: args.insights || [],
      },
      sessionId: config.getSessionId(),
      interactive: args.interactive,
    });

    // Execute if waiting for results
    if (args.waitForResults) {
      const result = await ContextHandoverService.executeWithHandover({
        targetPersona: args.targetPersona,
        contextPath,
        interactive: args.interactive,
        timeout: 300000, // 5 minutes
      });

      return {
        success: result.results?.status === 'success',
        handoverId: result.handoverId,
        contextPath,
        results: result.results,
      };
    }

    // Just return the context path for async execution
    return {
      success: true,
      contextPath,
      message: `Context prepared for ${args.targetPersona}. Execute: warpio --persona ${args.targetPersona} --context-from ${contextPath}`,
    };
  },
};
```

### 4. Integration Points

#### A. System Prompt Enhancement

Update `/packages/core/src/core/prompts.ts` to include handover context:

```typescript
// In getCoreSystemPrompt function, add after persona prefix:

// Add handover context if present
let handoverContext = '';
if (process.env.WARPIO_HANDOVER_MODE === '1' && contextHandover) {
  handoverContext = `
## Context Handover

You are receiving work from the ${contextHandover.source.persona} persona.

**Task**: ${contextHandover.target.task}

**Previous Work Context**:
${contextHandover.context.history
  .map((h) => `- ${h.persona}: ${h.summary}`)
  .join('\n')}

**Shared Artifacts**:
${contextHandover.artifacts.files
  .map((f) => `- ${f.type}: ${f.path} - ${f.description}`)
  .join('\n')}

**Key Insights from Previous Persona**:
${contextHandover.artifacts.insights.join('\n')}

**Instructions**: Focus on the specific task provided. Build upon the work already done. When complete, summarize your results for potential handover to the next persona.

---

`;
}

return personaPrefix + handoverContext + basePrompt + memorySuffix;
```

#### B. Boot Sequence Updates

Update `/packages/cli/src/gemini.tsx` to handle context loading:

```typescript
// After config loading, before main app start:

if (config.contextFrom) {
  try {
    const handover = await ContextHandoverService.loadHandover(
      config.contextFrom,
    );

    // Validate persona matches
    if (config.persona && config.persona !== handover.target.persona) {
      console.warn(
        `Warning: Context expects persona '${handover.target.persona}' ` +
          `but running as '${config.persona}'`,
      );
    }

    // Set up environment
    Object.entries(handover.source.environment).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });

    // Change to source working directory if different
    if (handover.source.workingDirectory !== process.cwd()) {
      console.log(`Changing directory to: ${handover.source.workingDirectory}`);
      process.chdir(handover.source.workingDirectory);
    }

    // Store handover in config for system prompt
    config.setContextHandover(handover);

    // If non-interactive, set up the prompt
    if (config.nonInteractive && !config.question) {
      config.question = handover.target.task;
    }
  } catch (error) {
    console.error('Failed to load handover context:', error);
    process.exit(1);
  }
}
```

### 5. Scientific Workflow Examples

#### A. HDF5 to Visualization Pipeline

```typescript
// In data-expert persona:
await handoverTool.execute({
  targetPersona: 'analysis-expert',
  task: 'Create time series plots from the processed HDF5 data',
  files: [
    {
      path: '/data/processed_sensor_data.h5',
      type: 'data',
      description: 'Cleaned sensor readings with 1Hz sampling rate',
    },
  ],
  data: {
    timeRange: { start: '2024-01-01', end: '2024-12-31' },
    variables: ['temperature', 'pressure', 'humidity'],
  },
  insights: [
    'Data has been cleaned and outliers removed',
    'Missing values interpolated using cubic spline',
    'Seasonal patterns detected in temperature data',
  ],
  interactive: false,
  waitForResults: true,
});
```

#### B. SLURM Job Analysis Chain

```typescript
// In hpc-expert persona:
await handoverTool.execute({
  targetPersona: 'workflow-expert',
  task: 'Create automated workflow for similar job submissions',
  files: [
    {
      path: '/jobs/optimization_results.json',
      type: 'analysis',
      description: 'Performance metrics from 100 job runs',
    },
  ],
  data: {
    optimalNodes: 64,
    optimalTasksPerNode: 32,
    memoryPerTask: '4GB',
    walltimeEstimate: '02:00:00',
  },
  insights: [
    'Jobs scale efficiently up to 64 nodes',
    'Memory bottleneck identified at 2GB per task',
    'GPU utilization peaks at 85% with current settings',
  ],
});
```

### 6. Error Handling & Recovery

```typescript
// In ContextHandoverService.executeWithHandover:

// Add retry logic
let attempts = 0;
const maxAttempts = 3;

while (attempts < maxAttempts) {
  try {
    const result = await this.attemptExecution(params);
    return result;
  } catch (error) {
    attempts++;
    if (attempts >= maxAttempts) {
      // Save error state to handover file
      const handover = await this.loadHandover(params.contextPath);
      handover.results = {
        status: 'failure',
        error: error.message,
        artifacts: [],
      };
      await this.saveHandover(params.contextPath, handover);
      throw error;
    }
    // Exponential backoff
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 * Math.pow(2, attempts)),
    );
  }
}
```

### 7. Security Considerations

```typescript
// In ContextHandoverService:

/**
 * Validate handover file for security
 */
private static async validateHandover(
  handover: ContextHandover
): Promise<void> {
  // Check file paths are within allowed directories
  const allowedPaths = [
    process.cwd(),
    path.join(process.env.HOME || '', '.warpio'),
    '/tmp',
    '/scratch', // HPC scratch space
  ];

  for (const file of handover.artifacts.files) {
    const resolvedPath = path.resolve(file.path);
    const isAllowed = allowedPaths.some(allowed =>
      resolvedPath.startsWith(path.resolve(allowed))
    );

    if (!isAllowed) {
      throw new Error(
        `Security: File path outside allowed directories: ${file.path}`
      );
    }
  }

  // Validate environment variables
  const dangerousVars = ['PATH', 'LD_PRELOAD', 'NODE_OPTIONS'];
  for (const varName of dangerousVars) {
    if (handover.source.environment[varName]) {
      throw new Error(
        `Security: Cannot override system variable: ${varName}`
      );
    }
  }
}
```

## Step-by-Step Implementation

### Step 1: Create Type Definitions

- File: `/packages/core/src/types/contextHandover.ts`
- Operation: Create
- Code: Define `ContextHandover` interface and related types

### Step 2: Implement ContextHandoverService

- File: `/packages/core/src/services/contextHandoverService.ts`
- Operation: Create
- Code: Full service implementation with all methods

### Step 3: Update CLI Arguments

- File: `/packages/cli/src/config/config.ts`
- Operation: Modify
- Code: Add new CLI arguments to `CliArgs` interface and `parseArguments`

### Step 4: Create Handover Tool

- File: `/packages/core/src/tools/handoverTool.ts`
- Operation: Create
- Code: Implement the handover tool for personas to use

### Step 5: Update System Prompt

- File: `/packages/core/src/core/prompts.ts`
- Operation: Modify
- Code: Add handover context to system prompt generation

### Step 6: Update Boot Sequence

- File: `/packages/cli/src/gemini.tsx`
- Operation: Modify
- Code: Add context loading logic before app initialization

### Step 7: Update Config Class

- File: `/packages/core/src/config/config.ts`
- Operation: Modify
- Code: Add `contextHandover` property and getter/setter methods

### Step 8: Add Tool Registration

- File: `/packages/core/src/tools/index.ts`
- Operation: Modify
- Code: Register `handoverTool` in the tools registry

### Step 9: Create Tests

- File: `/packages/core/src/services/contextHandoverService.test.ts`
- Operation: Create
- Code: Comprehensive test suite for handover service

### Step 10: Update Documentation

- File: `/docs/persona-handover.md`
- Operation: Create
- Code: User documentation for the handover system

## Testing Plan

### Unit Tests

1. **ContextHandoverService Tests**
   - Context file creation and loading
   - Security validation
   - Environment variable handling
   - Error recovery

2. **Handover Tool Tests**
   - Parameter validation
   - Execution with different options
   - Result handling

### Integration Tests

1. **End-to-End Handover**
   - Data expert → Analysis expert flow
   - HPC expert → Workflow expert flow
   - Error scenarios and recovery

2. **Non-Interactive Mode**
   - Batch execution with timeout
   - Result collection and return

3. **Interactive Mode**
   - User interaction preservation
   - Context awareness

### Performance Tests

1. **Large File Handling**
   - HDF5/NetCDF file references
   - Memory efficiency

2. **Concurrent Handovers**
   - Multiple personas running simultaneously
   - Resource management

## Integration Points

### With Existing Systems

1. **PersonaManager**: Validate personas exist before handover
2. **ShellExecutionService**: Use for subprocess management
3. **Config System**: Store and retrieve handover context
4. **MCP Servers**: Preserve active connections across handovers

### With IOWarp Ecosystem

1. **MCP Integration**: Pass MCP server states in context
2. **Data Format Support**: Special handling for scientific formats
3. **HPC Environment**: Preserve SLURM/PBS job contexts

## Success Criteria

1. ✅ Seamless handover between any two personas
2. ✅ Zero data loss during context transfer
3. ✅ Support for both interactive and batch modes
4. ✅ Robust error handling and recovery
5. ✅ Scientific workflow optimization (HDF5, SLURM, etc.)
6. ✅ Security validation for all file operations
7. ✅ Performance suitable for HPC environments
8. ✅ Intuitive CLI interface
9. ✅ Comprehensive documentation and examples
10. ✅ Full test coverage

## Future Enhancements

1. **Parallel Handovers**: Support fan-out to multiple personas
2. **Handover Chains**: Define multi-step workflows declaratively
3. **Result Aggregation**: Combine results from multiple personas
4. **Visual Workflow Editor**: GUI for designing handover chains
5. **Checkpoint/Resume**: Save and restore handover state
6. **Cloud Integration**: Support for cloud-based persona execution
