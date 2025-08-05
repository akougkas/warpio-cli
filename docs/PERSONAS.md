# Warpio Personas

Warpio's personas are specialized AI experts based on IOWarp agents. Launch with `warpio --persona <name>`.

List all: `warpio --list-personas`  
Help: `warpio --persona-help <name>`

## Default (warpio)

**Description**: General-purpose assistant for development and basic scientific tasks.  
**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task, WebSearch, WebFetch  
**Required MCPs**: None  
**Expertise**: Code generation, file management, basic queries.  
**Example**: `warpio -p "Write a Python script to process CSV data"`  
**Tips**: Use as starting point; handover to specialists for complex tasks.  
**Handover Example**: "Handover to data-expert for HDF5 optimization"

## data-expert

**Description**: Handles scientific data formats, I/O optimization, conversions.  
**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task  
**Required MCPs**: adios-mcp, hdf5-mcp, parquet-mcp, compression-mcp  
**Expertise**: Format conversions, compression, parallel I/O.  
**Example**: `warpio --persona data-expert -p "Convert NetCDF to compressed HDF5"`  
**Tips**: Specify MCP in prompt for best results, e.g., "use hdf5-mcp".  
**Handover Example**: "Handover to analysis-expert after extraction"

## analysis-expert

**Description**: Data analysis, statistics, visualization with pandas/Matplotlib.  
**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task, WebSearch  
**Required MCPs**: pandas-mcp, plot-mcp, parquet-mcp  
**Expertise**: Statistical tests, ML models, interactive plots.  
**Example**: `warpio --persona analysis-expert -p "Plot correlation from dataset.csv"`  
**Tips**: Combine with web-search for latest methods.  
**Handover Example**: "Handover to hpc-expert for scaling computation"

## hpc-expert

**Description**: HPC optimization, SLURM/MPI, performance profiling.  
**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task  
**Required MCPs**: slurm-mcp, darshan-mcp, lmod-mcp, node-hardware-mcp, parallel-sort-mcp  
**Expertise**: Job scheduling, parallel code tuning, profiling.  
**Example**: `warpio --persona hpc-expert -p "Optimize MPI code for 64 nodes"`  
**Tips**: Provide hardware specs for better optimization.  
**Handover Example**: "Handover to workflow-expert for pipeline integration"

## research-expert

**Description**: Scientific writing, LaTeX, literature management.  
**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task, WebSearch  
**Required MCPs**: arxiv-mcp, chronolog-mcp, jarvis-mcp  
**Expertise**: Paper structuring, citation management, reproducible docs.  
**Example**: `warpio --persona research-expert -p "Generate BibTeX from DOI list"`  
**Tips**: Use arxiv-mcp for latest papers.  
**Handover Example**: "Handover to analysis-expert for results interpretation"

## workflow-expert

**Description**: Workflow design with Snakemake/Nextflow, automation.  
**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task  
**Required MCPs**: jarvis-mcp, chronolog-mcp, slurm-mcp  
**Expertise**: Pipeline creation, automation, scaling.  
**Example**: `warpio --persona workflow-expert -p "Create pipeline for genomics analysis"`  
**Tips**: Integrate with hpc-expert for cluster deployment.  
**Handover Example**: "Handover to research-expert for documentation"

## Chaining Personas

Use the `handover_to_persona` tool in prompts or non-interactive mode for workflows.  
Example chain script:
```bash
warpio --persona data-expert --task "Extract data" --non-interactive --context-file ctx.msgpack
warpio --persona analysis-expert --context-from ctx.msgpack --task "Analyze" --non-interactive
``` 
