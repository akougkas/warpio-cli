# 🚀 Warpio CLI (Internal GRC Release)

**Note: This is an internal release for the Gnosis Research Center team. Do not distribute outside GRC.**

[![npm version](https://badge.fury.io/js/%40warpio%2Fwarpio-cli.svg)](https://badge.fury.io/js/%40warpio%2Fwarpio-cli)
[![Warpio CLI CI](https://github.com/akougkas/warpio-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/akougkas/warpio-cli/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

![Warpio CLI Demo](./docs/assets/warpio-screenshot.png)

Warpio CLI is an advanced AI-powered command-line interface designed specifically for scientific computing and research workflows. Built as an enhanced fork of [Google Gemini CLI](https://github.com/google-gemini/gemini-cli), Warpio integrates multi-agent personas, efficient context handover, and native support for scientific tools, making it an essential tool for researchers, data scientists, and HPC users.

As part of the [IOWarp ecosystem](https://grc.iit.edu/research/projects/iowarp), Warpio bridges AI with high-performance computing, enabling seamless collaboration between specialized AI experts for complex scientific tasks.

## ✨ Key Features

- **🎯 Production-Ready Local Models**: Native Ollama SDK integration with intelligent routing and health checking
- **🚀 LLM-Agnostic Architecture**: Seamlessly switch between Gemini API and local models with hybrid format support
- **👥 Multi-Agent Personas**: 5 specialized AI experts with automatic IOWarp MCP provisioning
- **⚡ Performance Optimized**: 3-5x faster context handover with MessagePack serialization
- **🔬 Scientific Computing Ready**: Zero-config HDF5, NetCDF, SLURM, ArXiv, and MPI integration
- **🎨 Clean User Experience**: Production-grade error handling and intuitive model switching
- **🔄 Upstream Compatible**: Maintains full compatibility with Google's Gemini CLI updates
- **📊 Battle Tested**: Automated testing across 14 scientific computing scenarios
- **🛠️ Extensible Architecture**: Easy integration of new providers and custom tools

## 📦 Installation

### Via npm (Recommended for Users)

```bash
npm install -g @warpio/warpio-cli
```

### From Source (For Developers)

```bash
git clone https://github.com/akougkas/warpio-cli.git
cd warpio-cli
npm install
npm run build
npm link
```

### Prerequisites

- Node.js >= 20
- [Gemini API Key](https://aistudio.google.com/app/apikey) (set as `GEMINI_API_KEY` env var)
- For GRC HPC: Ensure access to shared modules (contact admin for setup)

## 🚀 Quick Start

1. Set API key:

   ```bash
   export GEMINI_API_KEY="your-api-key"
   ```

2. Launch interactive session:

   ```bash
   warpio
   ```

3. Quick query:

   ```bash
   warpio -p "Generate a SLURM script for MPI job"
   ```

4. Select AI model:

   ```bash
   # List all available models (Gemini + Local)
   warpio --model list

   # Gemini models (use aliases)
   warpio -m flash -p "Explain quantum computing"
   warpio -m pro -p "Complex analysis required here"

   # Local models (use provider::model format)
   warpio -m ollama::qwen3:30b -p "Local AI assistance"
   ```

5. With persona (MCPs auto-configured):

   ```bash
   warpio --persona hpc-expert -p "Optimize this code for GPU"
   ```

6. List personas:
   ```bash
   warpio --list-personas
   ```

**New**: Each persona automatically gets its required IOWarp MCPs - no manual setup needed!  
For GRC users: Use `--persona research-expert` for paper drafting with our template.

## 📖 Usage

### Interactive Mode

Start a conversation:

```bash
warpio
```

Use slash commands like `/mcp install hdf5` or natural language. For GRC: Prefix queries with "Using GRC cluster config:" for tailored responses.

### Non-Interactive Mode

For scripts or pipelines:

```bash
warpio -p "Process data.h5" --non-interactive
```

Tip: Use with cron jobs for automated reports.

### Personas

Switch experts:

```bash
warpio --persona data-expert
```

See [PERSONAS.md](./docs/PERSONAS.md) for details. GRC Tip: hpc-expert is optimized for our SLURM setup.

### MCP Management

Install scientific tools:

```bash
warpio mcp install slurm
```

List: `warpio mcp list`

GRC Tip: Install darshan-mcp for I/O profiling on our systems.

### Context Handover

Chain tasks:

```bash
warpio --persona data-expert --task "Extract data" --non-interactive --context-file ctx.msgpack
warpio --persona analysis-expert --context-from ctx.msgpack -p "Analyze extracted data"
```

Useful for multi-step simulations in GRC projects.

## 🧪 Examples

### Model Selection (Hybrid Format)

```bash
# List all available models from all providers
warpio --model list

# Gemini models (original format with aliases)
warpio --model flash -p "Quick question"       # Uses Gemini Flash
warpio --model pro -p "Complex reasoning task" # Uses Gemini Pro

# Local providers (provider::model_name format)
warpio -m ollama::qwen3-coder:latest -p "Write Python function"
warpio -m lmstudio::qwen3-4b-instruct-2507@q8_0 -p "Local inference"
```

### Data Analysis Workflow (GRC Style)

```bash
warpio --persona analysis-expert -p "Load CSV from shared storage, perform regression, plot results using plot-mcp"
```

### HPC Job Submission

```bash
warpio --persona hpc-expert -p "Create SLURM script with darshan-mcp profiling for our Theta cluster"
```

More in [SCIENTIFIC_WORKFLOWS.md](./docs/SCIENTIFIC_WORKFLOWS.md).

## 🛠️ Configuration

- **API Key**: `GEMINI_API_KEY` env var
- **Config File**: `~/.warpio/config.json` - Add GRC-specific paths here.
- **Ignore Files**: `.warpioignore` - Exclude sensitive data.
- **Project Notes**: `WARPIO.md` - Add project-specific instructions.

Run `warpio` for interactive setup. For GRC: See shared config template in team drive.

Troubleshooting: If MCP fails, check `warpio mcp refresh`. Report issues in internal channel.

## 🔧 For Developers

### Building and Testing

```bash
npm run preflight  # Builds, tests, typechecks, lints
npm test           # Run tests
```

### Git Workflow

- **Branches**: main (stable), warpio/feature/\* (new features)
- **Upstream Sync**: `git fetch upstream; git merge upstream/main`
- **Commits**: Atomic, descriptive messages

### Architecture

- **Packages**: @warpio/warpio-cli (orchestration), @google/gemini-cli (UI), @google/gemini-cli-core (backend)
- **Principles**: Immutable data, ES modules, functional patterns
- **Personas**: Extend in src/personas/persona-manager.ts
- **MCPs**: Catalog in ui/commands/mcpCommand.ts

See CLAUDE.md for full dev guide (internal only).

## 🔧 Current Status (January 2025)

- ✅ **Production Ready**: Clean, fast responses without debug clutter
- ✅ **Code Quality**: 0 ESLint errors, all TypeScript types clean, 100% test passing
- ✅ **MCP Integration**: 8 stable MCP servers providing 70+ scientific computing tools
- ✅ **All Personas Functional**: data-expert, analysis-expert, hpc-expert, research-expert, workflow-expert
- ✅ **Battle Tested**: Automated testing framework validates core functionality
- ✅ **Upstream Compatibility**: All changes are additive and merge-safe with Google's Gemini CLI
- 🚀 **Ready for Deployment**: Streamlined, production-ready scientific AI CLI

### Latest Updates (January 12, 2025)

**Model Format Standardization Complete:**

- Hybrid model format: Gemini preserves original aliases (flash, pro), local providers use provider::model_name
- Simplified parsing logic with backward compatibility for all existing Gemini workflows
- Enhanced model discovery with proper provider formatting and health checking
- All provider routing working correctly with clean separation of concerns

**Code Quality & Stability Complete:**

- Fixed all 47 ESLint errors via license exclusions and code cleanup
- Restored proper upstream double-ESC functionality (timer-based implementation)
- All 56 InputPrompt tests + Footer tests passing
- Clean TypeScript compilation with proper type annotations
- Removed all debug artifacts and unused code

**Working Commands:**

```bash
# Gemini (original format)
warpio -m flash -p "test"                    # ✅ Working
warpio -m pro -p "test"                      # ✅ Working

# Local providers (standardized format)
warpio -m ollama::qwen3:30b -p "test"        # ✅ Working
warpio -m lmstudio::model-name -p "test"     # ✅ Working

# Model discovery
warpio --model list                          # ✅ Shows all providers with correct formatting
```

**System Status:**

```bash
npm run build     # ✅ Clean compilation
npm run lint      # ✅ 0 errors, 0 warnings
npm test          # ✅ All tests passing
npm run preflight # ✅ Full validation passes
```

## 👥 GRC Team

- Report bugs in internal tracker
- Share workflows in team meetings
- Questions? Ping @akougkas

## 🤝 Contributing

Contributions welcome!

- Check [CONTRIBUTING.md](CONTRIBUTING.md)
- Focus on scientific/HPC features
- Run `npm test` before PRs

## 📜 License

Apache 2.0 - see [LICENSE](LICENSE).  
Forked from [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) - thanks to the Gemini team!
