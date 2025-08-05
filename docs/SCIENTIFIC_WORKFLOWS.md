# Scientific Workflows in Warpio CLI

Leverage Warpio's personas and MCPs for research tasks. Examples assume required MCPs are installed.

## Data Processing

**Task**: Convert and optimize scientific data.  
**Persona**: data-expert  
**Command**:
```bash
warpio --persona data-expert -p "Convert ocean_temp.nc to HDF5 with GZIP compression, 100x100 chunks. Use hdf5-mcp."
```
**Tips**: Specify MCPs in prompts for specialized tools. Handover to analysis-expert for immediate processing.

## Analysis & Visualization

**Task**: Statistical analysis and plotting.  
**Persona**: analysis-expert  
**Command**:
```bash
warpio --persona analysis-expert -p "Load results.parquet with parquet-mcp, compute stats, create heatmap with plot-mcp."
```
**Tips**: Chain with data-expert for end-to-end processing. Use WebSearch for methodology references.

## HPC Optimization

**Task**: Job script tuning.  
**Persona**: hpc-expert  
**Command**:
```bash
warpio --persona hpc-expert -p "Optimize SLURM script for 128 nodes using slurm-mcp and darshan-mcp for profiling."
```
**Tips**: Use node-hardware-mcp for topology-aware optimization. Integrate with workflow-expert for automated runs.

## Research Documentation

**Task**: Literature management.  
**Persona**: research-expert  
**Command**:
```bash
warpio --persona research-expert -p "Fetch papers on 'quantum computing' with arxiv-mcp, generate LaTeX summary."
```
**Tips**: Integrate with workflow-expert for automated reports. Use chronolog-mcp for timeline tracking.

## Workflow Design

**Task**: Create analysis pipeline.  
**Persona**: workflow-expert  
**Command**:
```bash
warpio --persona workflow-expert -p "Design Snakemake pipeline for data processing using jarvis-mcp."
```
**Tips**: Include slurm-mcp for HPC execution. Test small-scale before scaling.

## Machine Learning Pipeline

**Task**: Build ML workflow for classification.  
**Persona**: analysis-expert  
**Command**:
```bash
warpio --persona analysis-expert -p "Create scikit-learn pipeline for image classification, use pandas-mcp for data prep."
```
**Tips**: Handover to hpc-expert for GPU training optimization.

## Literature Review Automation

**Task**: Systematic review setup.  
**Persona**: research-expert  
**Command**:
```bash
warpio --persona research-expert -p "Setup Zotero integration and fetch papers on AI in HPC using arxiv-mcp."
```
**Tips**: Combine with analysis-expert for citation network visualization.

## Multi-Persona Chain Example

**Scenario**: Full pipeline: extract → analyze → optimize.

```bash
warpio --persona data-expert \
  --task "Extract from large.h5 using hdf5-mcp" \
  --non-interactive \
  --context-file step1.msgpack

warpio --persona analysis-expert \
  --context-from step1.msgpack \
  --task "Analyze extracted data with pandas-mcp" \
  --non-interactive \
  --context-file step2.msgpack

warpio --persona hpc-expert \
  --context-from step2.msgpack \
  --task "Scale analysis to cluster with slurm-mcp"
```

**Tips**: Use --handover-timeout for long-running tasks. Chain in scripts for automation. Monitor with jarvis-mcp. 
