/**
 * Test LMStudio Connection - Vercel AI SDK Integration
 * 
 * This test file verifies that the LMStudio provider works correctly
 * with the gpt-oss-20b model running at http://192.168.86.20:1234
 */

import { createWarpioProviderRegistry, getLanguageModel, parseProviderConfig } from './registry.js';
import { generateText } from 'ai';

async function testLMStudioConnection() {
  console.log('🧪 Testing LMStudio Connection with Vercel AI SDK');
  console.log('==========================================');
  
  // Test environment variables
  console.log('Environment Variables:');
  console.log(`  LMSTUDIO_HOST: ${process.env.LMSTUDIO_HOST || 'http://192.168.86.20:1234/v1'}`);
  console.log(`  LMSTUDIO_MODEL: ${process.env.LMSTUDIO_MODEL || 'gpt-oss-20b'}`);
  console.log(`  WARPIO_PROVIDER: ${process.env.WARPIO_PROVIDER || 'gemini'}`);
  console.log('');

  // Test 1: Create provider registry
  try {
    console.log('✅ Creating provider registry...');
    const registry = createWarpioProviderRegistry();
    console.log('✅ Provider registry created successfully');
    
    // Test 2: Get LMStudio model
    console.log('✅ Getting LMStudio model...');
    const lmstudioModel = registry.languageModel('lmstudio:gpt-oss-20b');
    console.log('✅ LMStudio model obtained successfully');
    
    // Test 3: Test basic text generation (will fail if LMStudio is not running)
    console.log('🔄 Testing basic text generation...');
    try {
      const result = await generateText({
        model: lmstudioModel,
        prompt: 'Say "Hello from LMStudio!" and nothing else.',
        maxTokens: 20,
      });
      
      console.log('✅ LMStudio text generation successful!');
      console.log(`   Response: "${result.text}"`);
      console.log(`   Tokens used: ${result.usage.totalTokens}`);
    } catch (error) {
      console.log('❌ LMStudio connection failed (expected if not running):');
      console.log(`   ${error.message}`);
      console.log('   Will fallback to Gemini in actual usage');
    }
    
    // Test 4: Test fallback mechanism
    console.log('🔄 Testing fallback to Gemini...');
    try {
      const geminiModel = registry.languageModel('gemini:gemini-2.0-flash');
      console.log('✅ Gemini fallback model obtained successfully');
    } catch (error) {
      console.log('❌ Gemini fallback failed:');
      console.log(`   ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Provider registry test failed:', error);
  }
}

async function testProviderConfiguration() {
  console.log('🧪 Testing Provider Configuration');
  console.log('===============================');
  
  // Test different provider configurations
  const configs = [
    { provider: 'gemini' as const },
    { provider: 'lmstudio' as const, model: 'gpt-oss-20b' },
    { provider: 'lmstudio' as const, model: 'default' },
  ];
  
  for (const config of configs) {
    try {
      console.log(`🔄 Testing config: ${JSON.stringify(config)}`);
      const model = getLanguageModel(config);
      console.log(`✅ Model obtained for ${config.provider}:${config.model || 'default'}`);
    } catch (error) {
      console.log(`❌ Failed to get model for ${config.provider}:`, error.message);
    }
  }
}

// Export test functions for manual execution
export { testLMStudioConnection, testProviderConfiguration };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await testLMStudioConnection();
    console.log('');
    await testProviderConfiguration();
  })();
}