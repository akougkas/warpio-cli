# 🔌 Warpio Provider Management Guide

Quick guide for implementing and managing AI providers in Warpio CLI.

## 📚 How Provider Management Works

### The ModelManager System

Warpio uses a centralized `ModelManager` class for provider discovery, validation, and switching:

```typescript
// All provider logic isolated in /packages/core/src/warpio/
packages / core / src / warpio / model - manager.ts; // Core management system
packages / core / src / warpio / provider - registry.ts; // Simple ENV-only providers
packages / cli / src / ui / commands / modelCommand.ts; // Interactive slash commands
```

### Provider Selection Methods

1. **CLI Arguments**: `npx warpio -m provider::model -p "hello"`
2. **Environment Variables**: `WARPIO_PROVIDER=lmstudio`
3. **Slash Commands**: `/model set provider::model`

## 🚀 Adding a New Provider

### 1. Add Provider to Registry

```typescript
// packages/core/src/warpio/provider-registry.ts
export function createWarpioProvider(provider: string): any {
  switch (provider) {
    case 'yourprovider':
      const host = process.env.YOURPROVIDER_HOST || 'http://localhost:8080';
      const model = process.env.YOURPROVIDER_MODEL || 'default';
      const apiKey = process.env.YOURPROVIDER_API_KEY || 'key';

      const yourProvider = createOpenAICompatible({
        name: 'yourprovider',
        baseURL: host,
        apiKey: apiKey,
      });

      const models: Record<string, any> = {};
      models[model] = yourProvider(model);

      return createProviderRegistry(
        {
          yourprovider: customProvider({
            languageModels: models,
          }),
        },
        { separator: ':' },
      );

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 2. Add Model Discovery

```typescript
// packages/core/src/warpio/model-manager.ts
private async discoverYourProviderModels(): Promise<ModelInfo[]> {
  const host = process.env.YOURPROVIDER_HOST;
  if (!host) throw new Error('YOURPROVIDER_HOST not configured');

  try {
    const response = await fetch(`${host}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${process.env.YOURPROVIDER_API_KEY}`,
      }
    });

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.id,
      provider: 'yourprovider',
      contextLength: model.context_length,
      supportsTools: true,
      description: `Your provider model: ${model.id}`
    }));
  } catch (error) {
    // Fallback to configured model
    const configuredModel = process.env.YOURPROVIDER_MODEL || 'default';
    return [{
      id: configuredModel,
      name: configuredModel,
      provider: 'yourprovider',
      supportsTools: true,
      description: 'Currently configured model'
    }];
  }
}
```

### 3. Add Provider Info Method

```typescript
private async getYourProviderInfo(): Promise<ProviderInfo> {
  const hasHost = !!process.env.YOURPROVIDER_HOST;

  if (!hasHost) {
    return {
      name: 'yourprovider',
      status: 'unconfigured',
      error: 'YOURPROVIDER_HOST not configured',
      defaultModel: 'default',
      models: []
    };
  }

  try {
    const models = await this.discoverYourProviderModels();
    return {
      name: 'yourprovider',
      status: 'available',
      defaultModel: process.env.YOURPROVIDER_MODEL || models[0]?.id || 'default',
      models
    };
  } catch (error) {
    return {
      name: 'yourprovider',
      status: 'error',
      error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      defaultModel: 'default',
      models: []
    };
  }
}
```

### 4. Update Validation

```typescript
// Add to validateProvider method
public validateProvider(provider: string): boolean {
  const supportedProviders = ['gemini', 'lmstudio', 'ollama', 'openai', 'yourprovider'];
  return supportedProviders.includes(provider);
}

// Add to setupProviderEnvironment method
case 'yourprovider':
  envSetup.YOURPROVIDER_MODEL = model;
  break;
```

### 5. Add to getProviders Method

```typescript
public async getProviders(): Promise<ProviderInfo[]> {
  const providers: ProviderInfo[] = [];

  // ... existing providers

  // Your provider
  const yourProviderInfo = await this.getYourProviderInfo();
  providers.push(yourProviderInfo);

  return providers;
}
```

## ⚙️ Configuration Pattern

### Environment Variables

```bash
# Add to .env.example
# =============================================================================
# YOUR PROVIDER (Custom AI)
# =============================================================================
# Configure your custom AI provider

# WARPIO_PROVIDER=yourprovider
# YOURPROVIDER_HOST=http://localhost:8080/v1
# YOURPROVIDER_MODEL=your-model-name
# YOURPROVIDER_API_KEY=your-api-key

# Available Models:
# - your-model-name (description)
# - another-model (description)
```

### User Testing Commands

```bash
# Test provider connection
npx warpio /model test

# List available models
npx warpio /model list

# Use your provider
npx warpio -m yourprovider::your-model -p "hello"

# Switch interactively
npx warpio
> /model set yourprovider::your-model
```

## 🛡️ Current Supported Providers

### Gemini (Default)

```bash
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.5-flash
```

### LM Studio (Local)

```bash
WARPIO_PROVIDER=lmstudio
LMSTUDIO_HOST=http://localhost:1234/v1
LMSTUDIO_MODEL=qwen3-4b-instruct-2507
LMSTUDIO_API_KEY=lm-studio
```

### Ollama (Local)

```bash
WARPIO_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_API_KEY=ollama
```

### OpenAI (Cloud)

```bash
WARPIO_PROVIDER=openai
OPENAI_API_KEY=sk-your_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

## 🧪 Testing Your Provider

### Basic Testing

```bash
# 1. Build
npm run build

# 2. Configure
export WARPIO_PROVIDER=yourprovider
export YOURPROVIDER_HOST=http://localhost:8080

# 3. Test
npx warpio -p "hello"
npx warpio /model test
npx warpio /model list
```

### Validation Tests

```bash
# Test provider::model syntax
npx warpio -m yourprovider::model-name -p "test"

# Test invalid formats (should show helpful errors)
npx warpio -m invalidprovider::model -p "test"
npx warpio -m yourprovider -p "test"  # Missing :: syntax
```

## 📦 Integration Points

### ModelManager Exports

```typescript
// Already exported in packages/core/src/index.ts
export { ModelManager } from './warpio/model-manager.js';
export type {
  ModelInfo,
  ProviderInfo,
  ModelSelectionResult,
  ValidationResult,
} from './warpio/model-manager.js';
```

### CLI Integration

```typescript
// packages/cli/src/config/config.ts - automatic validation hook
try {
  const { ModelManager } = require('@google/gemini-cli-core');
  const modelManager = ModelManager.getInstance();
  const parsed = modelManager.parseModelSelection(cliModel);
  // Validation and environment setup happens here
} catch (error) {
  // Graceful fallback if Warpio unavailable
}
```

## 🎯 Architecture Rules

### Do Change

- Add providers to `provider-registry.ts`
- Add discovery methods to `model-manager.ts`
- Update validation lists
- Add environment variable patterns

### Don't Change

- Core CLI parsing logic (minimal integration only)
- Existing provider implementations
- TypeScript exports in core index
- Error handling patterns

## 💡 Provider Examples

### OpenAI-Compatible (Most Common)

```typescript
const provider = createOpenAICompatible({
  name: 'yourprovider',
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'your-key',
});
```

### Custom Protocol

```typescript
// For non-OpenAI-compatible endpoints
// Implement full provider interface in provider-registry.ts
// See existing Gemini implementation as reference
```

## ⚡ Performance Tips

- **Model Discovery**: Cached for 5 minutes, use `ModelManager.getInstance()`
- **Connection Testing**: Parallel execution across providers
- **Environment Setup**: Happens at CLI parse time, not runtime
- **Error Handling**: Always provide fallback models

## 🚦 Common Patterns

### Provider Health Check

```typescript
const providers = await modelManager.getProviders();
const healthy = providers.filter((p) => p.status === 'available');
```

### Model Switching

```typescript
const result = modelManager.switchToModel('yourprovider::model-name');
if (result.success) {
  console.log('✅ Switched successfully');
  // Environment variables are now set
}
```

### Discovery Refresh

```typescript
modelManager.clearCache();
await modelManager.listAllModels(); // Fresh discovery
```

Ready to add your provider? Start with the registry and work through the discovery methods! 🚀
