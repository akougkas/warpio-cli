/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Persona Context Handover Tool
 * Enables seamless coordination between different IOWarp personas
 * High-performance MessagePack serialization for 3-5x speed improvement
 */

import { z } from 'zod';
import { Type } from '@google/genai';
import {
  BaseTool,
  ToolResult,
  Icon,
  ToolCallConfirmationDetails,
} from '../../tools/tools.js';
import {
  ContextHandoverService,
  PersonaContext,
  TaskResult,
} from '../services/handover.js';
import { WarpioPersonaManager } from '../index.js';
import { ToolErrorType } from '../../tools/tool-error.js';

const _handoverToPersonaSchema = z.object({
  targetPersona: z
    .string()
    .describe(
      'Target persona to hand over to (e.g., data-expert, analysis-expert)',
    ),
  taskDescription: z
    .string()
    .describe('Specific task for the target persona to execute'),
  artifacts: z
    .array(
      z.object({
        path: z.string(),
        type: z.enum(['input', 'output', 'intermediate']),
        format: z.string(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .optional()
    .describe('Files and data to pass to target persona'),
  environment: z
    .object({
      variables: z.record(z.string()).optional(),
      workingDirectory: z.string().optional(),
      timeout: z.number().optional(),
    })
    .optional()
    .describe('Execution environment for target persona'),
  mode: z
    .enum(['synchronous', 'asynchronous'])
    .default('synchronous')
    .describe('Execution mode'),
  interactive: z
    .boolean()
    .default(false)
    .describe('Whether target persona should run interactively'),
  scientificContext: z
    .object({
      dataFormats: z.array(z.string()).optional(),
      hpcEnvironment: z
        .object({
          scheduler: z.enum(['slurm', 'pbs', 'sge']).optional(),
          jobId: z.string().optional(),
          nodes: z.number().optional(),
          cores: z.number().optional(),
          memory: z.string().optional(),
          walltime: z.string().optional(),
          queue: z.string().optional(),
        })
        .optional(),
      mcpServers: z.array(z.string()).optional(),
    })
    .optional()
    .describe('Scientific computing context for HPC/data workflows'),
});

type HandoverToPersonaParams = z.infer<typeof _handoverToPersonaSchema>;

interface HandoverToolResult extends ToolResult {
  taskResult?: TaskResult;
}

/**
 * High-performance persona handover tool with MessagePack optimization
 */
export class HandoverToPersonaTool extends BaseTool<
  HandoverToPersonaParams,
  HandoverToolResult
> {
  constructor() {
    super(
      'handover_to_persona',
      'Handover to Persona',
      'Hand over context and task to another IOWarp persona for specialized processing. ' +
        'Enables multi-agent workflows like data-expert → analysis-expert → hpc-expert coordination. ' +
        'Uses high-performance MessagePack serialization (3-5x faster than JSON).',
      Icon.LightBulb,
      {
        type: Type.OBJECT,
        properties: {
          targetPersona: {
            type: Type.STRING,
            description:
              'Target persona to hand over to (e.g., data-expert, analysis-expert)',
          },
          taskDescription: {
            type: Type.STRING,
            description: 'Specific task for the target persona to execute',
          },
          artifacts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING },
                type: { type: Type.STRING },
                format: { type: Type.STRING },
                metadata: { type: Type.OBJECT },
              },
              required: ['path', 'type', 'format'],
            },
            description: 'Files and data to pass to target persona',
          },
          environment: {
            type: Type.OBJECT,
            properties: {
              variables: { type: Type.OBJECT },
              workingDirectory: { type: Type.STRING },
              timeout: { type: Type.NUMBER },
            },
            description: 'Execution environment for target persona',
          },
          mode: {
            type: Type.STRING,
            description: 'Execution mode (synchronous or asynchronous)',
          },
          interactive: {
            type: Type.BOOLEAN,
            description: 'Whether target persona should run interactively',
          },
          scientificContext: {
            type: Type.OBJECT,
            properties: {
              dataFormats: { type: Type.ARRAY, items: { type: Type.STRING } },
              hpcEnvironment: {
                type: Type.OBJECT,
                properties: {
                  scheduler: { type: Type.STRING },
                  jobId: { type: Type.STRING },
                  nodes: { type: Type.NUMBER },
                  cores: { type: Type.NUMBER },
                  memory: { type: Type.STRING },
                  walltime: { type: Type.STRING },
                  queue: { type: Type.STRING },
                },
              },
              mcpServers: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            description: 'Scientific computing context for HPC/data workflows',
          },
        },
        required: ['targetPersona', 'taskDescription'],
      },
    );
  }

  /**
   * Validate persona handover parameters
   */
  async validate(params: HandoverToPersonaParams): Promise<void> {
    // Validate target persona exists
    const availablePersonas = WarpioPersonaManager.getInstance().listPersonas();
    if (!availablePersonas.includes(params.targetPersona)) {
      throw new Error(
        `Invalid target persona: ${params.targetPersona}. ` +
          `Available personas: ${availablePersonas.join(', ')}`,
      );
    }

    // Validate artifact files exist
    if (params.artifacts) {
      const fs = await import('fs').then((m) => m.promises);
      for (const artifact of params.artifacts) {
        try {
          await fs.access(artifact.path);
        } catch {
          throw new Error(`Artifact file not found: ${artifact.path}`);
        }
      }
    }

    // Validate timeout range
    const timeout = params.environment?.timeout;
    if (timeout && (timeout < 1000 || timeout > 3600000)) {
      // 1s to 1h
      throw new Error('Timeout must be between 1000ms (1s) and 3600000ms (1h)');
    }
  }

  /**
   * Execute persona handover with context preservation
   */
  async execute(
    params: HandoverToPersonaParams,
    _abortSignal: AbortSignal,
    updateCallback?: (update: string) => void,
  ): Promise<HandoverToolResult> {
    updateCallback?.(
      `🚀 Initiating handover to persona: ${params.targetPersona}`,
    );

    try {
      // Get current persona context (TODO: implement active persona tracking)
      const currentPersonaName = 'default'; // PersonaManager doesn't have getActivePersona method
      updateCallback?.(
        `📦 Preparing context from ${currentPersonaName} persona`,
      );

      // Build context object with MessagePack optimization
      const context: PersonaContext = {
        metadata: {
          contextId: '', // Will be set by service
          version: '1.0.0',
          timestamp: Date.now(),
          sourcePersona: currentPersonaName,
          targetPersona: params.targetPersona,
          taskDescription: params.taskDescription,
          workingDirectory:
            params.environment?.workingDirectory || process.cwd(),
          format: 'msgpack', // High-performance binary format
        },
        environment: {
          variables: params.environment?.variables || {},
          nodeArgs: process.execArgv,
          cliArgs: process.argv.slice(2),
          timeout: params.environment?.timeout || 300000,
        },
        artifacts: {
          files: await this.buildFileReferences(params.artifacts || []),
          memory: await this.captureMemorySnapshot(),
          chatHistory: [], // TODO: Integrate with chat history
          results: [],
        },
        scientific: {
          dataFormats: params.scientificContext?.dataFormats || [],
          hpcEnvironment: params.scientificContext?.hpcEnvironment
            ? {
                scheduler: params.scientificContext.hpcEnvironment.scheduler!,
                jobId: params.scientificContext.hpcEnvironment.jobId,
                nodes: params.scientificContext.hpcEnvironment.nodes || 1,
                cores: params.scientificContext.hpcEnvironment.cores || 1,
                memory: params.scientificContext.hpcEnvironment.memory || '1GB',
                walltime:
                  params.scientificContext.hpcEnvironment.walltime ||
                  '01:00:00',
                queue:
                  params.scientificContext.hpcEnvironment.queue || 'default',
              }
            : undefined,
          mcpServers: params.scientificContext?.mcpServers || [],
          customExtensions: {},
        },
        communication: {
          mode: params.mode,
          errorHandling: 'retry',
          maxRetries: 3,
        },
      };

      updateCallback?.(
        `⚡ Using MessagePack serialization for 3-5x performance gain`,
      );

      // Execute handover with performance monitoring
      const startTime = Date.now();
      const handoverService = new ContextHandoverService();
      const result = await handoverService.handoverToPersona(context, {
        interactive: params.interactive,
        timeout: params.environment?.timeout,
        workingDirectory: params.environment?.workingDirectory,
      });

      const executionTime = Date.now() - startTime;
      updateCallback?.(`✅ Handover completed in ${executionTime}ms`);

      // Return proper ToolResult
      return {
        summary: `Handed over to ${params.targetPersona}: ${result.status}`,
        llmContent: [
          {
            text:
              result.output || `Task completed with status: ${result.status}`,
          },
        ],
        returnDisplay: `## Persona Handover Result\n\n**Target:** ${params.targetPersona}\n**Status:** ${result.status}\n**Execution Time:** ${executionTime}ms\n\n${result.output || 'No output'}`,
        taskResult: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      updateCallback?.(`❌ Handover failed: ${errorMessage}`);

      return {
        summary: `Handover to ${params.targetPersona} failed`,
        llmContent: [{ text: `Handover failed: ${errorMessage}` }],
        returnDisplay: `## Persona Handover Failed\n\n**Target:** ${params.targetPersona}\n**Error:** ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.UNHANDLED_EXCEPTION,
        },
      };
    }
  }

  /**
   * Build file references with checksums and metadata
   */
  private async buildFileReferences(
    artifacts: HandoverToPersonaParams['artifacts'] = [],
  ) {
    const fs = await import('fs').then((m) => m.promises);
    const crypto = await import('crypto');

    const fileRefs = [];
    for (const artifact of artifacts) {
      try {
        const stats = await fs.stat(artifact.path);
        const data = await fs.readFile(artifact.path);
        const checksum = crypto.createHash('sha256').update(data).digest('hex');

        fileRefs.push({
          path: artifact.path,
          type: artifact.type,
          format: artifact.format,
          size: stats.size,
          checksum,
          metadata: artifact.metadata || {},
        });
      } catch (error) {
        console.warn(`Failed to process artifact ${artifact.path}:`, error);
      }
    }

    return fileRefs;
  }

  /**
   * Capture current memory state for context preservation
   */
  private async captureMemorySnapshot() {
    // TODO: Integrate with actual memory system
    // For now, return minimal snapshot
    return {
      facts: [],
      cache: {},
      personaState: {
        activePersona: 'default', // TODO: implement active persona tracking
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Check if handover requires user confirmation
   */
  async shouldConfirmExecute(
    params: HandoverToPersonaParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    // Require confirmation for:
    // 1. File modifications or system changes
    // 2. Long-running tasks (> 5 minutes)
    // 3. HPC job submissions

    const hasFileOutputs = params.artifacts?.some((a) => a.type === 'output');
    const isLongRunning = (params.environment?.timeout || 0) > 300000; // 5 minutes
    const isHPCJob = params.scientificContext?.hpcEnvironment?.scheduler;

    if (hasFileOutputs || isLongRunning || !!isHPCJob) {
      return {
        type: 'info',
        title: `Handover to ${params.targetPersona}`,
        prompt:
          `This will hand over context to ${params.targetPersona} persona with the following characteristics:\n\n` +
          `${hasFileOutputs ? '⚠️ May modify files\n' : ''}` +
          `${isLongRunning ? '⚠️ Long-running task (>5 minutes)\n' : ''}` +
          `${isHPCJob ? '⚠️ HPC job submission\n' : ''}` +
          `\nTask: ${params.taskDescription}`,
        onConfirm: async (outcome) => {
          // Handle confirmation outcome if needed
          console.log(`Handover confirmation: ${outcome}`);
        },
      };
    }

    return false;
  }
}
