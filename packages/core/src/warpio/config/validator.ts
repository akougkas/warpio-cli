/**
 * Warpio Configuration Validation and Testing
 * Comprehensive validation with actionable error messages
 */

import { WarpioConfigLoader, WarpioRuntimeConfig, WarpioConfigurationError } from './loader.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}

export interface ConnectionTestResult {
  provider: string;
  model: string;
  isAvailable: boolean;
  error?: string;
  latency?: number;
  details?: Record<string, unknown>;
}

/**
 * Configuration validation and connection testing
 */
export class WarpioConfigValidator {
  constructor(private configLoader: WarpioConfigLoader) {}

  /**
   * Validate complete configuration setup
   */
  validateConfiguration(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {},
    };

    try {
      // Test loading configuration
      const config = this.configLoader.loadConfiguration();
      result.details.loadedConfig = config;

      // Validate provider support
      const supportedProviders = ['lmstudio', 'ollama', 'gemini', 'openai'];
      if (!supportedProviders.includes(config.provider)) {
        result.isValid = false;
        result.errors.push(
          `Unsupported provider "${config.provider}". Supported: ${supportedProviders.join(', ')}`
        );
      }

      // Validate provider-specific requirements
      this.validateProviderRequirements(config, result);

      // Check for common issues
      this.checkCommonIssues(config, result);

    } catch (error) {
      result.isValid = false;
      if (error instanceof WarpioConfigurationError) {
        result.errors.push(error.message);
        if (error.details) {
          result.details.configError = error.details;
        }
      } else {
        result.errors.push(`Configuration error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  }

  /**
   * Test connection to configured provider
   */
  async testConnection(config?: WarpioRuntimeConfig): Promise<ConnectionTestResult> {
    if (!config) {
      try {
        config = this.configLoader.loadConfiguration();
      } catch (error) {
        return {
          provider: 'unknown',
          model: 'unknown',
          isAvailable: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const startTime = Date.now();
    
    try {
      const success = await this.testProviderConnection(config);
      const latency = Date.now() - startTime;

      return {
        provider: config.provider,
        model: config.model,
        isAvailable: success,
        latency,
      };
    } catch (error) {
      return {
        provider: config.provider,
        model: config.model,
        isAvailable: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Test multiple provider configurations
   */
  async testAllProviders(): Promise<ConnectionTestResult[]> {
    const results: ConnectionTestResult[] = [];
    const models = this.configLoader.getAvailableModels();

    for (const [provider, modelList] of Object.entries(models)) {
      for (const model of modelList.slice(0, 2)) { // Test max 2 models per provider
        try {
          const config = this.configLoader.loadConfiguration({ provider, model });
          const result = await this.testConnection(config);
          results.push(result);
        } catch (error) {
          results.push({
            provider,
            model,
            isAvailable: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return results;
  }

  /**
   * Generate setup guide for configuration issues
   */
  generateSetupGuide(validationResult: ValidationResult): string {
    const lines: string[] = [];
    
    lines.push('# Warpio Configuration Setup Guide');
    lines.push('');

    if (validationResult.errors.length > 0) {
      lines.push('## ❌ Configuration Errors');
      for (const error of validationResult.errors) {
        lines.push(`- ${error}`);
      }
      lines.push('');
    }

    if (validationResult.warnings.length > 0) {
      lines.push('## ⚠️  Configuration Warnings');
      for (const warning of validationResult.warnings) {
        lines.push(`- ${warning}`);
      }
      lines.push('');
    }

    // Add provider-specific setup instructions
    lines.push('## 🔧 Provider Setup Instructions');
    lines.push('');

    lines.push('### LM Studio Configuration');
    lines.push('```bash');
    lines.push('export WARPIO_DEFAULT_PROVIDER=lmstudio');
    lines.push('export WARPIO_DEFAULT_MODEL=qwen3-4b-instruct-2507');
    lines.push('export LMSTUDIO_HOST=http://192.168.86.20:1234/v1');
    lines.push('export LMSTUDIO_API_KEY=lm-studio');
    lines.push('```');
    lines.push('');

    lines.push('### Ollama Configuration');
    lines.push('```bash');
    lines.push('export WARPIO_DEFAULT_PROVIDER=ollama');
    lines.push('export WARPIO_DEFAULT_MODEL=qwen2.5:7b');
    lines.push('export OLLAMA_HOST=http://localhost:11434');
    lines.push('```');
    lines.push('');

    lines.push('### Gemini Configuration');
    lines.push('```bash');
    lines.push('export WARPIO_DEFAULT_PROVIDER=gemini');
    lines.push('export WARPIO_DEFAULT_MODEL=gemini-2.0-flash');
    lines.push('export GEMINI_API_KEY=your_api_key_here');
    lines.push('```');
    lines.push('');

    lines.push('## 📋 Configuration File Example (warpio.json)');
    lines.push('```json');
    lines.push(JSON.stringify({
      warpio: {
        default_provider: 'lmstudio',
        default_model: 'qwen3-4b-instruct-2507',
      },
      providers: {
        lmstudio: {
          host: 'http://192.168.86.20:1234/v1',
          api_key: 'lm-studio',
          models: [{
            name: 'qwen3-4b-instruct-2507',
            temperature: 0.7,
            max_tokens: 4096,
          }],
        },
      },
    }, null, 2));
    lines.push('```');
    lines.push('');

    lines.push('## 🚀 CLI Usage Examples');
    lines.push('```bash');
    lines.push('# Use environment/config defaults');
    lines.push('warpio -p "hello"');
    lines.push('');
    lines.push('# Override with specific model');
    lines.push('warpio --model lmstudio::qwen3-4b-instruct-2507 -p "hello"');
    lines.push('warpio --model ollama::qwen2.5:7b -p "hello"');
    lines.push('warpio --model gemini::gemini-2.0-flash -p "hello"');
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Validate provider-specific requirements
   */
  private validateProviderRequirements(
    config: WarpioRuntimeConfig,
    result: ValidationResult
  ): void {
    switch (config.provider) {
      case 'lmstudio':
        if (!config.baseURL) {
          result.errors.push('LM Studio requires LMSTUDIO_HOST configuration');
        } else if (!config.baseURL.includes('1234')) {
          result.warnings.push('LM Studio typically runs on port 1234. Verify your host configuration.');
        }
        break;

      case 'ollama':
        if (!config.baseURL) {
          result.errors.push('Ollama requires OLLAMA_HOST configuration');
        } else if (!config.baseURL.includes('11434')) {
          result.warnings.push('Ollama typically runs on port 11434. Verify your host configuration.');
        }
        break;

      case 'gemini':
        if (!config.apiKey) {
          result.errors.push('Gemini requires GEMINI_API_KEY');
        }
        break;

      case 'openai':
        if (!config.apiKey) {
          result.errors.push('OpenAI requires OPENAI_API_KEY');
        }
        break;
    }
  }

  /**
   * Check for common configuration issues
   */
  private checkCommonIssues(config: WarpioRuntimeConfig, result: ValidationResult): void {
    // Check for localhost vs network addresses
    if (config.baseURL?.includes('localhost') && config.provider === 'lmstudio') {
      result.warnings.push(
        'Using localhost for LM Studio. If running in a different container/machine, use the full IP address.'
      );
    }

    // Check for missing model information
    if (!config.model) {
      result.errors.push('Model name is required');
    }

    // Check for reasonable timeout values
    if (config.timeout && (config.timeout < 5 || config.timeout > 300)) {
      result.warnings.push(
        `Timeout value ${config.timeout}s seems unusual. Recommended range: 5-120 seconds.`
      );
    }
  }

  /**
   * Test actual connection to provider
   */
  private async testProviderConnection(config: WarpioRuntimeConfig): Promise<boolean> {
    // For now, just test basic connectivity
    // In the future, this would make actual API calls
    
    switch (config.provider) {
      case 'lmstudio':
      case 'ollama':
        if (!config.baseURL) return false;
        
        try {
          // Test HTTP connectivity
          const url = new URL(config.baseURL);
          const response = await fetch(`${url.protocol}//${url.host}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });
          return response.ok;
        } catch {
          // Try the base URL
          try {
            const response = await fetch(config.baseURL, {
              method: 'GET', 
              signal: AbortSignal.timeout(5000),
            });
            return true; // Any response means the server is running
          } catch {
            return false;
          }
        }

      case 'gemini':
        return !!config.apiKey;

      case 'openai':
        return !!config.apiKey;

      default:
        return false;
    }
  }
}