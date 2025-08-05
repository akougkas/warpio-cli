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
| Multi-Agent Personas | ❌ | ✅ (5 specialized scientific personas) |
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

```bash
npm install -g @warpio/warpio-cli
```

For source installation:

```bash
git clone https://github.com/akougkas/warpio-cli.git
cd warpio-cli
npm install
npm run build
npm link
```

Configure with your API keys during first run.

## 🚀 Quick Start

```bash
warpio --persona data-expert -p "Analyze this HDF5 file structure: data.h5"
```

## 📖 Usage Examples

- Data conversion: `warpio --persona data-expert -p "Convert NetCDF to HDF5 with compression"`
- HPC job: `warpio --persona hpc-expert -p "Optimize this SLURM script for 128 nodes"`
- Analysis: `warpio --persona analysis-expert -p "Plot correlation matrix from CSV data"`

More in [docs/SCIENTIFIC_WORKFLOWS.md](./docs/SCIENTIFIC_WORKFLOWS.md).

## 🔄 Persona Handover

Seamlessly coordinate workflows:

```bash
warpio --persona data-expert --task "Extract dataset" --non-interactive --context-from previous-session.msgpack
```

Uses `handover_to_persona` tool for chains like data-expert → analysis-expert → hpc-expert.

## ⚙️ Configuration

- Environment: `GEMINI_API_KEY` (preserved for compatibility)
- Config file: `~/.warpio/config.json`
- Ignore patterns: `.warpioignore`
- Scientific setup: Add HPC credentials and data paths

See [docs/index.md](./docs/index.md) for full config.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Focus on scientific computing enhancements while preserving upstream compatibility.

## 📜 License & Attribution

Apache 2.0 License - see [LICENSE](LICENSE).

Warpio CLI is a fork of [Google Gemini CLI](https://github.com/google-gemini/gemini-cli), with enhancements by the IOWarp team. We gratefully acknowledge Google's foundational work.
