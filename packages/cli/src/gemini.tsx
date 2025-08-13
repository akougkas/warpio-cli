/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from 'ink';
import { AppWrapper } from './ui/App.js';
import { loadCliConfig, parseArguments } from './config/config.js';
import { readStdin } from './utils/readStdin.js';
import { basename } from 'node:path';
import v8 from 'node:v8';
import os from 'node:os';
import dns from 'node:dns';
import { spawn } from 'node:child_process';
import { start_sandbox } from './utils/sandbox.js';
import {
  DnsResolutionOrder,
  LoadedSettings,
  loadSettings,
  SettingScope,
} from './config/settings.js';
import { themeManager } from './ui/themes/theme-manager.js';
import { getStartupWarnings } from './utils/startupWarnings.js';
import { getUserStartupWarnings } from './utils/userStartupWarnings.js';
import { runNonInteractive } from './nonInteractiveCli.js';
import { loadExtensions } from './config/extension.js';
import { cleanupCheckpoints, registerCleanup } from './utils/cleanup.js';
import { getCliVersion } from './utils/version.js';
import {
  Config,
  sessionId,
  logUserPrompt,
  AuthType,
  getOauthClient,
  WarpioPersonaManager,
  logIdeConnection,
  IdeConnectionEvent,
  IdeConnectionType,
} from '@google/gemini-cli-core';
import { validateAuthMethod } from './config/auth.js';
import { setMaxSizedBoxDebugging } from './ui/components/shared/MaxSizedBox.js';
import { validateNonInteractiveAuth } from './validateNonInterActiveAuth.js';
import { checkForUpdates } from './ui/utils/updateCheck.js';
import { handleAutoUpdate } from './utils/handleAutoUpdate.js';
import { appEvents, AppEvent } from './utils/events.js';
import { SettingsContext } from './ui/contexts/SettingsContext.js';

export function validateDnsResolutionOrder(
  order: string | undefined,
): DnsResolutionOrder {
  const defaultValue: DnsResolutionOrder = 'ipv4first';
  if (order === undefined) {
    return defaultValue;
  }
  if (order === 'ipv4first' || order === 'verbatim') {
    return order;
  }
  // We don't want to throw here, just warn and use the default.
  console.warn(
    `Invalid value for dnsResolutionOrder in settings: "${order}". Using default "${defaultValue}".`,
  );
  return defaultValue;
}

function getNodeMemoryArgs(config: Config): string[] {
  const totalMemoryMB = os.totalmem() / (1024 * 1024);
  const heapStats = v8.getHeapStatistics();
  const currentMaxOldSpaceSizeMb = Math.floor(
    heapStats.heap_size_limit / 1024 / 1024,
  );

  // Set target to 50% of total memory
  const targetMaxOldSpaceSizeInMB = Math.floor(totalMemoryMB * 0.5);
  if (config.getDebugMode()) {
    console.debug(
      `Current heap size ${currentMaxOldSpaceSizeMb.toFixed(2)} MB`,
    );
  }

  if (process.env.GEMINI_CLI_NO_RELAUNCH) {
    return [];
  }

  if (targetMaxOldSpaceSizeInMB > currentMaxOldSpaceSizeMb) {
    if (config.getDebugMode()) {
      console.debug(
        `Need to relaunch with more memory: ${targetMaxOldSpaceSizeInMB.toFixed(2)} MB`,
      );
    }
    return [`--max-old-space-size=${targetMaxOldSpaceSizeInMB}`];
  }

  return [];
}

async function relaunchWithAdditionalArgs(additionalArgs: string[]) {
  const nodeArgs = [...additionalArgs, ...process.argv.slice(1)];
  const newEnv = { ...process.env, GEMINI_CLI_NO_RELAUNCH: 'true' };

  const child = spawn(process.execPath, nodeArgs, {
    stdio: 'inherit',
    env: newEnv,
  });

  await new Promise((resolve) => child.on('close', resolve));
  process.exit(0);
}
import { runAcpPeer } from './acp/acpPeer.js';

export function setupUnhandledRejectionHandler() {
  let unhandledRejectionOccurred = false;
  process.on('unhandledRejection', (reason, _promise) => {
    const errorMessage = `=========================================
This is an unexpected error. Please file a bug report using the /bug tool.
CRITICAL: Unhandled Promise Rejection!
=========================================
Reason: ${reason}${
      reason instanceof Error && reason.stack
        ? `
Stack trace:
${reason.stack}`
        : ''
    }`;
    appEvents.emit(AppEvent.LogError, errorMessage);
    if (!unhandledRejectionOccurred) {
      unhandledRejectionOccurred = true;
      appEvents.emit(AppEvent.OpenDebugConsole);
    }
  });
}

export async function main() {
  setupUnhandledRejectionHandler();
  const workspaceRoot = process.cwd();
  const settings = loadSettings(workspaceRoot);

  await cleanupCheckpoints();
  if (settings.errors.length > 0) {
    for (const error of settings.errors) {
      let errorMessage = `Error in ${error.path}: ${error.message}`;
      if (!process.env.NO_COLOR) {
        errorMessage = `\x1b[31m${errorMessage}\x1b[0m`;
      }
      console.error(errorMessage);
      console.error(`Please fix ${error.path} and try again.`);
    }
    process.exit(1);
  }

  const argv = await parseArguments();
  const extensions = loadExtensions(workspaceRoot);
  const config = await loadCliConfig(
    settings.merged,
    extensions,
    sessionId,
    argv,
  );

  // Initialize Warpio manager early to ensure default persona is activated
  // This enables provider integration to work regardless of explicit persona usage
  try {
    const warpioManager = WarpioPersonaManager.getInstance();
    // The constructor automatically activates the default persona
  } catch (error) {
    console.debug(
      'Warpio initialization failed:',
      error instanceof Error ? error.message : String(error),
    );
    // Continue without Warpio if initialization fails
  }

  dns.setDefaultResultOrder(
    validateDnsResolutionOrder(settings.merged.dnsResolutionOrder),
  );

  if (argv.promptInteractive && !process.stdin.isTTY) {
    console.error(
      'Error: The --prompt-interactive flag is not supported when piping input from stdin.',
    );
    process.exit(1);
  }

  if (config.getListExtensions()) {
    console.log('Installed extensions:');
    for (const extension of extensions) {
      console.log(`- ${extension.config.name}`);
    }
    process.exit(0);
  }

  // Handle persona CLI commands
  if (argv.listPersonas) {
    console.log('Available Warpio personas:');
    const personas = WarpioPersonaManager.getInstance().listPersonas();
    for (const persona of personas) {
      const definition = WarpioPersonaManager.getInstance().getPersona(persona);
      if (definition) {
        console.log(`  ${persona} - ${definition.description}`);
      } else {
        console.log(`  ${persona}`);
      }
    }
    console.log(
      '\nUse "warpio --persona <name>" to launch with a specific persona.',
    );
    console.log(
      'Use "warpio --persona-help <name>" for detailed information about a persona.',
    );
    process.exit(0);
  }

  if (argv.personaHelp) {
    const helpText = WarpioPersonaManager.getInstance().getPersonaHelp(
      argv.personaHelp,
    );
    console.log(helpText);
    process.exit(0);
  }

  // Validate persona selection before proceeding
  if (argv.persona) {
    const availablePersonas = WarpioPersonaManager.getInstance().listPersonas();
    if (!availablePersonas.includes(argv.persona)) {
      console.error(`Error: Persona '${argv.persona}' not found.`);
      console.error('Available personas:');
      for (const persona of availablePersonas) {
        console.error(`  ${persona}`);
      }
      console.error(
        '\\nUse "warpio --list-personas" for detailed information.',
      );
      process.exit(1);
    }

    // Activate the persona
    const warpioManager = WarpioPersonaManager.getInstance();
    warpioManager.activatePersona(argv.persona);
  }

  // ENV-only configuration (no complex config files)

  if (argv.listModels) {
    console.log('Warpio providers (set via WARPIO_PROVIDER env var):');
    console.log('\n  gemini: (default Gemini models)');
    console.log('    Use: warpio -p "your prompt"');
    console.log('\n  lmstudio: (via LMSTUDIO_HOST, LMSTUDIO_MODEL)');
    console.log(
      '    Example: WARPIO_PROVIDER=lmstudio warpio -p "your prompt"',
    );
    console.log('\n  ollama: (via OLLAMA_HOST, OLLAMA_MODEL)');
    console.log('    Example: WARPIO_PROVIDER=ollama warpio -p "your prompt"');
    console.log('\n  openai: (via OPENAI_API_KEY, OPENAI_MODEL)');
    console.log('    Example: WARPIO_PROVIDER=openai warpio -p "your prompt"');
    console.log('\nConfigure via .env file for convenience.');
    process.exit(0);
  }

  if (argv.testConnection) {
    const provider = process.env.WARPIO_PROVIDER || 'gemini';
    console.log(`Testing connection with ${provider} provider...\n`);
    console.log('ENV-only configuration - test by running a simple query:');
    console.log(`  warpio -p "What is 2+2?"`);
    console.log('\nIf it works, your configuration is correct!');
    process.exit(0);
  }

  // Handle context handover execution
  if (argv.contextFrom && argv.task) {
    console.log(`🔄 Loading context handover from: ${argv.contextFrom}`);
    console.log(`🎯 Task: ${argv.task}`);

    try {
      const { contextHandoverService } = await import(
        '@google/gemini-cli-core'
      );
      const context = await contextHandoverService.instance.loadContext(
        argv.contextFrom,
      );

      console.log(
        `📦 Context loaded: ${context.metadata.sourcePersona} → ${context.metadata.targetPersona}`,
      );

      // Execute the handover task in non-interactive mode if specified
      if (argv.nonInteractive) {
        console.log('🤖 Running in non-interactive mode...');
        // Set the task as the prompt
        argv.prompt = argv.task;
        // Cleanup context file after loading
        await contextHandoverService.instance.cleanupContext(argv.contextFrom);
      } else {
        console.log('💬 Starting interactive session with handover context...');
        argv.promptInteractive = argv.task;
      }
    } catch (error) {
      console.error(`❌ Failed to load context handover: ${error}`);
      process.exit(1);
    }
  }

  // Set a default auth type if one isn't set.
  if (!settings.merged.selectedAuthType) {
    if (process.env.CLOUD_SHELL === 'true') {
      settings.setValue(
        SettingScope.User,
        'selectedAuthType',
        AuthType.CLOUD_SHELL,
      );
    }
  }

  setMaxSizedBoxDebugging(config.getDebugMode());

  await config.initialize();

  // Only attempt IDE connection in interactive mode
  if (config.getIdeMode() && config.isInteractive()) {
    await config.getIdeClient().connect();
    logIdeConnection(config, new IdeConnectionEvent(IdeConnectionType.START));
  }

  // Load custom themes from settings
  themeManager.loadCustomThemes(settings.merged.customThemes);

  if (settings.merged.theme) {
    if (!themeManager.setActiveTheme(settings.merged.theme)) {
      // If the theme is not found during initial load, log a warning and continue.
      // The useThemeCommand hook in App.tsx will handle opening the dialog.
      console.warn(`Warning: Theme "${settings.merged.theme}" not found.`);
    }
  }

  // hop into sandbox if we are outside and sandboxing is enabled
  if (!process.env.SANDBOX) {
    const memoryArgs = settings.merged.autoConfigureMaxOldSpaceSize
      ? getNodeMemoryArgs(config)
      : [];
    const sandboxConfig = config.getSandbox();
    if (sandboxConfig) {
      if (
        settings.merged.selectedAuthType &&
        !settings.merged.useExternalAuth
      ) {
        // Validate authentication here because the sandbox will interfere with the Oauth2 web redirect.
        try {
          const err = validateAuthMethod(settings.merged.selectedAuthType);
          if (err) {
            throw new Error(err);
          }
          await config.refreshAuth(settings.merged.selectedAuthType);
        } catch (err) {
          console.error('Error authenticating:', err);
          process.exit(1);
        }
      }
      await start_sandbox(sandboxConfig, memoryArgs, config);
      process.exit(0);
    } else {
      // Not in a sandbox and not entering one, so relaunch with additional
      // arguments to control memory usage if needed.
      if (memoryArgs.length > 0) {
        await relaunchWithAdditionalArgs(memoryArgs);
        process.exit(0);
      }
    }
  }

  if (
    settings.merged.selectedAuthType === AuthType.LOGIN_WITH_GOOGLE &&
    config.isBrowserLaunchSuppressed()
  ) {
    // Do oauth before app renders to make copying the link possible.
    await getOauthClient(settings.merged.selectedAuthType, config);
  }

  if (config.getExperimentalAcp()) {
    return runAcpPeer(config, settings);
  }

  let input = config.getQuestion();
  const startupWarnings = [
    ...(await getStartupWarnings()),
    ...(await getUserStartupWarnings(workspaceRoot)),
  ];

  // Render UI, passing necessary config values. Check that there is no command line question.
  if (config.isInteractive()) {
    const version = await getCliVersion();
    setWindowTitle(basename(workspaceRoot), settings);
    const instance = render(
      <React.StrictMode>
        <SettingsContext.Provider value={settings}>
          <AppWrapper
            config={config}
            settings={settings}
            startupWarnings={startupWarnings}
            version={version}
          />
        </SettingsContext.Provider>
      </React.StrictMode>,
      { exitOnCtrlC: false },
    );

    checkForUpdates()
      .then((info) => {
        handleAutoUpdate(info, settings, config.getProjectRoot());
      })
      .catch((err) => {
        // Silently ignore update check errors.
        if (config.getDebugMode()) {
          console.error('Update check failed:', err);
        }
      });

    registerCleanup(() => instance.unmount());
    return;
  }
  // If not a TTY, read from stdin
  // This is for cases where the user pipes input directly into the command
  if (!process.stdin.isTTY && !input) {
    input += await readStdin();
  }
  if (!input) {
    console.error('No input provided via stdin.');
    process.exit(1);
  }

  const prompt_id = Math.random().toString(16).slice(2);
  logUserPrompt(config, {
    'event.name': 'user_prompt',
    'event.timestamp': new Date().toISOString(),
    prompt: input,
    prompt_id,
    auth_type: config.getContentGeneratorConfig()?.authType,
    prompt_length: input.length,
  });

  const nonInteractiveConfig = await validateNonInteractiveAuth(
    settings.merged.selectedAuthType,
    settings.merged.useExternalAuth,
    config,
  );

  await runNonInteractive(nonInteractiveConfig, input, prompt_id);
  process.exit(0);
}

function setWindowTitle(title: string, settings: LoadedSettings) {
  if (!settings.merged.hideWindowTitle) {
    const windowTitle = (process.env.CLI_TITLE || `Warpio - ${title}`).replace(
      // eslint-disable-next-line no-control-regex
      /[\x00-\x1F\x7F]/g,
      '',
    );
    process.stdout.write(`\x1b]2;${windowTitle}\x07`);

    process.on('exit', () => {
      process.stdout.write(`\x1b]2;\x07`);
    });
  }
}
