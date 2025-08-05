# Warpio Personas Documentation

Warpio's persona system enables specialized AI experts based on IOWarp's agent architecture. Launch with `warpio --persona <name>`.

## Available Personas

### data-expert
**Description**: Expert in scientific data formats and I/O operations. Use for HDF5, ADIOS, Parquet, compression, and format conversions.

**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task

**Usage Example**: `warpio --persona data-expert -p "Optimize chunking for this HDF5 file"`

**Expertise Highlights**:
- HDF5 group organization and parallel I/O
- ADIOS streaming and in-situ processing
- I/O optimization for parallel filesystems

### analysis-expert
**Description**: Data analysis and visualization specialist. Use for statistical analysis, data exploration, plotting, and transformations with pandas.

**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task, WebSearch

**Usage Example**: `warpio --persona analysis-expert -p "Perform PCA on dataset.csv and plot results"`

**Expertise Highlights**:
- Statistical testing and regression
- Matplotlib/Seaborn visualizations
- Machine learning pipelines with scikit-learn

### hpc-expert
**Description**: High-performance computing optimization specialist. Use for SLURM jobs, MPI programming, profiling, and scaling applications.

**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task

**Usage Example**: `warpio --persona hpc-expert -p "Profile and optimize this MPI code"`

**Expertise Highlights**:
- SLURM resource allocation
- MPI collective operations
- Performance analysis with VTune/Darshan

### research-expert
**Description**: Research documentation and workflow specialist. Use for paper writing, LaTeX, literature management, and reproducible research.

**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task, WebSearch

**Usage Example**: `warpio --persona research-expert -p "Generate BibTeX entries from DOI list"`

**Expertise Highlights**:
- Scientific writing structure
- LaTeX typesetting and bibliography
- Literature review methodologies

### workflow-expert
**Description**: Scientific workflow orchestration specialist. Use for pipelines with Snakemake/Nextflow and computational experiment management.

**Tools**: Bash, Read, Write, Edit, Grep, Glob, LS, Task

**Usage Example**: `warpio --persona workflow-expert -p "Design Nextflow pipeline for data processing"`

**Expertise Highlights**:
- Rule-based workflows in Snakemake
- Container integration with Docker/Singularity
- Scalability and resource management

## Persona Management
- List: `warpio --list-personas`
- Help: `warpio --persona-help <name>`
- Handover: Use `handover_to_persona` tool for multi-agent workflows 
