# Scientific Workflows in Warpio CLI

This document provides practical examples of scientific computing workflows using Warpio CLI's multi-agent personas and features.

## Data Processing Workflow

**Scenario**: Convert NetCDF climate data to HDF5 with compression and chunking.

```bash
warpio --persona data-expert -p "Convert ocean_temp.nc to HDF5 with GZIP compression and 100x100 chunking. Preserve metadata."
```

The data-expert persona will use its expertise in formats to generate a script or directly perform the conversion using available tools.

## Analysis and Visualization

**Scenario**: Perform statistical analysis on simulation data and create plots.

```bash
warpio --persona analysis-expert -p "Load results.parquet, compute mean and std dev by group, create heatmap visualization."
```

Uses pandas-mcp integration for analysis and plot-mcp for visualization.

## HPC Optimization

**Scenario**: Optimize a MPI job script for SLURM cluster.

```bash
warpio --persona hpc-expert -p "Optimize this SLURM script for 64 nodes with MPI: [paste script]"
```

Applies performance patterns like collective I/O and NUMA awareness.

## Research Documentation

**Scenario**: Generate a LaTeX section for methods description.

```bash
warpio --persona research-expert -p "Write LaTeX methods section for experiment with HDF5 data processing and SLURM execution."
```

Includes reproducible details and citations.

## Workflow Orchestration

**Scenario**: Design a Snakemake pipeline for genomics analysis.

```bash
warpio --persona workflow-expert -p "Create Snakemake workflow for FASTQ alignment, variant calling, and annotation."
```

Generates a complete Snakefile with rules and dependencies.

## Multi-Agent Chain

Start with data extraction, handover to analysis, then to HPC for scaling.

```bash
warpio --persona data-expert --task "Extract dataset from large.h5" --non-interactive
# Use handover_to_persona tool internally to chain to analysis-expert
```

See PERSONAS.md for more details on chaining. 
