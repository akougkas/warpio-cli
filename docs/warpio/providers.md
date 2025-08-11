# AI Provider Support

Warpio CLI is designed as an LLM-agnostic interface that can work with multiple AI providers. Currently, Gemini is fully supported with extensible architecture for future providers.

## Supported Providers

### Gemini (Production)

**Status**: ✅ Fully supported  
**Provider ID**: `gemini`

**Authentication**:

- Environment variable: `GEMINI_API_KEY`
- Get API key: [Google AI Studio](https://aistudio.google.com/app/apikey)

**Available Models**:

- `models/gemini-2.0-flash-exp` (alias: `pro`)
- `models/gemini-2.5-flash` (alias: `flash`)
- `models/gemini-2.5-flash-lite` (alias: `flash-lite`)
- `models/gemini-1.5-pro`
- `models/gemini-1.5-flash`
- And more...

**Usage Examples**:

```bash
# CLI
warpio --model flash
warpio --model gemini:pro
warpio --provider gemini --model flash

# Interactive
/model flash
/model gemini:pro
/model list
```

### OpenAI (Planned)

**Status**: 🚧 Coming soon  
**Provider ID**: `openai`

**Authentication**:

- Environment variable: `OPENAI_API_KEY`

**Planned Models**:

- `gpt-4-turbo` (alias: `gpt-4`)
- `gpt-3.5-turbo` (alias: `gpt-3.5`)
- `gpt-4o`
- And more...

**Planned Usage**:

```bash
# CLI
warpio --model openai:gpt-4
warpio --provider openai --model gpt-4

# Interactive
/model openai:gpt-4
/model gpt-4  # with provider set to openai
```

### Anthropic (Planned)

**Status**: 🚧 Coming soon
**Provider ID**: `anthropic`

**Authentication**:

- Environment variable: `ANTHROPIC_API_KEY`

**Planned Models**:

- `claude-3-5-sonnet` (alias: `claude`)
- `claude-3-haiku`
- `claude-3-opus`
- And more...

**Planned Usage**:

```bash
# CLI
warpio --model anthropic:claude
warpio --provider anthropic --model claude

# Interactive
/model anthropic:claude
/model claude  # with provider set to anthropic
```

### Local Providers (Planned)

#### Ollama

**Status**: 🚧 Coming soon
**Provider ID**: `ollama`

**Setup**: Local Ollama installation required
**Endpoint**: `http://localhost:11434` (default)

**Planned Usage**:

```bash
# CLI
warpio --model ollama:llama3
warpio --provider ollama --model llama3

# Interactive
/model ollama:llama3
/model llama3  # with provider set to ollama
```

#### LM Studio

**Status**: 🚧 Coming soon
**Provider ID**: `lmstudio`

**Setup**: Local LM Studio server required
**Endpoint**: `http://localhost:1234` (default)

**Planned Usage**:

```bash
# CLI
warpio --model lmstudio:mistral-7b
warpio --provider lmstudio --model mistral-7b

# Interactive
/model lmstudio:mistral-7b
/model mistral-7b  # with provider set to lmstudio
```

## Provider Configuration

### Environment Variables

Each provider uses its own API key:

```bash
# Current
export GEMINI_API_KEY="your-gemini-key"

# Future
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
```

### Settings File Configuration

Configure providers in your Warpio settings:

```json
{
  "provider": "gemini",
  "model": "flash",
  "providers": {
    "gemini": {
      "apiKey": "your-key",
      "defaultModel": "flash"
    },
    "openai": {
      "apiKey": "your-key",
      "defaultModel": "gpt-4"
    }
  }
}
```

### Proxy Support

All providers respect proxy settings:

```bash
export HTTP_PROXY="http://proxy.example.com:8080"
export HTTPS_PROXY="http://proxy.example.com:8080"
```

Or in settings:

```json
{
  "proxy": "http://proxy.example.com:8080"
}
```

## Model Selection Syntax

### Provider-Qualified Names

Use `provider:model` syntax to specify both provider and model:

```bash
warpio --model gemini:flash
warpio --model openai:gpt-4
warpio --model anthropic:claude
warpio --model ollama:llama3
```

### Provider-Specific Aliases

Each provider has its own set of aliases:

**Gemini**:

- `pro` → `models/gemini-2.0-flash-exp`
- `flash` → `models/gemini-2.5-flash`
- `flash-lite` → `models/gemini-2.5-flash-lite`

**OpenAI** (planned):

- `gpt-4` → `gpt-4-turbo`
- `gpt-3.5` → `gpt-3.5-turbo`

**Anthropic** (planned):

- `claude` → `claude-3-5-sonnet`
- `haiku` → `claude-3-haiku`
- `opus` → `claude-3-opus`

### Default Provider

When no provider is specified, Gemini is used as default:

```bash
warpio --model flash        # Uses gemini:flash
/model pro                  # Uses gemini:pro
```

Change the default provider:

```bash
warpio --provider openai --model gpt-4
# or
export DEFAULT_PROVIDER=openai
warpio --model gpt-4        # Uses openai:gpt-4
```

## Architecture

### Provider Adapters

Each provider implements the `ProviderAdapter` interface:

```typescript
interface ProviderAdapter {
  listModels(apiKey: string, proxy?: string): Promise<ModelInfo[]>;
  validateCredentials(apiKey: string, proxy?: string): Promise<boolean>;
}
```

### Model Discovery Service

The `ModelDiscoveryService` aggregates providers:

- Dynamically discovers available models
- Handles provider-specific authentication
- Provides unified model listing
- Supports proxy configuration

### Alias Resolution

Provider-specific aliases are resolved through the alias system:

```typescript
resolveModelAlias('flash', 'gemini'); // → models/gemini-2.5-flash
resolveModelAlias('gpt-4', 'openai'); // → gpt-4-turbo
resolveModelAlias('claude', 'anthropic'); // → claude-3-5-sonnet
```

## Migration from Gemini CLI

Warpio maintains full backward compatibility with Gemini CLI:

- All existing `GEMINI_*` environment variables continue to work
- Default provider is `gemini`
- Existing model names and settings are preserved
- No breaking changes to core functionality

**Gemini CLI compatibility**:

```bash
# These work exactly the same in Warpio
export GEMINI_API_KEY="your-key"
export GEMINI_MODEL="gemini-1.5-pro"
warpio --model "gemini-1.5-flash"
```

**New Warpio features**:

```bash
# These are Warpio-specific enhancements
warpio --model flash        # Aliases
warpio --model list         # Model listing
warpio --provider gemini    # Explicit provider
/model flash               # Interactive switching
```

## Troubleshooting

### Missing API Key

```
❌ No API key found for provider 'gemini'
   Set GEMINI_API_KEY environment variable
   Visit https://aistudio.google.com/app/apikey to get an API key
```

### Provider Not Found

```
❌ Unsupported provider: 'unknown-provider'
   Supported providers: gemini
   Future providers: openai, anthropic, ollama, lmstudio
```

### Model Not Available

```
❌ Model 'invalid-model' not found for provider 'gemini'
   Use '/model list' to see available models
   Check model name and try again
```

### Network Issues

```
❌ Failed to connect to provider 'gemini'
   Check your internet connection and proxy settings
   Verify API key is valid
```

## See Also

- [Model Selector Overview](./model-selector.md)
- [Interactive Model Command](./commands/model.md)
- [Warpio Migration Guide](./migration.md)
