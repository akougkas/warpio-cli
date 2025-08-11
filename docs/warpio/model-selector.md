# Model Selector

Warpio CLI provides flexible model selection capabilities that work with multiple AI providers. You can list available models, switch between models interactively, and use convenient aliases for quick access.

## Command Line Usage

### List Available Models

```bash
warpio --model list
```

This command fetches and displays all available models from configured providers, grouped by provider with their aliases.

Example output:

```
🤖 Available AI Models

🖥️  OLLAMA (3 local models):
   • hopephoto/Qwen3-4B-Instruct-2507_q8:latest (aliases: small)
     Size: 4.5GB | Updated: 2025-01-10
   • gpt-oss:20b (aliases: medium)
     Size: 12GB | Family: GPT
   • qwen3-coder:latest (aliases: large)
     Family: Qwen | Size: 18GB

☁️  GEMINI (3 cloud models):
   • gemini-2.5-pro (aliases: pro)
   • gemini-2.5-flash (aliases: flash)
   • gemini-2.5-flash-lite (aliases: flash-lite)
   • models/gemini-1.5-pro
   ...

💡 Usage Examples:
   warpio --model small          # Use small local model (Ollama)
   warpio --model ollama:llama3  # Specific Ollama model
   warpio --model flash          # Gemini flash model
   warpio --model pro            # Gemini pro model
   /model small                  # Switch to local model interactively
   /model list                   # List all models
```

### Using Model Aliases

Warpio supports convenient aliases for commonly used models:

```bash
# Local model aliases
warpio --model small            # Uses Ollama Qwen3-4B or LM Studio gpt-oss
warpio --model medium           # Uses Ollama gpt-oss:20b or LM Studio gpt-oss
warpio --model large            # Uses Ollama qwen3-coder or LM Studio gpt-oss

# Gemini aliases
warpio --model pro              # Uses models/gemini-2.0-flash-exp
warpio --model flash            # Uses models/gemini-2.5-flash
warpio --model flash-lite       # Uses models/gemini-2.5-flash-lite

# Full model names with provider
warpio --model "ollama:hopephoto/Qwen3-4B-Instruct-2507_q8:latest"
warpio --model "lmstudio:gpt-oss"
warpio --model "models/gemini-1.5-pro"
```

### Combining with Prompts

Use model selection with immediate prompts:

```bash
# Long form
warpio --model flash --prompt "Explain quantum computing"
warpio --model pro --prompt "Complex analysis task here"

# Short form (recommended)
warpio -m flash -p "Explain quantum computing" 
warpio -m pro -p "Complex analysis task here"

# With personas and models
warpio --persona hpc-expert -m flash -p "Optimize this MPI code"
```

### Provider Selection

Specify AI provider explicitly:

```bash
# Set provider with --provider flag
warpio --provider gemini --model flash
warpio --provider ollama --model llama3

# Or use provider:model syntax (recommended)
warpio --model gemini:flash
warpio --model ollama:llama3      # Local Ollama model
warpio --model openai:gpt-4       # When OpenAI support is added
```

## Interactive Model Management

### List Models Interactively

While in a Warpio session, use the `/model` command to manage models:

```
/model list
```

This displays the same model information as `--model list` but within the interactive interface.

### Switch Models

Change the active model during your session:

```
/model small           # Switch to small local model using alias
/model ollama:llama3   # Switch to specific Ollama model
/model flash           # Switch to Gemini flash model using alias
/model pro             # Switch to Gemini pro model using alias
/model gemini:flash    # Explicitly specify provider
```

When you switch models:

- The change takes effect immediately for new conversations
- Previous conversation history is preserved
- Fallback mode is automatically reset
- You'll see a confirmation message

### Model Status

Check current model without switching:

```
/model
```

Shows current model and provider information.

## Configuration

### Environment Variables

Set your preferred model via environment variables:

```bash
# Gemini models
export GEMINI_MODEL=flash           # Use alias
export GEMINI_MODEL=models/gemini-2.5-flash  # Use full name

# Local provider endpoints (optional)
export OLLAMA_HOST=http://localhost:11434
export LMSTUDIO_HOST=http://localhost:1234
export LMSTUDIO_API_KEY=lm-studio
```

### Settings Files

Add model preferences to your Warpio settings:

```json
{
  "model": "small",
  "provider": "ollama",
  "providers": {
    "ollama": {
      "host": "http://localhost:11434",
      "aliases": {
        "small": "hopephoto/Qwen3-4B-Instruct-2507_q8:latest",
        "medium": "gpt-oss:20b",
        "large": "qwen3-coder:latest"
      }
    },
    "lmstudio": {
      "host": "http://localhost:1234",
      "apiKey": "lm-studio"
    }
  }
}
```

### Priority Order

Model selection follows this priority:

1. Command line `--model` argument
2. Settings file `model` field
3. `GEMINI_MODEL` environment variable (Gemini only)
4. Default model (`gemini-2.5-flash` or first available local model)

Provider selection follows this priority:

1. Provider prefix in model name (`provider:model`)
2. Command line `--provider` argument
3. Settings file `provider` field
4. **Automatic fallback**: Ollama → LM Studio → Gemini → Error

## Current Model Aliases

### Local Providers

#### Ollama Provider

| Alias    | Full Model Name                            | Size |
| -------- | ------------------------------------------ | ---- |
| `small`  | `hopephoto/Qwen3-4B-Instruct-2507_q8:latest` | 4.5GB |
| `medium` | `gpt-oss:20b`                              | 12GB |
| `large`  | `qwen3-coder:latest`                       | 18GB |

### Cloud Providers

#### Gemini Provider

| Alias        | Full Model Name                |
| ------------ | ------------------------------ |
| `pro`        | `gemini-2.5-pro`              |
| `flash`      | `gemini-2.5-flash`            |
| `flash-lite` | `gemini-2.5-flash-lite`       |

## Error Handling

### No Providers Available

If no AI providers are available:

```
❌ No AI providers available

To get started:
• Ollama: `ollama serve` then `ollama pull llama3`
• LM Studio: Open app, load model, start server
• Gemini: Set `GEMINI_API_KEY` environment variable

💡 Local providers (Ollama, LM Studio) don't require API keys
   For Gemini API key: Visit https://aistudio.google.com/app/apikey
```

### Provider Not Running

If a specific provider isn't available:

```
⚠️ ollama is not available: Server not running
   Start Ollama with: ollama serve
✓ Using lmstudio as fallback
```

### Invalid Model

If an invalid model is specified:

```
❌ Failed to switch model: Model not found
   Check the model name and try again.
```

### Network Issues

If model listing fails due to network problems:

```
❌ Failed to fetch models: Network timeout
   Check your internet connection and API key
```

## Supported Providers

Warpio supports multiple AI providers with automatic fallback:

### ✅ Currently Supported

- **🖥️ Ollama**: Local models via Ollama server (port 11434)
- **☁️ Gemini**: Google's Gemini 2.5 models via API

### 🔮 Planned Support

- **OpenAI**: GPT-4, GPT-3.5, etc.
- **Anthropic**: Claude models
- **Custom**: Support for custom API endpoints

### Provider Benefits

| Provider   | Privacy | Cost    | Offline | Setup Effort |
| ---------- | ------- | ------- | ------- | ------------ |
| Ollama     | 🔒 Full | 💰 Free | ✅ Yes  | ⭐ Easy      |
| Gemini     | ⚠️ API  | 💳 Paid | ❌ No   | ⭐⭐ Moderate |

See [Local Models Guide](./local-models.md) for detailed setup instructions.
