/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'node:os';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import process from 'node:process';
import { mcpCommand } from '../commands/mcp.js';
import {
  Config,
  loadServerHierarchicalMemory,
  setGeminiMdFilename as setServerGeminiMdFilename,
  getCurrentGeminiMdFilename,
  ApprovalMode,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
  FileDiscoveryService,
  TelemetryTarget,
  FileFilteringOptions,
  ShellTool,
  EditTool,
  WriteFileTool,
  MCPServerConfig,
  IdeClient,
  parseProviderModel,
  resolveModelAlias,
  type SupportedProvider,
} from '@google/gemini-cli-core';
import { Settings } from './settings.js';

import { Extension, annotateActiveExtensions } from './extension.js';
import { getCliVersion } from '../utils/version.js';
import { loadSandboxConfig } from './sandboxConfig.js';
import { resolvePath } from '../utils/resolvePath.js';

// Interface for user-defined MCP configurations
interface UserMcpConfig {
  command: string;
  args?: string[];
}

// Simple console logger for now - replace with actual logger if available
const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

export interface CliArgs {
  model: string | undefined;
  provider: string | undefined;
  sandbox: boolean | string | undefined;
  sandboxImage: string | undefined;
  debug: boolean | undefined;
  prompt: string | undefined;
  promptInteractive: string | undefined;
  allFiles: boolean | undefined;
  all_files: boolean | undefined;
  showMemoryUsage: boolean | undefined;
  show_memory_usage: boolean | undefined;
  yolo: boolean | undefined;
  telemetry: boolean | undefined;
  checkpointing: boolean | undefined;
  telemetryTarget: string | undefined;
  telemetryOtlpEndpoint: string | undefined;
  telemetryLogPrompts: boolean | undefined;
  telemetryOutfile: string | undefined;
  allowedMcpServerNames: string[] | undefined;
  experimentalAcp: boolean | undefined;
  extensions: string[] | undefined;
  listExtensions: boolean | undefined;
  ideModeFeature: boolean | undefined;
  proxy: string | undefined;
  includeDirectories: string[] | undefined;
  persona: string | undefined;
  listPersonas: boolean | undefined;
  personaHelp: string | undefined;
  contextFrom: string | undefined;
  task: string | undefined;
  nonInteractive: boolean | undefined;
  handoverTimeout: number | undefined;
}

export async function parseArguments(): Promise<CliArgs> {
  const yargsInstance = yargs(hideBin(process.argv))
    .scriptName('warpio')
    .usage(
      '$0 [options]',
      'Warpio CLI - Launch an interactive CLI, use -p/--prompt for non-interactive mode',
    )
    .command('$0', 'Launch Warpio CLI', (yargsInstance) =>
      yargsInstance
        .option('model', {
          alias: 'm',
          type: 'string',
          description: `Model`,
          default: process.env.GEMINI_MODEL,
        })
        .option('provider', {
          type: 'string',
          description: 'AI Provider (gemini, openai, anthropic, etc.)',
          default: 'gemini',
        })
        .option('prompt', {
          alias: 'p',
          type: 'string',
          description: 'Prompt. Appended to input on stdin (if any).',
        })
        .option('prompt-interactive', {
          alias: 'i',
          type: 'string',
          description:
            'Execute the provided prompt and continue in interactive mode',
        })
        .option('sandbox', {
          alias: 's',
          type: 'boolean',
          description: 'Run in sandbox?',
        })
        .option('sandbox-image', {
          type: 'string',
          description: 'Sandbox image URI.',
        })
        .option('debug', {
          alias: 'd',
          type: 'boolean',
          description: 'Run in debug mode?',
          default: false,
        })
        .option('all-files', {
          alias: ['a'],
          type: 'boolean',
          description: 'Include ALL files in context?',
          default: false,
        })
        .option('all_files', {
          type: 'boolean',
          description: 'Include ALL files in context?',
          default: false,
        })
        .deprecateOption(
          'all_files',
          'Use --all-files instead. We will be removing --all_files in the coming weeks.',
        )
        .option('show-memory-usage', {
          type: 'boolean',
          description: 'Show memory usage in status bar',
          default: false,
        })
        .option('show_memory_usage', {
          type: 'boolean',
          description: 'Show memory usage in status bar',
          default: false,
        })
        .deprecateOption(
          'show_memory_usage',
          'Use --show-memory-usage instead. We will be removing --show_memory_usage in the coming weeks.',
        )
        .option('yolo', {
          alias: 'y',
          type: 'boolean',
          description:
            'Automatically accept all actions (aka YOLO mode, see https://www.youtube.com/watch?v=xvFZjo5PgG0 for more details)?',
          default: false,
        })
        .option('telemetry', {
          type: 'boolean',
          description:
            'Enable telemetry? This flag specifically controls if telemetry is sent. Other --telemetry-* flags set specific values but do not enable telemetry on their own.',
        })
        .option('telemetry-target', {
          type: 'string',
          choices: ['local', 'gcp'],
          description:
            'Set the telemetry target (local or gcp). Overrides settings files.',
        })
        .option('telemetry-otlp-endpoint', {
          type: 'string',
          description:
            'Set the OTLP endpoint for telemetry. Overrides environment variables and settings files.',
        })
        .option('telemetry-log-prompts', {
          type: 'boolean',
          description:
            'Enable or disable logging of user prompts for telemetry. Overrides settings files.',
        })
        .option('telemetry-outfile', {
          type: 'string',
          description: 'Redirect all telemetry output to the specified file.',
        })
        .option('checkpointing', {
          alias: 'c',
          type: 'boolean',
          description: 'Enables checkpointing of file edits',
          default: false,
        })
        .option('experimental-acp', {
          type: 'boolean',
          description: 'Starts the agent in ACP mode',
        })
        .option('allowed-mcp-server-names', {
          type: 'array',
          string: true,
          description: 'Allowed MCP server names',
        })
        .option('extensions', {
          alias: 'e',
          type: 'array',
          string: true,
          description:
            'A list of extensions to use. If not provided, all extensions are used.',
        })
        .option('list-extensions', {
          alias: 'l',
          type: 'boolean',
          description: 'List all available extensions and exit.',
        })
        .option('ide-mode-feature', {
          type: 'boolean',
          description: 'Run in IDE mode?',
        })
        .option('proxy', {
          type: 'string',
          description:
            'Proxy for gemini client, like schema://user:password@host:port',
        })
        .option('include-directories', {
          type: 'array',
          string: true,
          description:
            'Additional directories to include in the workspace (comma-separated or multiple --include-directories)',
          coerce: (dirs: string[]) =>
            // Handle comma-separated values
            dirs.flatMap((dir) => dir.split(',').map((d) => d.trim())),
        })
        .option('persona', {
          type: 'string',
          description:
            'Launch with IOWarp persona (data-expert, analysis-expert, hpc-expert, research-expert, workflow-expert)',
        })
        .option('list-personas', {
          type: 'boolean',
          description: 'List available personas',
        })
        .option('persona-help', {
          type: 'string',
          description: 'Get help for a specific persona',
        })
        .option('context-from', {
          type: 'string',
          description: 'Load context from MessagePack file',
        })
        .option('task', {
          type: 'string',
          description: 'Describe the task for context handover',
        })
        .option('non-interactive', {
          type: 'boolean',
          description: 'Run in non-interactive mode for automation',
        })
        .option('handover-timeout', {
          type: 'number',
          description: 'Timeout for context handover in milliseconds',
          default: 30000,
        })
        .check((argv) => {
          if (argv.prompt && argv.promptInteractive) {
            throw new Error(
              'Cannot use both --prompt (-p) and --prompt-interactive (-i) together',
            );
          }
          return true;
        }),
    )
    // Register MCP subcommands
    .command(mcpCommand)
    .version(await getCliVersion()) // This will enable the --version flag based on package.json
    .alias('v', 'version')
    .help()
    .alias('h', 'help')
    .strict()
    .demandCommand(0, 0); // Allow base command to run with no subcommands

  yargsInstance.wrap(yargsInstance.terminalWidth());
  const result = await yargsInstance.parse();

  // Handle case where MCP subcommands are executed - they should exit the process
  // and not return to main CLI logic
  if (result._.length > 0 && result._[0] === 'mcp') {
    // MCP commands handle their own execution and process exit
    process.exit(0);
  }

  // The import format is now only controlled by settings.memoryImportFormat
  // We no longer accept it as a CLI argument
  return result as unknown as CliArgs;
}

// This function is now a thin wrapper around the server's implementation.
// It's kept in the CLI for now as App.tsx directly calls it for memory refresh.
// TODO: Consider if App.tsx should get memory via a server call or if Config should refresh itself.
export async function loadHierarchicalGeminiMemory(
  currentWorkingDirectory: string,
  includeDirectoriesToReadGemini: readonly string[] = [],
  debugMode: boolean,
  fileService: FileDiscoveryService,
  settings: Settings,
  extensionContextFilePaths: string[] = [],
  memoryImportFormat: 'flat' | 'tree' = 'tree',
  fileFilteringOptions?: FileFilteringOptions,
): Promise<{ memoryContent: string; fileCount: number }> {
  // FIX: Use real, canonical paths for a reliable comparison to handle symlinks.
  const realCwd = fs.realpathSync(path.resolve(currentWorkingDirectory));
  const realHome = fs.realpathSync(path.resolve(homedir()));
  const isHomeDirectory = realCwd === realHome;

  // If it is the home directory, pass an empty string to the core memory
  // function to signal that it should skip the workspace search.
  const effectiveCwd = isHomeDirectory ? '' : currentWorkingDirectory;

  if (debugMode) {
    logger.debug(
      `CLI: Delegating hierarchical memory load to server for CWD: ${currentWorkingDirectory} (memoryImportFormat: ${memoryImportFormat})`,
    );
  }

  // Directly call the server function with the corrected path.
  return loadServerHierarchicalMemory(
    effectiveCwd,
    includeDirectoriesToReadGemini,
    debugMode,
    fileService,
    extensionContextFilePaths,
    memoryImportFormat,
    fileFilteringOptions,
    settings.memoryDiscoveryMaxDirs,
  );
}

/**
 * Resolves model and provider from CLI arguments and settings
 */
function resolveModelAndProvider(
  argv: CliArgs,
  settings: Settings,
): {
  model: string;
  provider: SupportedProvider;
} {
  // Get raw model input (could be alias, bare model, or provider::model format)
  const rawModel = argv.model || settings.model || DEFAULT_GEMINI_MODEL;

  // Parse the model input (handles both Gemini and local provider formats)
  const parsed = parseProviderModel(rawModel);
  
  // Get provider preference from CLI args or settings, with parsed provider taking priority
  let finalProvider = parsed.provider;
  if (parsed.provider === 'gemini') {
    // For Gemini, allow CLI/settings to override
    finalProvider = (argv.provider as SupportedProvider) || 
                   (settings.provider as SupportedProvider) || 
                   'gemini';
  }

  // Resolve aliases for Gemini models
  const resolvedModel = finalProvider === 'gemini' 
    ? resolveModelAlias(parsed.model, finalProvider)
    : parsed.model;

  return {
    model: resolvedModel,
    provider: finalProvider,
  };
}

export async function loadCliConfig(
  settings: Settings,
  extensions: Extension[],
  sessionId: string,
  argv: CliArgs,
): Promise<Config> {
  const debugMode =
    argv.debug ||
    [process.env.DEBUG, process.env.DEBUG_MODE].some(
      (v) => v === 'true' || v === '1',
    ) ||
    false;
  const memoryImportFormat = settings.memoryImportFormat || 'tree';

  const ideMode = settings.ideMode ?? false;
  const ideModeFeature =
    argv.ideModeFeature ?? settings.ideModeFeature ?? false;

  const folderTrustFeature = settings.folderTrustFeature ?? false;
  const folderTrustSetting = settings.folderTrust ?? false;
  const folderTrust = folderTrustFeature && folderTrustSetting;

  const allExtensions = annotateActiveExtensions(
    extensions,
    argv.extensions || [],
  );

  const activeExtensions = extensions.filter(
    (_, i) => allExtensions[i].isActive,
  );

  // Set the context filename in the server's memoryTool module BEFORE loading memory
  // TODO(b/343434939): This is a bit of a hack. The contextFileName should ideally be passed
  // directly to the Config constructor in core, and have core handle setGeminiMdFilename.
  // However, loadHierarchicalGeminiMemory is called *before* createServerConfig.
  if (settings.contextFileName) {
    setServerGeminiMdFilename(settings.contextFileName);
  } else {
    // Reset to default if not provided in settings.
    setServerGeminiMdFilename(getCurrentGeminiMdFilename());
  }

  const extensionContextFilePaths = activeExtensions.flatMap(
    (e) => e.contextFiles,
  );

  const fileService = new FileDiscoveryService(process.cwd());

  const fileFiltering = {
    ...DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
    ...settings.fileFiltering,
  };

  const includeDirectories = (settings.includeDirectories || [])
    .map(resolvePath)
    .concat((argv.includeDirectories || []).map(resolvePath));

  // Call the (now wrapper) loadHierarchicalGeminiMemory which calls the server's version
  const { memoryContent, fileCount } = await loadHierarchicalGeminiMemory(
    process.cwd(),
    settings.loadMemoryFromIncludeDirectories ? includeDirectories : [],
    debugMode,
    fileService,
    settings,
    extensionContextFilePaths,
    memoryImportFormat,
    fileFiltering,
  );

  let mcpServers = mergeMcpServers(settings, activeExtensions, argv.persona);
  const question = argv.promptInteractive || argv.prompt || '';
  const approvalMode =
    argv.yolo || false ? ApprovalMode.YOLO : ApprovalMode.DEFAULT;
  const interactive =
    !!argv.promptInteractive || (process.stdin.isTTY && question.length === 0);
  // In non-interactive and non-yolo mode, exclude interactive built in tools.
  const extraExcludes =
    !interactive && approvalMode !== ApprovalMode.YOLO
      ? [ShellTool.Name, EditTool.Name, WriteFileTool.Name]
      : undefined;

  const excludeTools = mergeExcludeTools(
    settings,
    activeExtensions,
    extraExcludes,
  );
  const blockedMcpServers: Array<{ name: string; extensionName: string }> = [];

  if (!argv.allowedMcpServerNames) {
    if (settings.allowMCPServers) {
      mcpServers = allowedMcpServers(
        mcpServers,
        settings.allowMCPServers,
        blockedMcpServers,
      );
    }

    if (settings.excludeMCPServers) {
      const excludedNames = new Set(settings.excludeMCPServers.filter(Boolean));
      if (excludedNames.size > 0) {
        mcpServers = Object.fromEntries(
          Object.entries(mcpServers).filter(([key]) => !excludedNames.has(key)),
        );
      }
    }
  }

  if (argv.allowedMcpServerNames) {
    mcpServers = allowedMcpServers(
      mcpServers,
      argv.allowedMcpServerNames,
      blockedMcpServers,
    );
  }

  const sandboxConfig = await loadSandboxConfig(settings, argv);

  return new Config({
    sessionId,
    embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL,
    sandbox: sandboxConfig,
    targetDir: process.cwd(),
    includeDirectories,
    loadMemoryFromIncludeDirectories:
      settings.loadMemoryFromIncludeDirectories || false,
    debugMode,
    question,
    fullContext: argv.allFiles || argv.all_files || false,
    coreTools: settings.coreTools || undefined,
    excludeTools,
    toolDiscoveryCommand: settings.toolDiscoveryCommand,
    toolCallCommand: settings.toolCallCommand,
    mcpServerCommand: settings.mcpServerCommand,
    mcpServers,
    userMemory: memoryContent,
    geminiMdFileCount: fileCount,
    approvalMode,
    showMemoryUsage:
      argv.showMemoryUsage ||
      argv.show_memory_usage ||
      settings.showMemoryUsage ||
      false,
    accessibility: settings.accessibility,
    telemetry: {
      enabled: argv.telemetry ?? settings.telemetry?.enabled,
      target: (argv.telemetryTarget ??
        settings.telemetry?.target) as TelemetryTarget,
      otlpEndpoint:
        argv.telemetryOtlpEndpoint ??
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        settings.telemetry?.otlpEndpoint,
      logPrompts: argv.telemetryLogPrompts ?? settings.telemetry?.logPrompts,
      outfile: argv.telemetryOutfile ?? settings.telemetry?.outfile,
    },
    usageStatisticsEnabled: settings.usageStatisticsEnabled ?? true,
    // Git-aware file filtering settings
    fileFiltering: {
      respectGitIgnore: settings.fileFiltering?.respectGitIgnore,
      respectGeminiIgnore: settings.fileFiltering?.respectGeminiIgnore,
      enableRecursiveFileSearch:
        settings.fileFiltering?.enableRecursiveFileSearch,
    },
    checkpointing: argv.checkpointing || settings.checkpointing?.enabled,
    proxy:
      argv.proxy ||
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy,
    cwd: process.cwd(),
    fileDiscoveryService: fileService,
    bugCommand: settings.bugCommand,
    model: resolveModelAndProvider(argv, settings).model,
    provider: resolveModelAndProvider(argv, settings).provider,
    extensionContextFilePaths,
    maxSessionTurns: settings.maxSessionTurns ?? -1,
    experimentalAcp: argv.experimentalAcp || false,
    listExtensions: argv.listExtensions || false,
    extensions: allExtensions,
    blockedMcpServers,
    noBrowser: !!process.env.NO_BROWSER,
    summarizeToolOutput: settings.summarizeToolOutput,
    ideMode,
    ideModeFeature,
    chatCompression: settings.chatCompression,
    folderTrustFeature,
    folderTrust,
    interactive,
    persona: argv.persona,
    ideClient: IdeClient.getInstance(),
  });
}

function allowedMcpServers(
  mcpServers: { [x: string]: MCPServerConfig },
  allowMCPServers: string[],
  blockedMcpServers: Array<{ name: string; extensionName: string }>,
) {
  const allowedNames = new Set(allowMCPServers.filter(Boolean));
  if (allowedNames.size > 0) {
    mcpServers = Object.fromEntries(
      Object.entries(mcpServers).filter(([key, server]) => {
        const isAllowed = allowedNames.has(key);
        if (!isAllowed) {
          blockedMcpServers.push({
            name: key,
            extensionName: server.extensionName || '',
          });
        }
        return isAllowed;
      }),
    );
  } else {
    blockedMcpServers.push(
      ...Object.entries(mcpServers).map(([key, server]) => ({
        name: key,
        extensionName: server.extensionName || '',
      })),
    );
    mcpServers = {};
  }
  return mcpServers;
}

function getPersonaMcps(persona: string): string[] {
  const personaMcpMap: Record<string, string[]> = {
    'data-expert': ['adios', 'hdf5', 'compression'],
    'analysis-expert': ['pandas', 'plot'],
    'hpc-expert': ['darshan', 'lmod', 'node-hardware', 'parallel-sort'],
    'research-expert': ['arxiv'],
    'workflow-expert': [],
  };
  return personaMcpMap[persona] || [];
}

function mergeMcpServers(
  settings: Settings,
  extensions: Extension[],
  activePersona?: string,
) {
  const mcpServers = { ...(settings.mcpServers || {}) };

  // Auto-include IOWarp MCPs based on active persona (fixed to avoid conflicts)
  if (activePersona && activePersona !== 'warpio') {
    const personaMcps = getPersonaMcps(activePersona);

    personaMcps.forEach((mcpKey) => {
      const mcpName = `${mcpKey}-mcp`;
      // Only add if not already configured (prevents conflicts with existing settings)
      if (!mcpServers[mcpName]) {
        // Debug: Auto-adding MCP server for persona (suppressed for clean output)
        // Use stdio transport with uvx iowarp-mcps (same format as existing working config)
        mcpServers[mcpName] = {
          command: 'uvx',
          args: ['iowarp-mcps', mcpKey],
        };
      } else {
        // Debug: MCP server already configured (suppressed for clean output)
      }
    });
  }

  // Merge user-defined MCPs from ~/.warpio/mcp.json
  const userMcps = loadUserMcps();
  Object.entries(userMcps).forEach(([key, userMcp]) => {
    if (mcpServers[key]) {
      logger.warn(
        `Skipping user-defined MCP config for server with key "${key}" as it already exists in settings.`,
      );
      return;
    }
    // Convert UserMcpConfig to MCPServerConfig format
    mcpServers[key] = {
      command: userMcp.command,
      args: userMcp.args || [],
    };
  });
  for (const extension of extensions) {
    Object.entries(extension.config.mcpServers || {}).forEach(
      ([key, server]) => {
        if (mcpServers[key]) {
          logger.warn(
            `Skipping extension MCP config for server with key "${key}" as it already exists.`,
          );
          return;
        }
        mcpServers[key] = {
          ...server,
          extensionName: extension.config.name,
        };
      },
    );
  }
  return mcpServers;
}

function mergeExcludeTools(
  settings: Settings,
  extensions: Extension[],
  extraExcludes?: string[] | undefined,
): string[] {
  const allExcludeTools = new Set([
    ...(settings.excludeTools || []),
    ...(extraExcludes || []),
  ]);
  for (const extension of extensions) {
    for (const tool of extension.config.excludeTools || []) {
      allExcludeTools.add(tool);
    }
  }
  return [...allExcludeTools];
}

/**
 * Load user-defined MCP configurations from ~/.warpio/mcp.json
 */
function loadUserMcps(): Record<string, UserMcpConfig> {
  try {
    const configPath = path.join(homedir(), '.warpio', 'mcp.json');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    logger.warn('Failed to load user MCP configurations:', error);
  }
  return {};
}

/**
 * Save user-defined MCP configurations to ~/.warpio/mcp.json
 */
function _saveUserMcps(mcps: Record<string, UserMcpConfig>): void {
  try {
    const configDir = path.join(homedir(), '.warpio');
    const configPath = path.join(configDir, 'mcp.json');

    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(mcps, null, 2));
  } catch (error) {
    logger.error('Failed to save user MCP configurations:', error);
  }
}
