# /model Command

The `/model` command provides interactive model management within Warpio CLI sessions.

## Usage

### Display Current Model

```
/model
```

Shows the currently active model and provider.

**Example output:**

```
📍 Current model: models/gemini-2.5-flash (gemini)
```

### List Available Models

```
/model list
```

Fetches and displays all available models from configured providers.

**Example output:**

```
🤖 Available AI Models

📡 GEMINI (15 models):
   • models/gemini-2.0-flash-exp (pro)
   • models/gemini-2.5-flash (flash)
   • models/gemini-2.5-flash-lite (flash-lite)
   • models/gemini-1.5-pro
   • models/gemini-1.5-flash
   ...

💡 Usage Examples:
   /model flash                  # Switch to flash model
   /model pro                    # Switch to pro model
   /model openai:gpt-4          # Switch provider and model
```

### Switch Models

```
/model <model_name>
/model <provider>:<model_name>
```

Switch to a different model immediately.

**Examples:**

```
/model flash                    # Use alias
/model pro                      # Use alias
/model models/gemini-1.5-pro    # Use full model name
/model gemini:flash             # Specify provider explicitly
```

**Success response:**

```
✅ Model updated to models/gemini-2.5-flash (gemini)

The new model will be used for subsequent conversations.
```

## Auto-completion

The `/model` command provides intelligent auto-completion:

- **Subcommands**: `list`
- **Model aliases**: `pro`, `flash`, `flash-lite`
- **Full model names**: Based on cached model list from last `/model list`
- **Provider syntax**: `openai:`, `anthropic:`, etc.

## Features

### Immediate Effect

Model changes take effect immediately:

- New conversations use the selected model
- Previous conversation history is preserved
- No restart required

### Fallback Reset

When switching models manually:

- Automatic fallback mode is disabled
- Prevents unexpected model switches due to rate limiting

### Validation

Basic model validation:

- Checks if model name/alias is recognized
- Provides helpful error messages for invalid input
- Does not make API calls for validation (to avoid unnecessary charges)

### Caching

Model information is cached after first `/model list`:

- Improves auto-completion performance
- Reduces API calls
- Cache persists for the session

## Error Handling

### Invalid Model Name

```
/model invalid-model
```

**Response:**

```
❌ Failed to switch model: Unknown model alias 'invalid-model'
Check the model name and try again.
```

### Missing API Key

```
/model list
```

**Response when no API key:**

```
❌ No API key found. Set GEMINI_API_KEY environment variable.
```

### Network Error

```
/model list
```

**Response on network failure:**

```
❌ Failed to fetch models: Connection timeout
Check your internet connection and API key
```

## Integration with CLI Arguments

The `/model` command works seamlessly with command-line model selection:

```bash
# Start with specific model
warpio --model pro

# Switch interactively
> /model flash

# Check current model
> /model
📍 Current model: models/gemini-2.5-flash (gemini)
```

## Provider Support

Currently supports:

- **Gemini**: Full API integration with model listing

Future provider support:

- **OpenAI**: `/model openai:gpt-4`
- **Anthropic**: `/model anthropic:claude`
- **Local**: `/model ollama:llama3`

## See Also

- [Model Selector Overview](../model-selector.md)
- [Provider Configuration](../providers.md)
- [Warpio Migration Guide](../migration.md)
