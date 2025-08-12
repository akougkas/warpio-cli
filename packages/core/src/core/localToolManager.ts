/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Tool,
  FunctionCall,
  FunctionDeclaration,
  Schema,
  Type,
  PartListUnion,
} from '@google/genai';
import OpenAI from 'openai';
import { ToolRegistry } from '../tools/tool-registry.js';
import { ToolResult } from '../tools/tools.js';

/**
 * Internal tool definition combining Gemini and OpenAI formats
 */
interface ToolDefinition {
  geminiTool: Tool;
  openAITool: OpenAI.ChatCompletionTool;
  functionDeclaration: FunctionDeclaration;
}

/**
 * Manages tool calling for local AI providers.
 * Converts between Gemini Tool format and OpenAI ChatCompletion tools.
 * Handles tool execution using existing ToolRegistry infrastructure.
 */
export class LocalToolManager {
  private tools = new Map<string, ToolDefinition>();
  private toolRegistry?: ToolRegistry;

  /**
   * Set tools from Gemini format (called by UnifiedLocalClient.setTools)
   */
  async setTools(tools: Tool[]): Promise<void> {
    this.tools.clear();

    for (const tool of tools) {
      // Each Tool contains functionDeclarations array
      if (!tool.functionDeclarations) continue;
      for (const funcDeclaration of tool.functionDeclarations) {
        const openAITool = this.convertToOpenAITool(funcDeclaration);
        if (!funcDeclaration.name) continue;
        this.tools.set(funcDeclaration.name, {
          geminiTool: tool,
          openAITool,
          functionDeclaration: funcDeclaration,
        });
      }
    }
  }

  /**
   * Set tool registry for tool execution
   */
  setToolRegistry(registry: ToolRegistry): void {
    this.toolRegistry = registry;
  }

  /**
   * Get tools in OpenAI format for API calls
   */
  formatToolsForOpenAI(): OpenAI.ChatCompletionTool[] {
    return Array.from(this.tools.values()).map((def) => def.openAITool);
  }

  /**
   * Get tools in Gemini format
   */
  getGeminiTools(): Tool[] {
    const toolsSet = new Set<Tool>();
    for (const definition of this.tools.values()) {
      toolsSet.add(definition.geminiTool);
    }
    return Array.from(toolsSet);
  }

  /**
   * Handle OpenAI tool calls and return results in OpenAI format
   */
  async handleToolCalls(
    toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[],
  ): Promise<OpenAI.Chat.ChatCompletionToolMessageParam[]> {
    const results: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];

    for (const call of toolCalls) {
      const tool = this.tools.get(call.function.name);
      if (!tool) {
        results.push({
          role: 'tool' as const,
          tool_call_id: call.id,
          content: JSON.stringify({
            error: `Unknown tool: ${call.function.name}`,
            available_tools: Array.from(this.tools.keys()),
          }),
        });
        continue;
      }

      try {
        const args = JSON.parse(call.function.arguments);
        const result = await this.executeToolCall(
          tool.functionDeclaration,
          args,
        );

        results.push({
          role: 'tool' as const,
          tool_call_id: call.id,
          content: this.formatToolResult(result),
        });
      } catch (error) {
        console.error(`Tool execution error for ${call.function.name}:`, error);
        results.push({
          role: 'tool' as const,
          tool_call_id: call.id,
          content: JSON.stringify({
            error: `Tool execution failed: ${(error as Error).message}`,
            tool_name: call.function.name,
            arguments: call.function.arguments,
          }),
        });
      }
    }

    return results;
  }

  /**
   * Convert Gemini FunctionDeclaration to OpenAI ChatCompletionTool
   */
  private convertToOpenAITool(
    funcDeclaration: FunctionDeclaration,
  ): OpenAI.ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: funcDeclaration.name || '',
        description: funcDeclaration.description || '',
        parameters: this.convertSchemaToOpenAI(funcDeclaration.parameters),
      },
    };
  }

  /**
   * Convert Gemini Schema to OpenAI parameters format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertSchemaToOpenAI(schema?: Schema): Record<string, any> {
    if (!schema) {
      return { type: 'object', properties: {} };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const converted: Record<string, any> = {
      type: this.convertTypeToOpenAI(schema.type),
    };

    if (schema.description) {
      converted.description = schema.description;
    }

    if (schema.properties) {
      converted.properties = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        converted.properties[key] = this.convertSchemaToOpenAI(prop);
      }
    }

    if (schema.items) {
      converted.items = this.convertSchemaToOpenAI(schema.items);
    }

    if (schema.required && schema.required.length > 0) {
      converted.required = schema.required;
    }

    if (schema.enum && schema.enum.length > 0) {
      converted.enum = schema.enum;
    }

    return converted;
  }

  /**
   * Convert Gemini Type to OpenAI type string
   */
  private convertTypeToOpenAI(type?: Type): string {
    switch (type) {
      case Type.STRING:
        return 'string';
      case Type.NUMBER:
        return 'number';
      case Type.INTEGER:
        return 'integer';
      case Type.BOOLEAN:
        return 'boolean';
      case Type.ARRAY:
        return 'array';
      case Type.OBJECT:
      default:
        return 'object';
    }
  }

  /**
   * Execute a tool call using the ToolRegistry
   */
  private async executeToolCall(
    functionDeclaration: FunctionDeclaration,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    if (!this.toolRegistry) {
      throw new Error('ToolRegistry not set. Cannot execute tools.');
    }

    try {
      // Use ToolRegistry to execute the tool
      const tool = this.toolRegistry.getTool(functionDeclaration.name || '');
      if (!tool) {
        throw new Error(
          `Tool '${functionDeclaration.name}' not found in registry`,
        );
      }
      // Create an AbortSignal for tool execution
      const abortController = new AbortController();
      const result = await tool.buildAndExecute(args, abortController.signal);

      return result;
    } catch (error) {
      console.error(
        `Tool execution failed for ${functionDeclaration.name}:`,
        error,
      );
      throw new Error(`Tool execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Format ToolResult for OpenAI response
   */
  private formatToolResult(result: ToolResult): string {
    try {
      // Create a clean result object for the AI
      const formattedResult = {
        success: true,
        summary: result.summary || 'Tool executed successfully',
        // Extract text content from llmContent if it exists
        content: this.extractTextFromParts(result.llmContent),
      };

      return JSON.stringify(formattedResult, null, 2);
    } catch (error) {
      console.error('Error formatting tool result:', error);
      return JSON.stringify({
        success: false,
        error: 'Failed to format tool result',
        raw_result: result,
      });
    }
  }

  private extractTextFromParts(parts: PartListUnion): string | undefined {
    if (!parts || !Array.isArray(parts)) return undefined;

    return parts
      .map((part: unknown) => {
        if (typeof part === 'object' && part && 'text' in part) {
          return (part as { text: string }).text;
        }
        return '';
      })
      .filter((text: string) => text)
      .join('\n');
  }

  /**
   * Convert OpenAI tool calls to Gemini FunctionCall format (for compatibility)
   */
  convertToGeminiFunctionCalls(
    toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[],
  ): FunctionCall[] {
    return toolCalls.map((call) => ({
      name: call.function.name,
      args: JSON.parse(call.function.arguments),
    }));
  }

  /**
   * Validate that all required tools are available
   */
  validateTools(): { valid: boolean; missing: string[] } {
    if (!this.toolRegistry) {
      return { valid: false, missing: ['ToolRegistry not configured'] };
    }

    const missing: string[] = [];
    const tools = this.toolRegistry.getAllTools();
    const availableTools = tools.map((tool) => tool.name);

    for (const [toolName] of this.tools) {
      if (!availableTools.includes(toolName)) {
        missing.push(toolName);
      }
    }

    return { valid: missing.length === 0, missing };
  }

  /**
   * Get tool statistics for debugging
   */
  getToolStats(): {
    totalTools: number;
    toolNames: string[];
    hasRegistry: boolean;
    validationResult: { valid: boolean; missing: string[] };
  } {
    return {
      totalTools: this.tools.size,
      toolNames: Array.from(this.tools.keys()),
      hasRegistry: !!this.toolRegistry,
      validationResult: this.validateTools(),
    };
  }

  /**
   * Create a LocalToolManager from existing ToolRegistry
   */
  static async fromToolRegistry(
    toolRegistry: ToolRegistry,
  ): Promise<LocalToolManager> {
    const manager = new LocalToolManager();
    manager.setToolRegistry(toolRegistry);

    // Convert ToolRegistry function declarations to Tools
    const functionDeclarations = toolRegistry.getFunctionDeclarations();
    const tools: Tool[] = [{ functionDeclarations }];

    await manager.setTools(tools);
    return manager;
  }

  /**
   * Check if tools are configured and ready
   */
  isReady(): boolean {
    return this.tools.size > 0 && !!this.toolRegistry;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get detailed info about a specific tool
   */
  getToolInfo(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Check if a specific tool is available
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }
}
