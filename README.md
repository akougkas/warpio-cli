# 🚀 Warpio CLI

> AI-powered scientific computing command-line interface

[![npm version](https://badge.fury.io/js/%40warpio%2Fwarpio-cli.svg)](https://badge.fury.io/js/%40warpio%2Fwarpio-cli)
[![Warpio CLI CI](https://github.com/akougkas/warpio-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/akougkas/warpio-cli/actions/workflows/ci.yml)

![Warpio CLI Screenshot](./docs/assets/gemini-screenshot.png)

**Warpio CLI** is an advanced conversational AI interface optimized for scientific computing workflows. Built upon the solid foundation of [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) (forked from v0.1.17 with full upstream compatibility), Warpio adds revolutionary multi-agent coordination, native support for scientific data formats, and high-performance context handover capabilities.

As part of the [IOWarp ecosystem](https://grc.iit.edu/research/projects/iowarp), Warpio serves as the intelligent frontend for researchers and scientists, enabling seamless workflows across data analysis, HPC optimization, and research documentation.

## ✨ Features

Warpio builds on Gemini CLI's core capabilities with scientific computing enhancements:

| Feature | Gemini CLI | Warpio CLI |
|---------|------------|------------|
| Terminal AI Chat | ✅ | ✅ |
| File Manipulation | ✅ | ✅ |
| Shell Command Execution | ✅ | ✅ |
| Multi-Agent Personas | ❌ | ✅ (built-in "warpio" default + 5 expert personas) |
| Context Handover | Basic | ✅ Advanced with MessagePack (3-5x faster) |
| Scientific Data Support | ❌ | ✅ (HDF5, NetCDF, ADIOS, Parquet) |
| HPC Integration | ❌ | ✅ (SLURM, PBS, MPI optimization) |
| Performance Metrics | Standard | ✅ 60-80% smaller context files |

## 🔬 Scientific Computing

Warpio excels in scientific workflows with native support for:

- **Data Formats**: HDF5, NetCDF, ADIOS, Parquet, Zarr
- **HPC Tools**: SLURM/PBS job scripting, MPI parallelization, Darshan profiling
- **Optimization**: I/O tuning, chunking strategies, parallel I/O patterns
- **Libraries**: Integration with NumPy, SciPy, Pandas, Dask, mpi4py

See [docs/SCIENTIFIC_WORKFLOWS.md](./docs/SCIENTIFIC_WORKFLOWS.md) for detailed examples.

## 🤖 Multi-Agent Personas

Warpio's revolutionary persona system ports IOWarp's 5 expert agents:

- **data-expert**: Scientific data formats and I/O optimization
- **analysis-expert**: Data analysis and visualization
- **hpc-expert**: HPC performance and optimization
- **research-expert**: Research documentation and literature management
- **workflow-expert**: Workflow orchestration and automation

Launch with `warpio --persona <name>`. See [docs/PERSONAS.md](./docs/PERSONAS.md) for details.

## ⚡ Performance

- 3-5x faster context serialization with MessagePack
- 60-80% smaller context files
- Zero-loss multi-agent handovers
- Optimized for large-scale scientific datasets and HPC environments

## 📦 Installation

### From Source (Recommended)

```bash
git clone https://github.com/akougkas/warpio-cli.git
cd warpio-cli
npm install
npm run build
npm link
```

### Prerequisites
- Node.js 20+ 
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## 🚀 Quick Start

### First Run
```bash
warpio
```
Follow the setup wizard to configure your API key and preferences.

### Basic Usage
```bash
warpio                          # Launch interactive chat
warpio -p "List files in current directory"
warpio --persona data-expert    # Launch with scientific data expertise
warpio --help                   # View all options
```

### Scientific Workflows
```bash
warpio --persona data-expert -p "Analyze this HDF5 file structure: data.h5"
warpio --persona hpc-expert -p "Optimize this SLURM script for 128 nodes"
```

## 🔄 Context Handover & Non-Interactive Workloads

Warpio’s `handover_to_persona` tool and MessagePack context serialization let you chain personas and execute tasks fully non-interactively – ideal for CI pipelines or long-running HPC jobs.

```bash
# Hand over results from a data-extraction run to the viz expert then exit
warpio --persona data-expert \
       --task "Extract dataset" \
       --non-interactive \
       --context-file out.msgpack

# Later (maybe on another node)
warpio --persona analysis-expert \
       --context-from out.msgpack \
       -p "Generate publication-quality plots"
```

See `docs/SCIENTIFIC_WORKFLOWS.md` for more elaborate multi-step pipelines.

---

## 📖 Usage Examples

### Interactive Mode
```bash
warpio
# Launch terminal chat interface
# Ask questions, edit files, run commands
```

### One-shot Commands  
```bash
warpio -p "Show me the git status"
warpio -p "Create a Python script that reads CSV files"
warpio -p "Help me debug this error message"
```

### Scientific Computing
```bash
# Data analysis
warpio --persona analysis-expert -p "Plot correlation matrix from CSV data"

# HPC optimization
warpio --persona hpc-expert -p "Optimize this SLURM script for 128 nodes"

# Data format conversion
warpio --persona data-expert -p "Convert NetCDF to HDF5 with compression"
```

### Persona Management
```bash
warpio --list-personas           # View available personas
warpio --persona-help data-expert # Get help for specific persona
```

More examples in [docs/SCIENTIFIC_WORKFLOWS.md](./docs/SCIENTIFIC_WORKFLOWS.md).

## 🔄 Persona Handover

Seamlessly coordinate workflows:

```bash
warpio --persona data-expert --task "Extract dataset" --non-interactive --context-from previous-session.msgpack
```

Uses `handover_to_persona` tool for chains like data-expert → analysis-expert → hpc-expert.

## ⚙️ Configuration

### Environment Variables
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### Config Locations
- Config file: `~/.warpio/config.json`
- Ignore patterns: `.warpioignore` (project-specific file exclusions)
- Project context: `WARPIO.md` (project-specific instructions)

### First-time Setup
```bash
warpio
# Follow interactive setup to configure:
# - API key
# - Model preferences  
# - Scientific computing paths
# - HPC cluster credentials (optional)
```

See [docs/index.md](./docs/index.md) for advanced configuration.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Focus on scientific computing enhancements while preserving upstream compatibility.

## 📜 License & Attribution

Apache 2.0 License - see [LICENSE](LICENSE).

Warpio CLI is a fork of [Google Gemini CLI](https://github.com/google-gemini/gemini-cli), with enhancements by the IOWarp team. We gratefully acknowledge Google's foundational work.
