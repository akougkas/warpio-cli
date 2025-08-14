# 🚀 Warpio CLI - AI-Powered Scientific Computing Interface

[![npm version](https://badge.fury.io/js/%40warpio%2Fwarpio-cli.svg)](https://badge.fury.io/js/%40warpio%2Fwarpio-cli)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Warpio CLI is an advanced AI-powered command-line interface designed for scientific computing, research workflows, and software engineering. Built as an enhanced fork of [Google Gemini CLI](https://github.com/google-gemini/gemini-cli), Warpio adds multi-provider AI support, specialized personas, and comprehensive model management capabilities.

## ✨ Key Features

### 🤖 **Multi-Provider AI Support**

- **4 AI Providers**: Gemini, LM Studio, Ollama, OpenAI
- **Dynamic Model Discovery**: Automatically find available models
- **Flexible Switching**: Change providers/models via CLI or interactively
- **Connection Testing**: Health checks for all configured providers

### 🎭 **Specialized AI Personas**

- **data-expert**: Scientific data I/O (HDF5, NetCDF, compression)
- **analysis-expert**: Data analysis & visualization (pandas, plotting)
- **hpc-expert**: HPC optimization (SLURM, MPI, performance)
- **research-expert**: Research & documentation (arxiv, papers)
- **workflow-expert**: Workflow orchestration & automation

### 🔧 **Advanced Model Management**

- **Interactive Commands**: `/model list`, `/model current`, `/model set`
- **Provider::Model Syntax**: `npx warpio -m lmstudio::qwen3-4b -p "hello"`
- **Model Validation**: Smart error handling and format checking
- **Status Display**: Rich console output with model capabilities

### ⚡ **Performance & Usability**

- **Context Handover**: Efficient multi-step workflows with MessagePack
- **Interactive & Non-Interactive**: Flexible for quick queries or automation
- **Scientific Tools**: Built-in HDF5, NetCDF, SLURM, MPI support
- **ENV-Only Config**: Simple environment variable configuration

## 📦 Installation

### Via npm (Recommended)

```bash
npm install -g @warpio/warpio-cli
```

### From Source (Development)

```bash
git clone https://github.com/akougkas/warpio-cli.git
cd warpio-cli
npm install
npm run build
npm link
```

### Prerequisites

- **Node.js >= 20**
- **AI Provider Access**:
  - [Gemini API Key](https://aistudio.google.com/app/apikey) (default)
  - Or local AI setup (LM Studio, Ollama)
  - Or OpenAI API key

## 🚀 Quick Start

### 1. **Basic Setup (Gemini)**

```bash
export GEMINI_API_KEY="your-api-key"
npx warpio -p "Hello, introduce yourself"
```

### 2. **Interactive Session**

```bash
npx warpio
```

Use natural language or slash commands like `/model list` to explore capabilities.

### 3. **Model Management**

```bash
# List all available models
npx warpio /model list

# Use specific model
npx warpio -m gemini::gemini-2.5-flash -p "What can you do?"

# Test provider connections
npx warpio /model test

# Show current configuration
npx warpio /model current
```

### 4. **Specialized Personas**

```bash
# Scientific data processing
npx warpio --persona data-expert -p "Convert NetCDF to HDF5"

# HPC workflow optimization
npx warpio --persona hpc-expert -p "Create SLURM job script"

# Research assistance
npx warpio --persona research-expert -p "Summarize recent ML papers"
```

## ⚙️ Configuration

### Environment Setup

Copy `.env.example` to `.env` and configure your preferred providers:

```bash
# Gemini (Default - works out of box)
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# LM Studio (Local AI)
WARPIO_PROVIDER=lmstudio
LMSTUDIO_HOST=http://localhost:1234/v1
LMSTUDIO_MODEL=qwen3-4b-instruct-2507

# Ollama (Local AI)
WARPIO_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b

# OpenAI (Cloud API)
WARPIO_PROVIDER=openai
OPENAI_API_KEY=sk-your_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Model Selection Methods

**1. CLI Arguments (Temporary)**

```bash
npx warpio -m gemini::gemini-2.5-flash -p "hello"
npx warpio -m lmstudio::qwen3-4b -p "hello"
npx warpio -m ollama::llama3.2:3b -p "hello"
npx warpio -m openai::gpt-4o-mini -p "hello"
```

**2. Environment Variables (Persistent)**

```bash
WARPIO_PROVIDER=lmstudio npx warpio -p "hello"
```

**3. Interactive Slash Commands**

```bash
# Model Management
/model list                    # Show available models
/model current                 # Display current configuration
/model set lmstudio::qwen3-4b  # Switch models (restart required)
/model test                    # Test all provider connections
/model refresh                 # Refresh model cache

# Persona Management  
/persona list                  # List available experts
/persona data-expert           # Switch to data expert
/persona help                  # Explain persona system and usage
```

## 💡 Usage Examples

### Scientific Data Workflow

```bash
# Process scientific data with specialized AI
npx warpio --persona data-expert -p "
Load temperature.nc NetCDF file,
extract data for summer months,
convert to HDF5 format for analysis
"
```

### HPC Job Management

```bash
# Generate optimized SLURM scripts
npx warpio --persona hpc-expert -p "
Create SLURM script for MPI job:
- 64 cores across 4 nodes
- GPU acceleration
- 2-hour time limit
- Include performance profiling
"
```

### Multi-Step Research Pipeline

```bash
# Step 1: Data extraction
npx warpio --persona data-expert \
  --context-file research.msgpack \
  -p "Extract trends from climate_data.csv"

# Step 2: Analysis
npx warpio --persona analysis-expert \
  --context-from research.msgpack \
  -p "Perform statistical analysis and create visualizations"

# Step 3: Report generation
npx warpio --persona research-expert \
  --context-from research.msgpack \
  -p "Generate research summary with methodology"
```

### Interactive Model Discovery

```bash
# Start interactive session
npx warpio

# Inside session, discover capabilities
> /model list
📦 Available Providers and Models:

✅ GEMINI
   Default: gemini-2.5-flash
   Models:
     🔧 gemini-2.5-flash (1048K ctx)
        Latest multimodal model with tool calling
     🔧 gemini-1.5-pro-latest (2097K ctx)
        Most capable for complex reasoning

✅ LMSTUDIO
   Default: qwen3-4b-instruct-2507
   Models:
     🔧 qwen3-4b-instruct-2507 (8K ctx)
        Fast 4B parameter model for development
     🔧 gpt-oss-20b (4K ctx)
        More capable 20B parameter model

> /model set lmstudio::qwen3-4b-instruct-2507
✅ Switched to lmstudio::qwen3-4b-instruct-2507
⚠️  Note: Restart the session to use the new model.
```

## 🛠️ Development

### Building and Testing

```bash
npm run preflight    # Build, test, typecheck, lint
npm run build        # Build all packages
npm run typecheck    # TypeScript validation
npm run lint         # Code style checking
npm run test:ci      # Run test suite
```

### Project Structure

```
warpio-cli/
├── packages/
│   ├── cli/                 # Main CLI package
│   ├── core/                # Core functionality
│   │   └── src/warpio/      # Warpio enhancements
│   └── test-utils/          # Testing utilities
├── .env.example             # Configuration template
├── CLAUDE.md               # Development guidelines
└── warpio-docs/            # Enhanced documentation
```

### Git Workflow

```bash
# Feature development
git checkout -b warpio/feature-name
git fetch upstream
git merge upstream/main  # Sync with google-gemini/gemini-cli

# Testing
npm run preflight
```

## 🔍 Troubleshooting

### Provider Connection Issues

```bash
# Test all provider connections
npx warpio /model test

# Check current configuration
npx warpio /model current

# Refresh model cache
npx warpio /model refresh
```

### Common Issues

**"Model not found"**: Use `/model list` to see available models for your provider

**"Provider unavailable"**: Check if local AI servers (LM Studio/Ollama) are running

**"API key invalid"**: Verify environment variables with `/model current`

**Import errors**: Run `npm run build` to ensure all packages are compiled

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Focus Areas:**

- Scientific computing workflows
- HPC integration improvements
- Additional AI provider support
- Performance optimizations

### Development Guidelines

- Keep Warpio enhancements in `/packages/core/src/warpio/`
- Maintain upstream compatibility with google-gemini/gemini-cli
- Follow existing code patterns and TypeScript standards
- Run `npm run preflight` before submitting PRs

## 📊 Current Status (August 2025)

### ✅ Production Ready Features

- **Multi-Provider Support**: Gemini, LM Studio, Ollama, OpenAI fully functional
- **Model Management**: Complete discovery, validation, and switching system
- **Specialized Personas**: 5 expert AI personalities with tool integration
- **Scientific Tooling**: HDF5, NetCDF, SLURM, MPI support via MCP integration
- **Performance Optimized**: Context handover, caching, parallel operations

### 🚧 In Development

- Advanced model registry with JSON configurations (by user request)
- Additional local AI provider integrations
- Enhanced persona-model optimization
- Expanded scientific workflow templates

### 🎯 Architecture Highlights

- **Upstream Compatible**: Clean integration with minimal core changes
- **ENV-Only Configuration**: Simple, reliable setup without complex files
- **Graceful Fallbacks**: Works even if advanced features unavailable
- **TypeScript First**: Full type safety and IntelliSense support

## 📜 License

Apache 2.0 - see [LICENSE](LICENSE)

**Acknowledgments**: Built on [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) - thanks to the Gemini team for the excellent foundation!

---

**Ready to get started?**

```bash
npx @warpio/warpio-cli -p "Hello! Show me what you can do."
```
