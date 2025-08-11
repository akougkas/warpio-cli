# Warpio CLI Migration Guide

This guide explains the differences between the upstream Gemini CLI and Warpio CLI, focusing on the model selector and other Warpio-specific enhancements.

## Overview

Warpio CLI is a fork of Google's Gemini CLI that maintains full backward compatibility while adding powerful new features:

- **LLM-agnostic architecture**: Support for multiple AI providers (Gemini, OpenAI, Anthropic, etc.)
- **Model selector**: Interactive model management and listing
- **Provider aliases**: Convenient shortcuts for common models
- **Scientific computing focus**: Enhanced for research and data analysis workflows
- **IOWarp ecosystem integration**: Seamless integration with scientific computing tools

## Backward Compatibility

**✅ 100% Compatible**: All existing Gemini CLI configurations, commands, and workflows work unchanged in Warpio.

### Environment Variables

```bash
# These continue to work exactly the same
export GEMINI_API_KEY="your-api-key"
export GEMINI_MODEL="gemini-1.5-pro"
export GEMINI_SANDBOX=true
```

### Command Line Usage

```bash
# All these Gemini CLI commands work identically in Warpio
warpio --model "gemini-1.5-flash"
warpio --sandbox
warpio --debug
warpio -p "Explain this code"
```

### Settings Files

Your existing `.gemini/` configuration directories and settings files work without modification.

## New Warpio Features

### Model Selector

**What's new**: Interactive model management and convenient aliases.

#### Command Line Model Listing

```bash
# NEW: List all available models
warpio --model list
```

**Output**:

```
🤖 Available AI Models

📡 GEMINI (15 models):
   • models/gemini-2.0-flash-exp (aliases: pro)
   • models/gemini-2.5-flash (aliases: flash)
   • models/gemini-2.5-flash-lite (aliases: flash-lite)
   ...
```

#### Model Aliases

```bash
# NEW: Use convenient aliases instead of full model names
warpio --model flash        # → models/gemini-2.5-flash
warpio --model pro          # → models/gemini-2.0-flash-exp
warpio --model flash-lite   # → models/gemini-2.5-flash-lite

# OLD: Still works, but more verbose
warpio --model "models/gemini-2.5-flash"
```

#### Interactive Model Management

```bash
# NEW: Interactive model switching
/model flash              # Switch to flash model
/model pro                # Switch to pro model
/model list               # List models interactively
/model                    # Show current model
```

#### Provider Selection

```bash
# NEW: Explicit provider selection
warpio --provider gemini --model flash
warpio --model gemini:flash

# NEW: Future multi-provider support
warpio --model openai:gpt-4      # When OpenAI is supported
warpio --model anthropic:claude  # When Anthropic is supported
```

### Enhanced Configuration

#### Provider Configuration

```json
{
  "model": "flash",
  "provider": "gemini",
  "providers": {
    "gemini": {
      "defaultModel": "flash"
    }
  }
}
```

#### Model Resolution Priority

1. `--model` CLI argument
2. Settings file `model` field
3. `GEMINI_MODEL` environment variable
4. Default model

## Scientific Computing Enhancements

### IOWarp Personas

```bash
# NEW: Scientific computing personas
warpio --persona data-expert      # Data I/O specialist
warpio --persona analysis-expert  # Analysis & visualization
warpio --persona hpc-expert       # HPC optimization
warpio --persona research-expert  # Research documentation
```

### Enhanced Initialization

```bash
# NEW: Scientific project detection
warpio init
# Detects: HDF5, NetCDF, SLURM, Jupyter notebooks, etc.
```

## Migration Strategies

### Minimal Migration (Recommended)

Keep your existing setup unchanged - everything will work:

```bash
# Your existing workflow - no changes needed
export GEMINI_API_KEY="your-key"
export GEMINI_MODEL="gemini-1.5-pro"
warpio
```

### Gradual Adoption

Start using new features incrementally:

```bash
# Try model aliases
warpio --model flash

# Explore model listing
warpio --model list

# Use interactive model switching
warpio
> /model pro
> /model list
```

### Full Migration

Adopt all new Warpio features:

```bash
# Use aliases in settings
echo '{"model": "flash", "provider": "gemini"}' > ~/.warpio/settings.json

# Explore scientific personas
warpio --persona data-expert

# Use interactive model management
warpio
> /model list
> /model pro
```

## Breaking Changes

**None**: Warpio maintains 100% backward compatibility with Gemini CLI.

### Internal API Preservation

Warpio preserves all internal APIs for compatibility:

- `GeminiClient` class unchanged
- `GEMINI_API_KEY` environment variable
- Package names: `@google/gemini-cli-core`
- File paths: `.gemini/` configuration directories

### User-Facing Enhancements

Only user-facing elements are enhanced:

- Command name: `gemini` → `warpio`
- Product references: "Gemini CLI" → "Warpio CLI"
- Help text and banners updated
- New features added without affecting existing functionality

## Troubleshooting Migration

### Command Not Found

**Issue**: `warpio` command not found after migration

**Solution**:

```bash
# Install or update Warpio
npm install -g @warpio/warpio-cli

# Or use npx
npx @warpio/warpio-cli
```

### Settings Not Found

**Issue**: Settings not loading after migration

**Solution**:
Warpio looks for settings in the same locations as Gemini CLI:

- System: `/etc/warpio/settings.json`
- User: `~/.warpio/settings.json`
- Workspace: `./.warpio/settings.json`

Your existing `.gemini/` directories are also checked for backward compatibility.

### API Key Issues

**Issue**: Model listing fails with API key errors

**Solution**:

```bash
# Ensure API key is set
export GEMINI_API_KEY="your-api-key"

# Test with traditional model name
warpio --model "models/gemini-1.5-flash"

# Then try aliases
warpio --model flash
```

### Model Aliases Not Working

**Issue**: Model aliases not resolved

**Solution**:

```bash
# List available models to see supported aliases
warpio --model list

# Use full model names as fallback
warpio --model "models/gemini-2.5-flash"
```

## Future Provider Migration

When additional providers are supported:

### OpenAI Integration

```bash
# Set up OpenAI
export OPENAI_API_KEY="your-openai-key"

# Use OpenAI models
warpio --model openai:gpt-4
warpio --provider openai --model gpt-4
```

### Anthropic Integration

```bash
# Set up Anthropic
export ANTHROPIC_API_KEY="your-anthropic-key"

# Use Anthropic models
warpio --model anthropic:claude
warpio --provider anthropic --model claude
```

### Multi-Provider Workflows

```bash
# Start with Gemini
warpio --model gemini:flash

# Switch to OpenAI mid-conversation
> /model openai:gpt-4

# Switch to Anthropic
> /model anthropic:claude

# Back to Gemini
> /model flash
```

## Support and Resources

### Documentation

- **Warpio-specific docs**: `docs/warpio/`
- **Upstream compatibility**: `docs/cli/` (unchanged)
- **Model selector**: `docs/warpio/model-selector.md`
- **Provider guide**: `docs/warpio/providers.md`

### CLI Help

```bash
# Updated help with Warpio features
warpio --help

# Model-specific help
warpio --model --help

# Interactive help
warpio
> /help
> /model --help
```

### Community

- **GitHub**: [akougkas/warpio-cli](https://github.com/akougkas/warpio-cli)
- **Issues**: Report bugs and feature requests
- **Discussions**: Community support and questions

### Upstream Contributions

Warpio maintains compatibility with upstream Gemini CLI:

- Bug fixes can be contributed back to Google's repository
- Feature improvements benefit both projects
- Clean separation allows easy upstream syncing

## See Also

- [Model Selector Guide](./model-selector.md)
- [Provider Configuration](./providers.md)
- [Interactive Commands](./commands/model.md)
- [Scientific Computing Features](../personas/README.md)
