/**
 * Warpio Configuration Loader System
 * Production-ready multi-format configuration with zero hardcoded defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export interface WarpioProviderConfig {
  host?: string;
  api_key?: string;
  timeout?: number;
  models?: WarpioModelConfig[];
}

export interface WarpioModelConfig {
  name: string;
  temperature?: number;
  stop_tokens?: string[];
  max_tokens?: number;
  format?: string;
}

export interface WarpioConfigFile {
  warpio?: {
    default_provider?: string;
    default_model?: string;
  };
  providers?: {
    [provider: string]: WarpioProviderConfig;
  };
}

export interface WarpioRuntimeConfig {
  provider: string;
  model: string;
  baseURL?: string;
  apiKey?: string;
  temperature?: number;
  timeout?: number;
  stopTokens?: string[];
  maxTokens?: number;
}

export class WarpioConfigurationError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'WarpioConfigurationError';
  }
}

/**
 * Multi-format configuration loader with strict priority:
 * 1. CLI arguments (--model provider::model)
 * 2. Environment variables (WARPIO_DEFAULT_PROVIDER, etc.)
 * 3. Configuration files (warpio.toml, warpio.json, warpio.yaml)
 * 4. ERROR if no configuration found (zero hardcoded defaults)
 */
export class WarpioConfigLoader {
  private configCache: WarpioConfigFile | null = null;
  private configPath: string | null = null;

  constructor(private workingDirectory: string = process.cwd()) {}

  /**
   * Load complete runtime configuration with validation
   */
  loadConfiguration(cliOverrides?: {
    provider?: string;
    model?: string;
  }): WarpioRuntimeConfig {
    // Step 1: CLI arguments override everything
    if (cliOverrides?.provider && cliOverrides?.model) {
      return this.buildRuntimeConfig(
        cliOverrides.provider,
        cliOverrides.model,
        cliOverrides
      );
    }

    // Step 2: Environment variables
    const envProvider = process.env.WARPIO_DEFAULT_PROVIDER;
    const envModel = process.env.WARPIO_DEFAULT_MODEL;
    if (envProvider && envModel) {
      return this.buildRuntimeConfig(envProvider, envModel);
    }

    // Step 3: Configuration files
    const configFile = this.loadConfigFile();
    if (configFile?.warpio?.default_provider && configFile?.warpio?.default_model) {
      return this.buildRuntimeConfig(
        configFile.warpio.default_provider,
        configFile.warpio.default_model
      );
    }

    // Step 4: ERROR - no configuration found
    throw new WarpioConfigurationError(
      'No Warpio configuration found. Please set up your provider and model configuration.',
      {
        suggestion: 'Run `warpio --help` for configuration options',
        envVars: ['WARPIO_DEFAULT_PROVIDER', 'WARPIO_DEFAULT_MODEL'],
        configFiles: ['warpio.toml', 'warpio.json', 'warpio.yaml'],
      }
    );
  }

  /**
   * Parse CLI model argument with provider::model syntax
   */
  parseModelArgument(modelArg: string): { provider: string; model: string } {
    if (!modelArg.includes('::')) {
      throw new WarpioConfigurationError(
        `Invalid model format: "${modelArg}". Use format: provider::model`,
        {
          examples: [
            'lmstudio::qwen3-4b-instruct-2507',
            'ollama::registry.ollama.ai/library/qwen2.5:7b',
            'gemini::gemini-2.0-flash',
          ],
        }
      );
    }

    const [provider, ...modelParts] = modelArg.split('::');
    const model = modelParts.join('::'); // Rejoin in case model name contains ::

    if (!provider || !model) {
      throw new WarpioConfigurationError(
        `Invalid model format: "${modelArg}". Both provider and model are required.`
      );
    }

    return { provider: provider.trim(), model: model.trim() };
  }

  /**
   * Build complete runtime configuration from provider and model
   */
  private buildRuntimeConfig(
    provider: string,
    model: string,
    overrides?: Record<string, unknown>
  ): WarpioRuntimeConfig {
    const config: WarpioRuntimeConfig = {
      provider,
      model,
    };

    // Load provider-specific configuration
    const configFile = this.loadConfigFile();
    const providerConfig = configFile?.providers?.[provider];

    // Apply configuration priority: env vars > config file > defaults
    switch (provider) {
      case 'lmstudio':
        config.baseURL = process.env.LMSTUDIO_HOST || providerConfig?.host;
        config.apiKey = process.env.LMSTUDIO_API_KEY || providerConfig?.api_key;
        break;

      case 'ollama':
        config.baseURL = process.env.OLLAMA_HOST || providerConfig?.host;
        config.apiKey = process.env.OLLAMA_API_KEY || providerConfig?.api_key;
        break;

      case 'gemini':
        config.apiKey = process.env.GEMINI_API_KEY || providerConfig?.api_key;
        break;

      case 'openai':
        config.apiKey = process.env.OPENAI_API_KEY || providerConfig?.api_key;
        config.baseURL = process.env.OPENAI_BASE_URL || providerConfig?.host;
        break;

      default:
        throw new WarpioConfigurationError(
          `Unsupported provider: "${provider}"`,
          {
            supportedProviders: ['lmstudio', 'ollama', 'gemini', 'openai'],
          }
        );
    }

    // Apply model-specific settings from config file
    if (providerConfig?.models) {
      const modelConfig = providerConfig.models.find(m => m.name === model);
      if (modelConfig) {
        config.temperature = modelConfig.temperature;
        config.stopTokens = modelConfig.stop_tokens;
        config.maxTokens = modelConfig.max_tokens;
      }
    }

    // Apply provider-wide settings
    if (providerConfig) {
      config.timeout = config.timeout || providerConfig.timeout;
    }

    // Apply CLI overrides
    if (overrides) {
      Object.assign(config, overrides);
    }

    this.validateRuntimeConfig(config);
    return config;
  }

  /**
   * Load configuration file with multi-format support
   */
  loadConfigFile(): WarpioConfigFile | null {
    if (this.configCache) {
      return this.configCache;
    }

    // Search for config files in order of preference
    const searchPaths = [
      path.join(this.workingDirectory, 'warpio.toml'),
      path.join(this.workingDirectory, 'warpio.json'),
      path.join(this.workingDirectory, 'warpio.yaml'),
      path.join(homedir(), '.config', 'warpio', 'warpio.toml'),
      path.join(homedir(), '.config', 'warpio', 'warpio.json'),
      path.join(homedir(), '.config', 'warpio', 'warpio.yaml'),
    ];

    for (const configPath of searchPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          this.configPath = configPath;

          if (configPath.endsWith('.json')) {
            this.configCache = JSON.parse(content);
          } else if (configPath.endsWith('.toml')) {
            // TODO: Add TOML parser when needed
            throw new WarpioConfigurationError(
              'TOML configuration files not yet supported. Use JSON format.'
            );
          } else if (configPath.endsWith('.yaml')) {
            // TODO: Add YAML parser when needed  
            throw new WarpioConfigurationError(
              'YAML configuration files not yet supported. Use JSON format.'
            );
          }

          return this.configCache;
        } catch (error) {
          throw new WarpioConfigurationError(
            `Failed to parse configuration file: ${configPath}`,
            { error: error instanceof Error ? error.message : String(error) }
          );
        }
      }
    }

    return null;
  }

  /**
   * Validate runtime configuration completeness
   */
  private validateRuntimeConfig(config: WarpioRuntimeConfig): void {
    if (!config.provider) {
      throw new WarpioConfigurationError('Provider is required');
    }

    if (!config.model) {
      throw new WarpioConfigurationError('Model is required');
    }

    // Provider-specific validation
    switch (config.provider) {
      case 'lmstudio':
      case 'ollama':
        if (!config.baseURL) {
          throw new WarpioConfigurationError(
            `${config.provider} provider requires baseURL configuration`,
            {
              envVar: config.provider === 'lmstudio' ? 'LMSTUDIO_HOST' : 'OLLAMA_HOST',
              example: config.provider === 'lmstudio' 
                ? 'http://192.168.86.20:1234/v1' 
                : 'http://localhost:11434',
            }
          );
        }
        break;

      case 'gemini':
        if (!config.apiKey) {
          throw new WarpioConfigurationError(
            'Gemini provider requires API key',
            { envVar: 'GEMINI_API_KEY' }
          );
        }
        break;

      case 'openai':
        if (!config.apiKey) {
          throw new WarpioConfigurationError(
            'OpenAI provider requires API key',
            { envVar: 'OPENAI_API_KEY' }
          );
        }
        break;
    }
  }

  /**
   * List available models from configuration
   */
  getAvailableModels(): Record<string, string[]> {
    const configFile = this.loadConfigFile();
    const models: Record<string, string[]> = {};

    if (configFile?.providers) {
      for (const [provider, config] of Object.entries(configFile.providers)) {
        if (config.models) {
          models[provider] = config.models.map(m => m.name);
        }
      }
    }

    return models;
  }

  /**
   * Get configuration file path for debugging
   */
  getConfigPath(): string | null {
    this.loadConfigFile(); // Ensure config is loaded
    return this.configPath;
  }
}