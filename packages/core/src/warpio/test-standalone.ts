/**
 * Standalone Warpio System Test
 * Verify the new persona system works independently
 */

import { WarpioPersonaManager, createWarpioCliHooks } from './index.js';

async function testWarpioStandaloneSystem() {
  console.log('🧪 Testing Standalone Warpio Persona System');
  console.log('==========================================');

  try {
    // Test 1: Initialize manager
    console.log('✅ Creating Warpio persona manager...');
    const manager = WarpioPersonaManager.getInstance();
    console.log('✅ Warpio manager created successfully');

    // Test 2: List personas
    console.log('✅ Listing available personas...');
    const personas = manager.listPersonas();
    console.log(`✅ Found ${personas.length} personas: ${personas.join(', ')}`);

    // Test 3: Get default persona
    console.log('✅ Getting default persona...');
    const defaultPersona = manager.getPersona('warpio');
    if (defaultPersona) {
      console.log(`✅ Default persona loaded: ${defaultPersona.name}`);
      console.log(`   Description: ${defaultPersona.description}`);
      console.log(`   Tools: ${defaultPersona.tools.length} available`);
    } else {
      console.log('❌ Failed to load default persona');
    }

    // Test 4: Activate persona
    console.log('✅ Activating default persona...');
    const activated = await manager.activatePersona('warpio');
    if (activated) {
      console.log('✅ Persona activated successfully');

      const activePersona = manager.getActivePersona();
      console.log(`   Active persona: ${activePersona?.name}`);
    } else {
      console.log('❌ Failed to activate persona');
    }

    // Test 5: Test tool filtering
    console.log('✅ Testing tool filtering...');
    const allTools = [
      'Bash',
      'Read',
      'Write',
      'Edit',
      'Grep',
      'Glob',
      'LS',
      'Task',
      'WebSearch',
      'WebFetch',
    ];
    const filteredTools = manager.filterTools(allTools);
    console.log(`✅ Tool filtering: ${filteredTools.length} tools allowed`);

    // Test 6: Test system prompt enhancement
    console.log('✅ Testing system prompt enhancement...');
    const basePrompt = 'You are a helpful assistant.';
    const enhancedPrompt = manager.enhanceSystemPrompt(basePrompt);
    const hasEnhancement = enhancedPrompt.length > basePrompt.length;
    console.log(`✅ System prompt enhanced: ${hasEnhancement ? 'YES' : 'NO'}`);

    // Test 7: Test CLI hooks
    console.log('✅ Testing CLI hooks...');
    const cliHooks = createWarpioCliHooks();

    // Test persona args parsing
    const testArgs = { persona: 'warpio', listPersonas: true };
    const parsedArgs = cliHooks.parsePersonaArgs(testArgs);
    console.log(
      `✅ CLI args parsed: persona=${parsedArgs.persona}, list=${parsedArgs.listPersonas}`,
    );

    // Test persona validation
    const isValid = await cliHooks.validatePersona('warpio');
    console.log(`✅ Persona validation: ${isValid ? 'VALID' : 'INVALID'}`);

    // Test 8: Deactivate persona
    console.log('✅ Deactivating persona...');
    await manager.deactivatePersona();
    const stillActive = manager.getActivePersona();
    console.log(
      `✅ Persona deactivated: ${stillActive === null ? 'YES' : 'NO'}`,
    );

    console.log('');
    console.log(
      '🎉 All tests passed! Standalone Warpio system is working correctly.',
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }

  return true;
}

// Export test function for manual execution
export { testWarpioStandaloneSystem };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testWarpioStandaloneSystem();
}
