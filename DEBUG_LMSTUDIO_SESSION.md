# Debug Session: Fix LM Studio Integration in Warpio CLI

## Current Status
LM Studio integration is partially implemented but model routing is broken. The models are detected but requests still route to Gemini API instead of LM Studio.

## Working Components
✅ LM Studio server accessible at `http://192.168.86.20:1234`
✅ Model loaded: `qwen3-4b-instruct-2507@q8_0`
✅ Direct API calls work: `curl -X POST http://192.168.86.20:1234/v1/chat/completions`
✅ Model discovery works when queried directly
✅ OpenAI SDK integration implemented in `lmstudioClient.ts`

## Broken Components
❌ Model routing - `npx warpio -m lmstudio:small -p "test"` routes to Gemini
❌ Provider selection - `--provider lmstudio` flag not working
❌ Health check filtering - LM Studio not appearing in `--model list`

## Root Cause
The `Config` class in `packages/core/src/config/config.ts` doesn't properly handle provider routing. When a model is specified with `lmstudio:` prefix, it still creates a Gemini client instead of routing to LMStudioModelClient.

## Files to Focus On
1. `/packages/core/src/config/config.ts` - Line 395-448 (refreshAuth method)
2. `/packages/cli/src/config/config.ts` - CLI config initialization
3. `/packages/core/src/core/clientFactory.ts` - Client creation logic
4. `/packages/cli/src/gemini.tsx` - Main CLI entry point

## Quick Test Commands
```bash
# Test if LM Studio is accessible
curl -s http://192.168.86.20:1234/v1/models | head

# Test model discovery
node test-lmstudio.js

# Test routing (currently broken)
npx warpio -m lmstudio:qwen3-4b-instruct-2507@q8_0 -p "What is 2+2?"
```

## Fix Strategy
1. In `config.ts` refreshAuth method, check for `lmstudio:` prefix BEFORE checking isLocalProvider
2. Ensure ClientFactory.createClient is called with correct provider
3. Fix the cast from LMStudioModelClient to GeminiClient interface
4. Update CLI arg parsing to properly pass provider to Config

## Key Code Snippet to Fix
```typescript
// In packages/core/src/config/config.ts around line 395
const { provider, model: modelName } = parseProviderModel(currentModel);
let isLocal = isLocalProvider(provider);

// This check needs to happen BEFORE model discovery
if (provider === 'lmstudio') {
  // Force LM Studio client creation
  const localClient = await ClientFactory.createClient(this, currentModel, systemPrompt);
  this.geminiClient = localClient as unknown as GeminiClient;
  return;
}
```

## Environment Details
- LM Studio Models Available:
  - qwen3-4b-instruct-2507@q8_0 (main model)
  - qwen3-4b-instruct-2507@q4_k_m
  - openai/gpt-oss-20b
  - qwen/qwen3-30b-a3b-2507
  - Various embedding models

## Notes for Next Session
- The architecture assumes everything is a GeminiClient
- Need to either create proper interface abstraction or fix routing
- Health check was fixed but model list still filters out LM Studio
- Consider using environment variable LMSTUDIO_HOST for testing