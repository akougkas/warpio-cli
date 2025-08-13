/**
 * Warpio Provider Integration with Vercel AI SDK
 * Configuration-driven provider integration with zero hardcoded defaults
 */

import { ProviderPreferences } from './types.js';
import { WarpioProviderRegistry } from './provider-registry.js';
import { WarpioConfigLoader, WarpioRuntimeConfig } from './config/index.js';
import { AISDKProviderManager } from '../providers/manager.js';

export class WarpioProviderIntegration {
  private configLoader: WarpioConfigLoader;
  private providerRegistry: WarpioProviderRegistry;
  private currentOverrides: { provider?: string; model?: string } | null = null;

  constructor() {
    this.configLoader = new WarpioConfigLoader();
    this.providerRegistry = new WarpioProviderRegistry(this.configLoader);
  }

  /**
   * Set provider preferences from persona (deprecated approach)
   * TODO: Remove this once personas are cleaned up
   */
  setProviderPreferences(preferences: ProviderPreferences): void {
    console.warn('DEPRECATED: setProviderPreferences() should be replaced with configuration-driven approach');
    
    // Convert to new override format
    this.currentOverrides = {
      provider: preferences.preferred,
      model: preferences.model,
    };
  }

  /**
   * Clear provider preferences
   */
  clearProviderPreferences(): void {
    this.currentOverrides = null;
  }

  /**
   * Get current preferences (deprecated)
   */
  getCurrentPreferences(): ProviderPreferences | null {
    if (!this.currentOverrides) return null;
    
    return {
      preferred: this.currentOverrides.provider as any || 'gemini',
      model: this.currentOverrides.model,
    };
  }

  /**
   * Create content generator for persona (new configuration-driven approach)
   */
  createPersonaContentGenerator(personaName: string) {
    try {
      // Check for CLI model override
      const cliProvider = process.env.WARPIO_CLI_PROVIDER;
      const cliModel = process.env.WARPIO_CLI_MODEL;
      
      let overrides = this.currentOverrides;
      if (cliProvider && cliModel) {
        overrides = { provider: cliProvider, model: cliModel };
      }

      const config = this.configLoader.loadConfiguration(overrides || undefined);
      
      // Only create AISDKProviderManager for non-gemini providers
      if (config.provider === 'gemini') {
        return null; // Fall back to default Gemini
      }

      // Use the new dynamic provider registry
      try {
        const { AISDKProviderManager } = require('../providers/manager.js');
        console.debug(`Creating AISDKProviderManager for ${config.provider}::${config.model}`);
        const manager = new AISDKProviderManager(this.convertToLegacyConfig(config));
        console.debug(`Successfully created AISDKProviderManager for ${config.provider}`);
        return manager;
      } catch (error) {
        console.error('Failed to create Warpio content generator:', error);
        return null;
      }
    } catch (error) {
      // If configuration fails, don't fall back silently - let it fail properly
      console.error('Configuration error:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Create language model for persona using dynamic registry
   */
  createPersonaLanguageModel(personaName: string) {
    try {
      // Check for CLI model override
      const cliProvider = process.env.WARPIO_CLI_PROVIDER;
      const cliModel = process.env.WARPIO_CLI_MODEL;
      
      let overrides = this.currentOverrides;
      if (cliProvider && cliModel) {
        overrides = { provider: cliProvider, model: cliModel };
      }

      return this.providerRegistry.getLanguageModel(overrides || undefined);
    } catch (error) {
      console.error('Failed to create language model:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Test provider availability using configuration
   */
  async testProviderAvailability(): Promise<{ [provider: string]: boolean }> {
    const results: { [provider: string]: boolean } = {};
    const availableModels = this.providerRegistry.getAvailableModels();
    
    // Test each configured provider
    for (const [provider, modelList] of Object.entries(availableModels)) {
      if (modelList.length > 0) {
        try {
          const config = this.configLoader.loadConfiguration({
            provider,
            model: modelList[0], // Test with first available model
          });
          
          const isAvailable = await this.providerRegistry.testProviderAvailability(config);
          results[provider] = isAvailable;
          console.log(`${isAvailable ? '✅' : '❌'} ${provider} provider ${isAvailable ? 'available' : 'unavailable'}`);
        } catch (error) {
          results[provider] = false;
          console.log(`❌ ${provider} provider error: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        results[provider] = false;
        console.log(`❌ ${provider} provider: no models configured`);
      }
    }
    
    return results;
  }

  /**
   * Convert new config format to legacy format for compatibility
   * TODO: Remove this once AISDKProviderManager is updated
   */
  private convertToLegacyConfig(config: WarpioRuntimeConfig): any {
    return {
      provider: config.provider as any,
      model: config.model,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    };
  }
}