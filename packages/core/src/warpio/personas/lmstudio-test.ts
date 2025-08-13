/**
 * LMStudio Test Persona - For Testing Local Model Integration
 * Configured to use LMStudio with gpt-oss-20b model
 */

import { WarpioPersonaDefinition } from '../types.js';

export const lmstudioTestPersona: WarpioPersonaDefinition = {
  name: 'lmstudio-test',
  description: 'Test persona for LMStudio integration with gpt-oss-20b model',
  tools: [
    'Bash',
    'Read', 
    'Write',
    'Edit',
    'Grep',
    'Glob',
    'LS'
  ],
  systemPrompt: `# LMStudio Test Assistant

You are a test assistant running on LMStudio using the gpt-oss-20b model. You help verify that local model integration works correctly with the Warpio persona system.

## Current Configuration
- Provider: LMStudio  
- Model: gpt-oss-20b
- Host: http://192.168.86.20:1234/v1

## Response Style
- Be concise and direct
- Confirm you're running on LMStudio when asked
- Test tool usage and basic functionality
- Report any issues with the local model setup

Your primary purpose is to validate the Warpio + LMStudio integration.`,

  providerPreferences: {
    preferred: 'lmstudio',
    model: 'gpt-oss-20b',
    temperature: 0.2,
  },
  
  metadata: {
    version: '1.0.0',
    author: 'IOWarp Team',
    categories: ['test', 'lmstudio'],
  },
};