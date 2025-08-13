/**
 * Warpio Provider Integration with Vercel AI SDK
 * Persona-specific provider configuration
 */
import { createWarpioProviderRegistry, getLanguageModel } from '../providers/registry.js';
import { createWarpioContentGenerator } from '../providers/warpio-content-generator.js';
export class WarpioProviderIntegration {
    currentPreferences = null;
    originalConfig = null;
    setProviderPreferences(preferences) {
        this.currentPreferences = preferences;
        // Store original config for restoration
        if (!this.originalConfig) {
            this.originalConfig = this.getCurrentProviderConfig();
        }
        // Override environment variables temporarily
        process.env.WARPIO_PROVIDER = preferences.preferred;
        if (preferences.model) {
            process.env.WARPIO_MODEL = preferences.model;
        }
    }
    clearProviderPreferences() {
        if (this.originalConfig) {
            // Restore original config
            process.env.WARPIO_PROVIDER = this.originalConfig.provider;
            if (this.originalConfig.model) {
                process.env.WARPIO_MODEL = this.originalConfig.model;
            }
        }
        this.currentPreferences = null;
        this.originalConfig = null;
    }
    getCurrentPreferences() {
        return this.currentPreferences;
    }
    createPersonaContentGenerator(personaName) {
        if (!this.currentPreferences) {
            return null;
        }
        const config = {
            provider: this.currentPreferences.preferred,
            model: this.currentPreferences.model,
            baseURL: process.env.LMSTUDIO_HOST || process.env.OLLAMA_HOST,
            apiKey: process.env.LMSTUDIO_API_KEY || process.env.OLLAMA_API_KEY,
        };
        try {
            const generator = createWarpioContentGenerator(config);
            console.log(`✅ Created content generator for ${personaName} using ${config.provider}:${config.model || 'default'}`);
            return generator;
        }
        catch (error) {
            console.warn(`Failed to create content generator for ${personaName}:`, error);
            return null;
        }
    }
    createPersonaLanguageModel(personaName) {
        if (!this.currentPreferences) {
            return null;
        }
        const config = {
            provider: this.currentPreferences.preferred,
            model: this.currentPreferences.model,
            baseURL: process.env.LMSTUDIO_HOST || process.env.OLLAMA_HOST,
            apiKey: process.env.LMSTUDIO_API_KEY || process.env.OLLAMA_API_KEY,
        };
        try {
            const model = getLanguageModel(config);
            console.log(`✅ Created language model for ${personaName} using ${config.provider}:${config.model || 'default'}`);
            return model;
        }
        catch (error) {
            console.warn(`Failed to create language model for ${personaName}:`, error);
            return null;
        }
    }
    getCurrentProviderConfig() {
        return {
            provider: process.env.WARPIO_PROVIDER || 'gemini',
            model: process.env.WARPIO_MODEL,
            baseURL: process.env.WARPIO_BASE_URL,
            apiKey: process.env.WARPIO_API_KEY,
        };
    }
    /**
     * Test provider availability without making actual requests
     */
    async testProviderAvailability() {
        const results = {};
        const registry = createWarpioProviderRegistry();
        const providersToTest = [
            { provider: 'gemini', model: 'gemini-2.0-flash' },
            { provider: 'lmstudio', model: 'gpt-oss-20b' },
            { provider: 'ollama', model: 'gpt-oss' },
        ];
        for (const config of providersToTest) {
            try {
                const modelId = `${config.provider}:${config.model}`;
                const model = registry.languageModel(modelId);
                results[config.provider] = true;
                console.log(`✅ ${config.provider} provider available`);
            }
            catch (error) {
                results[config.provider] = false;
                console.log(`❌ ${config.provider} provider not available: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return results;
    }
}
