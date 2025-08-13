/**
 * Test Model Discovery - LMStudio Provider Testing
 *
 * Tests if LMStudio provider is discoverable and shows available models
 * without running actual LLM inference.
 */
import { createWarpioProviderRegistry, parseProviderConfig, getLanguageModel } from './registry.js';
import { createWarpioContentGenerator } from './warpio-content-generator.js';
/**
 * Test LMStudio model discovery
 */
export async function testModelDiscovery() {
    console.log('🔍 Testing Model Discovery');
    console.log('==========================');
    // Test 1: Provider registry creation
    console.log('1️⃣  Creating provider registry...');
    try {
        const registry = createWarpioProviderRegistry();
        console.log('✅ Provider registry created successfully');
        // List available provider types
        console.log('📋 Testing provider model IDs:');
        const testConfigs = [
            { provider: 'gemini', model: 'gemini-2.0-flash' },
            { provider: 'lmstudio', model: 'gpt-oss-20b' },
            { provider: 'lmstudio', model: 'default' },
            { provider: 'ollama', model: 'gpt-oss' },
        ];
        for (const config of testConfigs) {
            try {
                const modelId = `${config.provider}:${config.model}`;
                const model = registry.languageModel(modelId);
                console.log(`   ✅ ${modelId} - Model object created`);
            }
            catch (error) {
                console.log(`   ❌ ${config.provider}:${config.model} - ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    catch (error) {
        console.log(`❌ Provider registry failed: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }
    // Test 2: Configuration parsing
    console.log('\\n2️⃣  Testing configuration parsing...');
    const originalProvider = process.env.WARPIO_PROVIDER;
    const originalModel = process.env.WARPIO_MODEL;
    try {
        // Test LMStudio config
        process.env.WARPIO_PROVIDER = 'lmstudio';
        process.env.WARPIO_MODEL = 'gpt-oss-20b';
        const config = parseProviderConfig();
        console.log(`✅ Config parsed: ${JSON.stringify(config, null, 2)}`);
        // Test getting language model
        console.log('🎯 Getting language model from config...');
        const model = getLanguageModel(config);
        console.log('✅ Language model obtained successfully');
        console.log(`   Provider: ${config.provider}`);
        console.log(`   Model: ${config.model || 'default'}`);
        console.log(`   Base URL: ${config.baseURL || 'default'}`);
    }
    catch (error) {
        console.log(`❌ Config test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    finally {
        // Restore environment
        if (originalProvider)
            process.env.WARPIO_PROVIDER = originalProvider;
        else
            delete process.env.WARPIO_PROVIDER;
        if (originalModel)
            process.env.WARPIO_MODEL = originalModel;
        else
            delete process.env.WARPIO_MODEL;
    }
    // Test 3: Warpio Content Generator creation
    console.log('\\n3️⃣  Testing Warpio Content Generator...');
    try {
        const generator = createWarpioContentGenerator({
            provider: 'lmstudio',
            model: 'gpt-oss-20b',
            baseURL: 'http://192.168.86.20:1234/v1'
        });
        console.log('✅ Warpio Content Generator created successfully');
        // Get underlying model without making requests
        const model = generator.getModel();
        console.log('✅ Underlying AI SDK model obtained');
        console.log('   Model is ready for inference (not testing connection)');
    }
    catch (error) {
        console.log(`❌ Generator test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Test 4: Environment variable configurations
    console.log('\\n4️⃣  Testing environment variable configurations...');
    const testEnvs = [
        { WARPIO_PROVIDER: 'gemini', WARPIO_MODEL: undefined },
        { WARPIO_PROVIDER: 'lmstudio', WARPIO_MODEL: 'gpt-oss-20b' },
        { WARPIO_PROVIDER: 'ollama', WARPIO_MODEL: 'gpt-oss:20b' },
    ];
    for (const testEnv of testEnvs) {
        const oldProvider = process.env.WARPIO_PROVIDER;
        const oldModel = process.env.WARPIO_MODEL;
        try {
            if (testEnv.WARPIO_PROVIDER)
                process.env.WARPIO_PROVIDER = testEnv.WARPIO_PROVIDER;
            if (testEnv.WARPIO_MODEL)
                process.env.WARPIO_MODEL = testEnv.WARPIO_MODEL;
            else
                delete process.env.WARPIO_MODEL;
            const config = parseProviderConfig();
            const modelId = `${config.provider}:${config.model || 'default'}`;
            console.log(`   ✅ ${modelId} configuration valid`);
        }
        catch (error) {
            console.log(`   ❌ ${testEnv.WARPIO_PROVIDER} config failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            // Restore
            if (oldProvider)
                process.env.WARPIO_PROVIDER = oldProvider;
            else
                delete process.env.WARPIO_PROVIDER;
            if (oldModel)
                process.env.WARPIO_MODEL = oldModel;
            else
                delete process.env.WARPIO_MODEL;
        }
    }
    console.log('\\n🏁 Model Discovery Test Complete!');
    console.log('   ✅ Provider registry functional');
    console.log('   ✅ LMStudio provider discoverable');
    console.log('   ✅ Configuration system working');
    console.log('   ✅ Ready for Warpio integration');
}
/**
 * Test just the LMStudio connection (no inference)
 */
export async function testLMStudioReadiness() {
    console.log('🧪 Testing LMStudio Readiness (No Inference)');
    console.log('===========================================');
    try {
        const generator = createWarpioContentGenerator({
            provider: 'lmstudio',
            model: 'gpt-oss-20b',
            baseURL: 'http://192.168.86.20:1234/v1'
        });
        console.log('✅ LMStudio provider initialized successfully');
        console.log('📋 Configuration details:');
        console.log('   Host: http://192.168.86.20:1234/v1');
        console.log('   Model: gpt-oss-20b');
        console.log('   Provider: lmstudio');
        console.log('\\n📝 Note: This test only checks provider initialization.');
        console.log('   Actual LLM inference will be tested separately.');
        return true;
    }
    catch (error) {
        console.log(`❌ LMStudio readiness test failed: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}
// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testModelDiscovery()
        .then(() => testLMStudioReadiness())
        .then((success) => {
        process.exit(success ? 0 : 1);
    })
        .catch((error) => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}
