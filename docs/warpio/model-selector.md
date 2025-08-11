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

📡 GEMINI (15 models):
   • models/gemini-2.0-flash-exp (aliases: pro)
   • models/gemini-2.5-flash (aliases: flash)
   • models/gemini-2.5-flash-lite (aliases: flash-lite)
   • models/gemini-1.5-pro
   • models/gemini-1.5-flash
   ...

💡 Usage Examples:
   warpio --model flash          # Use alias for quick access
   warpio --model pro            # Use pro model
   /model flash                  # Switch model in interactive mode
   /model list                   # List models interactively
```

### Using Model Aliases

Warpio supports convenient aliases for commonly used models:

```bash
# Use aliases instead of full model names
warpio --model pro              # Uses models/gemini-2.0-flash-exp
warpio --model flash            # Uses models/gemini-2.5-flash
warpio --model flash-lite       # Uses models/gemini-2.5-flash-lite

# Or use full model names
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

# Or use provider:model syntax
warpio --model gemini:flash
warpio --model openai:gpt-4     # When OpenAI support is added
warpio --model anthropic:claude # When Anthropic support is added
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
/model flash           # Switch to flash model using alias
/model pro             # Switch to pro model using alias
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
export GEMINI_MODEL=flash           # Use alias
export GEMINI_MODEL=models/gemini-2.5-flash  # Use full name
```

### Settings Files

Add model preferences to your Warpio settings:

```json
{
  "model": "flash",
  "provider": "gemini"
}
```

### Priority Order

Model selection follows this priority:

1. Command line `--model` argument
2. Settings file `model` field
3. `GEMINI_MODEL` environment variable
4. Default model (`gemini-2.5-flash`)

Provider selection follows this priority:

1. Provider prefix in model name (`provider:model`)
2. Command line `--provider` argument
3. Settings file `provider` field
4. Default provider (`gemini`)

## Current Model Aliases

### Gemini Provider

| Alias        | Full Model Name                |
| ------------ | ------------------------------ |
| `pro`        | `models/gemini-2.0-flash-exp`  |
| `flash`      | `models/gemini-2.5-flash`      |
| `flash-lite` | `models/gemini-2.5-flash-lite` |

## Error Handling

### Missing API Key

If no API key is found:

```
❌ No API key found
   Set GEMINI_API_KEY environment variable or configure it in settings
   For Gemini: Visit https://aistudio.google.com/app/apikey
   For OpenAI: Visit https://platform.openai.com/api-keys
   For Anthropic: Visit https://console.anthropic.com/account/keys

💡 Note: Model listing uses API key authentication for maximum provider compatibility
   For Gemini's free tier Gmail auth, use the standard Warpio workflow without --model flags
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

## Future Providers

Warpio is designed to support multiple AI providers. Future versions will include:

- **OpenAI**: GPT-4, GPT-3.5, etc.
- **Anthropic**: Claude models
- **Local**: Ollama, LM Studio integration
- **Custom**: Support for custom API endpoints

The same interface will work across all providers using the `provider:model` syntax.
