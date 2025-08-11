# Local AI Models in Warpio CLI

Warpio CLI supports running AI models locally through Ollama and LM Studio, providing privacy, cost savings, and offline capabilities.

## Quick Start

### Ollama

1. **Install Ollama**: https://ollama.ai
2. **Start server**: `ollama serve`
3. **Pull a model**: `ollama pull llama3`
4. **Use in Warpio**: `warpio --model small -p "Your query"` or `warpio -m ollama:llama3 -p "Your query"`

### LM Studio (Temporarily Disabled)

LM Studio support is currently disabled while we work on fixing compatibility issues. It will be re-enabled in a future update.

## Model Selection

### Direct Model Names

```bash
# Ollama models
warpio -m ollama:llama3:8b
warpio -m ollama:mistral:latest
warpio -m ollama:codellama:13b

# LM Studio models (temporarily disabled)
# warpio -m lmstudio:gpt-oss
# warpio -m lmstudio:mistral-7b-instruct
```

### Using Aliases

```bash
# Smart alias resolution - automatically detects provider
warpio --model small   # Ollama: hopephoto/Qwen3-4B-Instruct-2507_q8:latest
warpio --model medium  # Ollama: gpt-oss:20b  
warpio --model large   # Ollama: qwen3-coder:latest
warpio --model flash   # Gemini: models/gemini-2.5-flash
warpio --model pro     # Gemini: models/gemini-2.5-pro

# Explicit provider syntax (optional but clearer)
warpio -m ollama:small
warpio -m ollama:medium  
warpio -m ollama:large
warpio -m gemini:flash
warpio -m gemini:pro

# LM Studio aliases (temporarily disabled)
# warpio -m lmstudio:small
# warpio -m lmstudio:medium
# warpio -m lmstudio:large
```

### List Available Models

```bash
# List all available models across providers
warpio --model list

# Output example:
OLLAMA Models:
  - llama3:8b (aliases: medium)
  - mistral:7b (aliases: mistral, medium)
  - qwen3-coder:latest (aliases: large)

# LMSTUDIO Models: (temporarily disabled)
  # - gpt-oss (aliases: small, medium, large)
```

## Configuration

### Environment Variables

```bash
# Custom Ollama endpoint
export OLLAMA_HOST=http://192.168.1.100:11434

# LM Studio endpoint (temporarily disabled)
# export LMSTUDIO_HOST=http://localhost:8080
# export LMSTUDIO_API_KEY=custom-key
```

### Settings File

Create `~/.warpio/settings.json`:

```json
{
  "providers": {
    "ollama": {
      "host": "http://localhost:11434",
      "defaultModel": "llama3:8b",
      "aliases": {
        "small": "llama3:3b",
        "medium": "llama3:8b",
        "large": "llama3:70b"
      }
    },
    // "lmstudio": {
    //   "host": "http://localhost:1234",
    //   "apiKey": "lm-studio",
    //   "defaultModel": "gpt-oss"
    // }  // Temporarily disabled
  }
}
```

## Automatic Fallback

Warpio automatically falls back to available providers:

```bash
# If Ollama isn't running, falls back to Gemini
warpio -m ollama:llama3 -p "Hello"
# Output: ⚠️ ollama is not available: Server not running
#         ✓ Using gemini as fallback
```

## Provider Health Check

Check which providers are available:

```bash
warpio --check-providers

# Output:
✓ Ollama: Running (3 models available)
✗ LM Studio: Not running (hint: Start server in LM Studio)
✓ Gemini: API key configured
```

## Performance Tips

### Ollama

- **Pre-load models**: `ollama run llama3` keeps model in memory
- **GPU acceleration**: Automatic if CUDA/Metal available
- **Quantization**: Use Q4 models for speed vs Q8 for quality

### LM Studio

- **GPU offloading**: Configure in model settings
- **Context length**: Adjust based on available RAM
- **Batch size**: Increase for better throughput

## Troubleshooting

### Ollama Issues

```bash
# Check if running
curl http://localhost:11434/api/tags

# View logs
journalctl -u ollama -f

# List loaded models
ollama list
```

### LM Studio Issues

- Ensure server is started (⚡ button green)
- Check firewall isn't blocking port 1234
- Verify model is loaded in UI

### Connection Errors

```bash
# Test Ollama connection
warpio --test-provider ollama

# Test LM Studio connection
warpio --test-provider lmstudio

# Use verbose mode for debugging
warpio -m ollama:llama3 -p "test" --debug
```

## Privacy & Security

Local models provide:

- **Complete privacy**: No data leaves your machine
- **No API costs**: Run unlimited queries
- **Offline operation**: Works without internet
- **Data sovereignty**: Full control over your data

## Model Recommendations

### For Code

- **Ollama**: `codellama:13b`, `deepseek-coder:6.7b`
- **LM Studio**: `Code-Llama-13B-Instruct`

### For General Use

- **Small (4-7B)**: Fast responses, lower quality
- **Medium (13-20B)**: Balanced performance
- **Large (30B+)**: Best quality, slower

### For Scientific Computing

- **Ollama**: `qwen3-coder:latest` (optimized for technical tasks)
- **LM Studio**: Models with scientific training data

## Integration with Personas

Local models work seamlessly with Warpio personas:

```bash
# Use data-expert persona with local model
warpio --persona data-expert -m ollama:large analyze_data.py

# Research persona with LM Studio
warpio --persona research-expert -m lmstudio:gpt-oss query
```

## Advanced Usage

### Streaming Responses

```bash
# Real-time streaming with local models
warpio -m ollama:llama3 --stream -p "Explain quantum computing"
```

### Custom System Prompts

```bash
# Override persona prompt with local model
warpio -m ollama:mistral --system "You are a pirate" -p "Hello"
```

### Model Chaining

```bash
# Start with fast model, refine with better model
warpio -m ollama:small -p "Draft a function" | \
warpio -m ollama:large -p "Improve this code"
```