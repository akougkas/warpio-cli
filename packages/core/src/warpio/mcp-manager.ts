/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Warpio MCP Manager - Persona MCP Isolation System
 * Enables each persona to have isolated MCP server configurations
 * Bridge between persona MCPAutoConfig and core MCPServerConfig
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Config, MCPServerConfig, AuthProviderType } from '../config/config.js';
import { MCPOAuthConfig } from '../mcp/oauth-provider.js';
import { MCPAutoConfig, WarpioPersonaDefinition } from './types.js';

/**
 * Serialized MCP configuration format for JSON storage
 */
interface SerializedMCPServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  httpUrl?: string;
  headers?: Record<string, string>;
  tcp?: string;
  timeout?: number;
  trust?: boolean;
  description?: string;
  includeTools?: string[];
  excludeTools?: string[];
  extensionName?: string;
  oauth?: MCPOAuthConfig;
  authProviderType?: AuthProviderType;
}

interface SerializedMCPConfig {
  servers: Record<string, SerializedMCPServerConfig>;
}

/**
 * Manages MCP server isolation for Warpio personas
 * Converts persona MCPAutoConfig to core MCPServerConfig format
 */
export class WarpioMCPManager {
  private config: Config;
  private activePersonaMCPs: Record<string, MCPServerConfig> = {};
  private originalMCPs: Record<string, MCPServerConfig> = {};

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Load MCPs for a specific persona
   * Replaces all current MCPs with persona-specific ones for isolation
   */
  async loadPersonaMCPs(persona: WarpioPersonaDefinition): Promise<void> {
    // Store original MCPs if not already stored (start with empty for true isolation)
    if (Object.keys(this.originalMCPs).length === 0) {
      this.originalMCPs = {};
    }

    // Get tool registry
    const toolRegistry = await this.config.getToolRegistry();
    
    // Log initial tool count for debugging
    if (process.env.DEBUG || process.env.DEBUG_MODE) {
      const allTools = (toolRegistry as any).getAllTools();
      console.log(`[MCPManager] Tools before persona load: ${allTools.length}`);
    }

    if (!persona.mcpConfigs || persona.mcpConfigs.length === 0) {
      // No persona MCPs - use empty set for isolation
      this.activePersonaMCPs = {};
      this.config.updateMcpServers({});

      // discoverMcpTools now properly clears only MCP tools internally
      await toolRegistry.discoverMcpTools();
      
      if (process.env.DEBUG || process.env.DEBUG_MODE) {
        const allTools = (toolRegistry as any).getAllTools();
        console.log(`[MCPManager] Tools after clearing MCPs: ${allTools.length}`);
      }
      return;
    }

    const mcpServers: Record<string, MCPServerConfig> = {};

    for (const mcpConfig of persona.mcpConfigs) {
      const serverConfig = this.convertToServerConfig(mcpConfig);
      mcpServers[mcpConfig.serverName] = serverConfig;
    }

    if (process.env.DEBUG || process.env.DEBUG_MODE) {
      console.log(`[MCPManager] Setting ${Object.keys(mcpServers).length} MCP servers for persona:`, Object.keys(mcpServers));
    }

    this.activePersonaMCPs = mcpServers;
    // REPLACE all MCPs with only persona-specific ones
    this.config.updateMcpServers(mcpServers);

    // Discover new persona MCP tools (discoverMcpTools now properly clears only MCP tools)
    await toolRegistry.discoverMcpTools();
    
    if (process.env.DEBUG || process.env.DEBUG_MODE) {
      const allTools = (toolRegistry as any).getAllTools();
      console.log(`[MCPManager] Tools after loading persona MCPs: ${allTools.length}`);
    }

    await this.savePersonaMCPConfig(persona.name, mcpServers);
  }

  /**
   * Unload all persona MCPs and restore original configuration
   */
  async unloadPersonaMCPs(): Promise<void> {
    // Get tool registry
    const toolRegistry = await this.config.getToolRegistry();
    
    this.activePersonaMCPs = {};
    // Restore original MCPs (empty in our case for true isolation)
    this.config.updateMcpServers(this.originalMCPs);

    // Refresh tool registry (discoverMcpTools now properly clears only MCP tools)
    await toolRegistry.discoverMcpTools();
  }

  /**
   * Get currently active persona MCPs
   */
  getActivePersonaMCPs(): Record<string, MCPServerConfig> {
    return { ...this.activePersonaMCPs };
  }

  /**
   * Convert MCPAutoConfig to MCPServerConfig format
   * Parses serverPath like "uvx iowarp-mcps adios" into command and args
   */
  private convertToServerConfig(autoConfig: MCPAutoConfig): MCPServerConfig {
    const pathParts = autoConfig.serverPath.trim().split(/\s+/);
    const command = pathParts[0];
    const commandArgs = pathParts.slice(1);

    const args = [...commandArgs, ...(autoConfig.args || [])];

    return new MCPServerConfig(
      command,
      args,
      autoConfig.env || {},
      undefined, // cwd
      undefined, // url
      undefined, // httpUrl
      undefined, // headers
      undefined, // tcp
      30000, // timeout (30s default)
      false, // trust
      autoConfig.description || `MCP server: ${autoConfig.serverName}`,
      undefined, // includeTools
      undefined, // excludeTools
      undefined, // extensionName
      undefined, // oauth
      undefined, // authProviderType
    );
  }

  /**
   * Save persona MCP configuration to disk for persistence
   */
  private async savePersonaMCPConfig(
    personaName: string,
    mcpServers: Record<string, MCPServerConfig>,
  ): Promise<void> {
    try {
      const personaDir = join(homedir(), '.warpio', 'personas', personaName);
      await fs.mkdir(personaDir, { recursive: true });

      const configPath = join(personaDir, 'mcp.json');
      const serializedConfig = this.serializeMCPConfig(mcpServers);

      await fs.writeFile(configPath, JSON.stringify(serializedConfig, null, 2));
    } catch (error) {
      console.warn(
        `Failed to save persona MCP config for ${personaName}:`,
        error,
      );
    }
  }

  /**
   * Convert MCPServerConfig to JSON-serializable format
   */
  private serializeMCPConfig(
    mcpServers: Record<string, MCPServerConfig>,
  ): SerializedMCPConfig {
    const serialized: Record<string, SerializedMCPServerConfig> = {};

    for (const [name, config] of Object.entries(mcpServers)) {
      serialized[name] = {
        command: config.command,
        args: config.args,
        env: config.env,
        cwd: config.cwd,
        url: config.url,
        httpUrl: config.httpUrl,
        headers: config.headers,
        tcp: config.tcp,
        timeout: config.timeout,
        trust: config.trust,
        description: config.description,
        includeTools: config.includeTools,
        excludeTools: config.excludeTools,
        extensionName: config.extensionName,
        oauth: config.oauth,
        authProviderType: config.authProviderType,
      };
    }

    return {
      servers: serialized,
    };
  }

  /**
   * Load persona MCP configuration from disk
   */
  async loadPersonaMCPConfigFromDisk(
    personaName: string,
  ): Promise<Record<string, MCPServerConfig> | null> {
    try {
      const configPath = join(
        homedir(),
        '.warpio',
        'personas',
        personaName,
        'mcp.json',
      );
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      const mcpServers: Record<string, MCPServerConfig> = {};

      for (const [name, serverData] of Object.entries(config.servers || {})) {
        const data = serverData as SerializedMCPServerConfig;
        mcpServers[name] = new MCPServerConfig(
          data.command,
          data.args,
          data.env,
          data.cwd,
          data.url,
          data.httpUrl,
          data.headers,
          data.tcp,
          data.timeout,
          data.trust,
          data.description,
          data.includeTools,
          data.excludeTools,
          data.extensionName,
          data.oauth,
          data.authProviderType as AuthProviderType | undefined,
        );
      }

      return mcpServers;
    } catch {
      return null;
    }
  }
}

let mcpManagerInstance: WarpioMCPManager | null = null;

/**
 * Get singleton instance of WarpioMCPManager
 */
export function getMCPManager(config: Config): WarpioMCPManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new WarpioMCPManager(config);
  }
  return mcpManagerInstance;
}
