# Warpio Configuration System Cleanup - Architect Prompt

## Executive Summary

We need to completely redesign the Warpio configuration system to be a simple, ENV-only approach that works seamlessly with the upstream Gemini CLI. The current system is over-engineered, confusing, and breaks our core philosophy of being a thin extension layer.

## Current Configuration Mess (What We Need to Remove)

### 1. Multiple Configuration Sources (TOO COMPLEX)

- `warpio.json` files (project and home directory)
- `WarpioConfigLoader` class with complex parsing logic
- `WarpioConfigValidator` class with validation rules
- `WarpioProviderRegistry` with dynamic provider creation
- ~~Persona system with provider preferences~~ (Already decoupled! Keep personas)
- Multiple environment variable sets
- Temporary hacks like `WARPIO_CLI_PROVIDER` and `WARPIO_CLI_MODEL`

### 2. Configuration Priority Chaos

Current priority order is confusing:

1. CLI arguments override everything
2. Environment variables sometimes override
3. Configuration files sometimes override
4. Personas have their own preferences
5. Hardcoded fallbacks kick in randomly

### 3. Files That Need Deletion/Simplification

- `/packages/core/src/warpio/config/loader.ts` - DELETE
- `/packages/core/src/warpio/config/validator.ts` - DELETE
- `/packages/core/src/warpio/provider-registry.ts` - SIMPLIFY
- `/packages/core/src/warpio/provider-integration.ts` - SIMPLIFY
- `/warpio.json` - DELETE (user-created test file)
- ~~All persona-related configuration code~~ - KEEP INTACT (already decoupled)

## The Simple Vision (What We Want)

### 1. ENV-Only Configuration

```bash
# =================================================================
# WARPIO CLI - Environment Configuration Example
# =================================================================
# Copy this file to .env and update the values according to your setup

# -----------------------------------------------------------------
# AI PROVIDER API KEYS
# -----------------------------------------------------------------

# Gemini API Key (Required for Gemini models)
# Get your key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Key (Optional - for future integration)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (Optional - for future integration)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# -----------------------------------------------------------------
# WARPIO PROVIDER SELECTION
# -----------------------------------------------------------------
# Default provider for Warpio CLI (gemini, lmstudio, ollama, openai)
WARPIO_PROVIDER=lmstudio
# -----------------------------------------------------------------
# LOCAL MODEL PROVIDERS
# -----------------------------------------------------------------

# Ollama Configuration
# Default: http://localhost:11434
OLLAMA_HOST=http://localhost:11434
OLLAMA_API_KEY=ollama
OLLAMA_MODEL=hopephoto/Qwen3-4B-Instruct-2507_q8:latest

# LM Studio Configuration
# Update with your server IP/port
LMSTUDIO_HOST=http://192.168.86.20:1234/v1
LMSTUDIO_API_KEY=lm-studio
LMSTUDIO_MODEL=qwen3-4b-instruct-2507
```

### 2. Behavior

- `npx warpio` - Uses whatever WARPIO_PROVIDER is set to (or Gemini if not set)
- `npx warpio -p "hi"` - Same, just uses the configured provider
- That's it. No complex model selection, no JSON files, no validation layers

### 3. How It Works With Gemini CLI Core

- Gemini CLI expects a `model` in its Config
- When WARPIO_PROVIDER is set, we intercept at ContentGenerator level
- We return our AISDKProviderManager instead of GeminiClient
- The core CLI doesn't know or care - it just works

## Technical Requirements

### 1. Simplified Provider Selection

```typescript
// In contentGenerator.ts - the ONLY integration point
export async function createContentGenerator(...) {
  // Check if Warpio provider is configured
  const warpioProvider = process.env.WARPIO_PROVIDER;

  if (warpioProvider && warpioProvider !== 'gemini') {
    // Create our provider
    return createWarpioProvider(warpioProvider);
  }

  // Otherwise use default Gemini flow
  return createGeminiClient(...);
}

// Simple provider creation - no complex registries
function createWarpioProvider(provider: string) {
  switch(provider) {
    case 'lmstudio':
      return new AISDKProviderManager({
        provider: 'lmstudio',
        host: process.env.LMSTUDIO_HOST,
        model: process.env.LMSTUDIO_MODEL || 'default',
        apiKey: process.env.LMSTUDIO_API_KEY
      });
    case 'ollama':
      return new AISDKProviderManager({
        provider: 'ollama',
        host: process.env.OLLAMA_HOST,
        model: process.env.OLLAMA_MODEL || 'default',
        apiKey: process.env.OLLAMA_API_KEY
      });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 2. Remove All Complex Configuration

- NO configuration files (no JSON, YAML, TOML)
- NO complex validation (if env vars are wrong, let it fail with clear error)
- NO provider registries
- NO dynamic model discovery
- NO configuration priority hierarchies

### 3. Maintain Upstream Compatibility

- Don't change ANYTHING in Gemini CLI core AND ensure prior session did not either
- Config.getModel() continues to work (returns placeholder for non-Gemini)
- All hardcoded DEFAULT_GEMINI_FLASH_MODEL references stay as-is consistent with upstream not current repo
- ContentGenerator interface remains unchanged (even though we have messed it up currently)

### 4. CLI Simplification

- Remove `--validate-config` command
- **KEEP all persona commands**: `--persona`, `--list-personas`, `--persona-help`
- **KEEP MCP auto-configuration**: Personas should still configure their MCPs

## Implementation Plan

### Phase 1: Clean Up Configuration

1. Delete all configuration-related files in `/packages/core/src/warpio/config/`
2. Simplify `provider-integration.ts` to just read ENV vars
3. Remove all WarpioConfigLoader and WarpioConfigValidator usage
4. Delete warpio.json test file

### Phase 2: Simplify Provider Creation

1. Replace complex provider registry with simple switch statement
2. AISDKProviderManager just takes ENV values directly
3. Remove all "fallback" and "preference" logic

### Phase 3: Fix Integration Point

1. Update `createContentGenerator` to check WARPIO_PROVIDER env var
2. Return appropriate provider based on simple ENV check
3. Ensure Config.getModel() returns something safe for Gemini core

### Phase 4: Test Everything

1. Test with `WARPIO_PROVIDER=gemini` (or unset)
2. Test with `WARPIO_PROVIDER=lmstudio`
3. Ensure all work exactly the same way

## Success Criteria

1. **Simplicity**: Configuration is just ENV vars, nothing else
2. **Compatibility**: Upstream Gemini CLI works unchanged
3. **Reliability**: No mysterious fallbacks or overrides
4. **Clarity**: User knows exactly what provider is being used
5. **Maintainability**: Minimal code, easy to understand

## Anti-Patterns to Avoid

- ❌ Configuration files of any kind
- ❌ Complex validation logic
- ❌ Provider registries or factories
- ❌ Multiple override mechanisms
- ❌ Trying to be "smart" about defaults
- ❌ Over-engineering for future features

## Key Philosophy

**Warpio is a THIN extension layer that pivots model selection, NOT a configuration framework.**

When in doubt:

1. Keep it simple
2. Use ENV vars
3. Fail fast with clear errors
4. Don't try to be clever
5. Work WITH Gemini CLI, not against it

## Example User Experience

```bash
# User installs Warpio
npm install -g @iowarp/warpio-cli

# User sets up .env
echo "WARPIO_PROVIDER=lmstudio" >> .env
echo "LMSTUDIO_HOST=http://localhost:1234/v1" >> .env
echo "LMSTUDIO_MODEL=gpt-oss-20b" >> .env

# User runs Warpio
npx warpio -p "Hello"
# It just works with LMStudio

# User wants Gemini instead
echo "WARPIO_PROVIDER=gemini" >> .env
npx warpio -p "Hello"
# It just works with Gemini

# That's it. No JSON files, no complex commands, no validation steps.
```

## Notes for Implementation

1. Start by documenting what to DELETE (most of the current system)
2. Keep the Vercel AI SDK integration (AISDKProviderManager) - that's good
3. Simplify how we CREATE the provider (just read ENV)
4. Ensure we fail fast with clear errors (no silent fallbacks)
5. Test thoroughly that both Gemini and local providers work identically

## Persona System Integration (CRITICAL UPDATE)

### Good News

The persona system is **already decoupled** from the configuration mess:

- Current personas have `providerPreferences: undefined`
- No hardcoded model overrides
- Clean separation from provider configuration

### What to Preserve

1. **WarpioPersonaManager** - The singleton that manages personas
2. **Persona definitions** in `/packages/core/src/warpio/personas/`
3. **System prompt enhancement** - Personas modify the AI's behavior
4. **Tool filtering** - Personas can whitelist specific tools
5. **MCP auto-configuration** - Personas should configure their specialized MCPs
6. **CLI commands** - All `--persona` related commands

### How Personas Work with ENV-Only Config

```typescript
// User's .env sets the provider
WARPIO_PROVIDER=lmstudio
LMSTUDIO_MODEL=gpt-oss-20b

// Defautl persona is more like a chatbot and doesn't know how to handle it
npx warpio -p "Convert this complex scientific data"

// Different provider same result since no expert is used.
WARPIO_PROVIDER=gemini
npx warpio -p "Convert this complex scientific data"

// Persona enhances behavior WITHOUT changing provider
npx warpio --persona data-expert -p "Convert this data"
// Uses Persona specific provider and model with data-expert's system prompt and tools

// Same persona, different provider
WARPIO_PROVIDER=gemini
npx warpio --persona data-expert -p "Convert this data"
// Still uses Persona specific provider and model with data-expert's system prompt and tools
```

### Implementation Note

- Personas modify BEHAVIOR AND CUSTOM MODELS (system prompts, tools, fine-tuned models)
- ENV vars control PROVIDER and MODELS (which AI to use overall as WarpIO CLI)
- These are orthogonal concerns - perfect separation

### Missing Personas to Implement Later

- `data-expert` - Scientific data I/O
- `analysis-expert` - Data analysis & visualization
- `hpc-expert` - HPC optimization
- `research-expert` - Research & documentation
- `workflow-expert` - Workflow orchestration

## Final Thought

The Gemini CLI already has everything we need - we just need to pivot the model selection based on WARPIO_PROVIDER. Nothing more, nothing less.

**The persona system is a killer feature that's already properly architected** - it enhances AI behavior without interfering with provider selection. This is exactly the kind of thin, valuable extension we want.

Remember: Every line of code we write is a line that can break. Keep it minimal.
