#!/usr/bin/env node

import { ModelDiscoveryService } from './packages/core/dist/src/core/modelDiscovery.js';

async function testLMStudio() {
  console.log('Testing LM Studio model discovery...\n');
  
  const discovery = new ModelDiscoveryService();
  
  try {
    // Test all providers
    const allModels = await discovery.listAllProvidersModels({});
    
    console.log('Providers found:', Object.keys(allModels));
    
    // Check LM Studio specifically
    if (allModels.lmstudio) {
      console.log('\nLM Studio models:');
      allModels.lmstudio.forEach(model => {
        console.log(`  - ${model.id} (aliases: ${model.aliases?.join(', ') || 'none'})`);
      });
    } else {
      console.log('\nLM Studio not detected in model discovery');
    }
    
    // Try to get LM Studio models directly
    console.log('\nDirect LM Studio query:');
    const lmStudioModels = await discovery.listAvailableModels('lmstudio');
    console.log('Direct result:', lmStudioModels);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testLMStudio().catch(console.error);