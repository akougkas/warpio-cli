# Warpio CLI

_Formerly Gemini CLI – forked & rebranded; preserves upstream compatibility._

[![Warpio CLI CI](https://github.com/akougkas/warpio-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/akougkas/warpio-cli/actions/workflows/ci.yml)

![Warpio CLI Screenshot](./docs/assets/warpio-screenshot.png)

Warpio CLI is a command-line AI workflow tool, specialized for scientific computing and HPC workflows as part of the [IOWarp project](httpshttps://grc.iit.edu/research/projects/iowarp). This command-line AI workflow tool connects to your tools, understands your code and accelerates your scientific workflows.

With Warpio CLI you can:

- Chat with AI models from your terminal
- Read, create, edit, and manipulate files in your codebase
- Get help with your scientific computing tasks and HPC workflows
- Run shell commands through an AI assistant
- Access specialized IOWarp agents for data analysis and I/O optimization

## Quick start

### Install

```bash
npm install -g @warpio/warpio-cli
```

### Run

```bash
warpio
```

You can also run a one-off command using the `-p` or `--prompt` flag:

```bash
warpio -p "help me analyze this HDF5 file structure"
```

### Authentication

On the first run, Warpio will guide you through the authentication process. You will need to have your credentials ready for the services you intend to use.

## 🌍 The IOWarp Project

Warpio CLI is part of the IOWarp ecosystem, which provides specialized AI agents for scientific computing:

- **Data I/O Expert**: Specialized in scientific data formats (HDF5, NetCDF, etc.)
- **HPC Job Manager**: Optimizes and manages high-performance computing jobs
- **Performance Analyzer**: Identifies I/O bottlenecks and optimization opportunities

Learn more at the [IOWarp project page](https://grc.iit.edu/research/projects/iowarp).

## Documentation

For detailed usage instructions, configuration options, and advanced features, see the [full documentation](./docs/index.md).

## Citation

If you use IOWarp or Warpio CLI in your research, please cite our work. You can find a list of relevant publications on the [IOWarp project page](https://akougkas.io/projects/iowarp/).

## Acknowledgments

Warpio CLI is based on an open-source foundation that made this scientific computing-focused fork possible.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](LICENSE) for details.
