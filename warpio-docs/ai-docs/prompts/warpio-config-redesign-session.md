# Warpio Configuration Architecture Redesign - Production Ready

You are Claude Code working on the Warpio CLI project. I need you to completely redesign and clean up the entire configuration system to be production-ready with zero hardcoded defaults.

## **Current Problem**
The Warpio configuration system is a complete mess:
- Hardcoded provider preferences in personas 
- Confusing WARPIO_PROVIDER exports and overrides
- Complex persona system interfering with simple provider selection
- No single source of truth for configuration
- Fallbacks to Gemini when they shouldn't happen
- Environment variables being overridden by code

## **Ultra-Thinking: Best Configuration Approach**

**Multi-Format Configuration Priority (Environment-First)**
1. **Environment Variables** (Docker/K8s production-ready)
2. **Optional Config Files** (for complex local setups)
   - `warpio.toml` (recommended - reliable, comments)
   - `warpio.json` (fallback - schema validation)
   - `warpio.yaml` (legacy - if users prefer)
3. **CLI Arguments** (overrides for specific commands)

## **Requirements for New System**

### **1. Clean CLI Interface with Double Colon (::) Separator**
```bash
# Use environment/config defaults
npx warpio -p "hello"

# Override with specific model (:: separator to handle complex model names)
npx warpio --model lmstudio::qwen3-4b-instruct-2507 -p "hello"
npx warpio --model ollama::registry.ollama.ai/library/qwen2.5:7b -p "hello"
npx warpio --model gemini::gemini-2.0-flash -p "hello"
npx warpio --model huggingface::microsoft/DialoGPT-medium:1.0 -p "hello"

# Discovery and validation
npx warpio --list-models
npx warpio --validate-config
npx warpio --model lmstudio::qwen3-4b-instruct-2507 --test-connection
```

### **2. Environment Variables (Primary Configuration)**
```bash
# Production-ready environment configuration
export WARPIO_DEFAULT_PROVIDER=lmstudio
export WARPIO_DEFAULT_MODEL=qwen3-4b-instruct-2507

# LM Studio Configuration
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
export LMSTUDIO_API_KEY=lm-studio
export LMSTUDIO_MODELS=qwen3-4b-instruct-2507,gpt-oss-20b

# Gemini Configuration
export GEMINI_API_KEY=your_key_here
export GEMINI_MODELS=gemini-2.0-flash,gemini-pro

# Ollama Configuration  
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODELS=qwen2.5:7b,llama2:13b
```

### **3. Optional Configuration File (warpio.toml)**
```toml
# warpio.toml - Optional advanced configuration
[warpio]
default_provider = "lmstudio"
default_model = "qwen3-4b-instruct-2507"

[providers.lmstudio]
host = "http://192.168.86.20:1234/v1" 
api_key = "lm-studio"
timeout = 30

  [[providers.lmstudio.models]]
  name = "qwen3-4b-instruct-2507"
  temperature = 0.7
  stop_tokens = ["<|im_end|>", "<|endoftext|>"]
  max_tokens = 4096
  
  [[providers.lmstudio.models]]
  name = "gpt-oss-20b"
  temperature = 1.0
  stop_tokens = ["<|endoftext|>", "<|return|>"]
  format = "harmony"

[providers.gemini]
api_key_env = "GEMINI_API_KEY"
timeout = 45

  [[providers.gemini.models]]
  name = "gemini-2.0-flash"
  temperature = 0.9

[providers.ollama]
host = "http://localhost:11434"

  [[providers.ollama.models]]
  name = "qwen2.5:7b"
  temperature = 0.8
```

### **4. Zero Hardcoded Defaults Policy**
- ❌ NO fallbacks to Gemini if not configured
- ❌ NO hardcoded provider preferences in personas
- ❌ NO silent fallbacks - fail fast with clear errors
- ✅ If no configuration found → error with setup guide
- ✅ If provider unavailable → error with troubleshooting steps
- ✅ Environment variables supplement config files, never override user intent

### **5. Architecture Requirements**
- Keep all Warpio code in `/packages/core/src/warpio/`
- Minimal modifications to Gemini CLI core (only the ContentGenerator hook)
- Clean model discovery and provider registry from configuration
- Proper error handling with actionable error messages
- Configuration validation with detailed feedback

### **6. Production Standards**
- Input validation for all configuration values
- Schema validation for config files
- Connection testing for all configured providers
- Clear error messages with troubleshooting guidance
- Timeout handling and retry logic
- Logging configuration for debugging
- No silent failures or mysterious behaviors

## **Implementation Tasks**

1. **Create multi-format configuration loader system**
   - Environment variable parser
   - TOML/JSON/YAML config file loaders
   - Priority resolution (env → config → defaults)

2. **Redesign provider registry with dynamic model discovery**
   - Load providers from configuration
   - Dynamic model registration based on config
   - Connection validation and health checks

3. **Implement clean CLI argument parsing**
   - Support `--model provider::model` with double colon
   - Add `--list-models`, `--validate-config`, `--test-connection`
   - Override system for environment/config values

4. **Remove all hardcoded defaults and fallbacks**
   - Audit all hardcoded configurations
   - Replace with configuration-driven setup
   - Add proper error handling for missing config

5. **Add comprehensive validation and testing commands**
   - Configuration file validation
   - Provider connection testing
   - Model availability checking
   - Health check endpoints

6. **Clean up persona system**
   - Remove provider preferences from personas
   - Focus personas on system prompts and tool configurations only
   - Decouple from provider selection entirely

7. **Production testing with real providers**
   - Test LM Studio connection and inference
   - Test Ollama connection and model loading
   - Test Gemini API integration
   - Validate error handling for all failure modes

## **Success Criteria**
- Configuration is completely declarative (no hardcoded defaults)
- `--model provider::model` syntax works flawlessly with complex model names
- Clear, actionable error messages for all configuration issues
- Easy for users to add new models and providers via config
- Production-ready: works in Docker, Kubernetes, CI/CD environments
- Fast startup time with proper configuration caching
- Comprehensive testing and validation tooling

## **Current State Context**
- Working Vercel AI SDK integration in `/packages/core/src/providers/`
- LM Studio model configurations partially implemented
- Main issue: messy configuration priority and hardcoded fallbacks
- Environment: Already has .env file with WARPIO_PROVIDER=lmstudio

## **Ultimate Goal**
Create a bulletproof, professional configuration system that makes Warpio trivial to deploy in production environments while giving users complete control over their model and provider setup.

**Key Insight**: Configuration should be explicit, discoverable, and fail-fast. No magic, no surprises, no silent fallbacks.