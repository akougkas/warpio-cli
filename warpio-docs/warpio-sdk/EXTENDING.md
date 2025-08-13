# 🎯 Warpio SDK - Copy-Paste Examples

Ready-to-use code examples for extending Warpio CLI with local AI models and scientific computing features.

## 📦 Table of Contents

1. [Adding LM Studio Provider](#adding-lm-studio-provider)
2. [Adding Ollama Provider](#adding-ollama-provider)
3. [OpenAI-Compatible Provider Base](#openai-compatible-provider-base)
4. [Creating Research Personas](#creating-research-personas)
5. [Provider Configuration](#provider-configuration)
6. [Fallback Patterns](#fallback-patterns)

## 🖥️ Adding LM Studio Provider

LM Studio is the primary local AI provider for Warpio. It runs OpenAI-compatible models locally.

### Step 1: Create the LM Studio Provider

```typescript
// packages/core/src/providers/lmstudio.provider.ts
import { OpenAICompatibleProvider } from './openai-compatible.provider.js';
import { ContentGeneratorConfig } from '../core/contentGenerator.js';

export class LMStudioProvider extends OpenAICompatibleProvider {
  name = 'lmstudio';
  
  constructor(config: ContentGeneratorConfig) {
    super(config);
    // LM Studio default configuration
    this.baseUrl = process.env.LMSTUDIO_HOST || 'http://192.168.86.20:1234/v1';
    this.apiKey = process.env.LMSTUDIO_API_KEY || 'lm-studio';
    this.model = process.env.LMSTUDIO_MODEL || 'gpt-oss-20b';
  }
  
  getFeatures() {
    return {
      chat: true,
      streaming: true,
      vision: false,
      tools: true,
      embeddings: true,
      jsonMode: true
    };
  }
  
  // Optional: Add LM Studio specific optimizations
  protected getRequestOptions() {
    return {
      temperature: parseFloat(process.env.LMSTUDIO_TEMPERATURE || '1.0'),
      top_p: parseFloat(process.env.LMSTUDIO_TOP_P || '1.0'),
      max_tokens: parseInt(process.env.LMSTUDIO_MAX_CONTEXT || '131072')
    };
  }
}
```

### Step 2: Configuration

```bash
# .env file configuration
WARPIO_PROVIDER=lmstudio
LMSTUDIO_HOST=http://192.168.86.20:1234/v1
LMSTUDIO_API_KEY=lm-studio
LMSTUDIO_MODEL=gpt-oss-20b
LMSTUDIO_TEMPERATURE=1.0
LMSTUDIO_MAX_CONTEXT=131072
```

### Step 3: Usage

```bash
# Basic usage
npx warpio "Analyze this scientific dataset"

# With explicit provider
npx warpio --provider lmstudio "Explain quantum entanglement"

# With fallback to Gemini
export WARPIO_FALLBACK_PROVIDER=gemini
export WARPIO_FALLBACK_MODEL=gemini-2.0-flash
npx warpio "Complex query requiring fallback"
```

## 🐳 Adding Ollama Provider

Ollama is another local AI provider that supports OpenAI-compatible endpoints.

```typescript
// packages/core/src/providers/ollama.provider.ts
import { OpenAICompatibleProvider } from './openai-compatible.provider.js';
import { ContentGeneratorConfig } from '../core/contentGenerator.js';

export class OllamaProvider extends OpenAICompatibleProvider {
  name = 'ollama';
  
  constructor(config: ContentGeneratorConfig) {
    super(config);
    // Ollama configuration
    this.baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.apiKey = process.env.OLLAMA_API_KEY || 'ollama';
    this.model = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
  }
  
  // Use OpenAI-compatible endpoint (not native Ollama API)
  protected getEndpoint() {
    return `${this.baseUrl}/v1/chat/completions`;
  }
  
  getFeatures() {
    return {
      chat: true,
      streaming: true,
      vision: true,   // Depends on model
      tools: true,     // OpenAI-compatible
      embeddings: true,
      jsonMode: true
    };
  }
}
```

### Configuration

```bash
# .env configuration for Ollama
WARPIO_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b

# Pull and run model
ollama pull gpt-oss:20b
ollama serve
```

## 🔧 OpenAI-Compatible Provider Base

Base class for all OpenAI-compatible providers (LM Studio, Ollama, etc.):

```typescript
// packages/core/src/providers/openai-compatible.provider.ts
import { ContentGenerator } from '../core/contentGenerator.js';
import { OpenAIToGeminiTransformer } from './transformers/openai-gemini.transformer.js';

export abstract class OpenAICompatibleProvider implements ContentGenerator {
  protected baseUrl: string;
  protected apiKey: string;
  protected model: string;
  protected transformer = new OpenAIToGeminiTransformer();
  
  abstract name: string;
  abstract getFeatures(): ProviderFeatures;
  
  async generateContent(request, userPromptId) {
    // Transform Gemini format to OpenAI format
    const openAIRequest = this.transformer.toOpenAI(request);
    
    // Call OpenAI-compatible endpoint
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(openAIRequest)
    });
    
    if (!response.ok) {
      throw new Error(`Provider error: ${response.statusText}`);
    }
    
    const openAIResponse = await response.json();
    
    // Transform back to Gemini format
    return this.transformer.toGemini(openAIResponse);
  }
  
  async generateContentStream(request, userPromptId) {
    // Similar implementation with streaming support
    const openAIRequest = { ...this.transformer.toOpenAI(request), stream: true };
    // Handle streaming response
  }
}
```

### Response Transformer

```typescript
// packages/core/src/providers/transformers/openai-gemini.transformer.ts
export class OpenAIToGeminiTransformer {
  toOpenAI(geminiRequest) {
    return {
      model: this.model,
      messages: geminiRequest.contents.map(content => ({
        role: content.role === 'user' ? 'user' : 'assistant',
        content: content.parts.map(p => p.text).join('\n')
      })),
      temperature: geminiRequest.generationConfig?.temperature,
      max_tokens: geminiRequest.generationConfig?.maxOutputTokens
    };
  }
  
  toGemini(openAIResponse) {
    return {
      candidates: [{
        content: {
          role: 'model',
          parts: [{ text: openAIResponse.choices[0].message.content }]
        },
        finishReason: openAIResponse.choices[0].finish_reason,
        index: 0
      }],
      usageMetadata: {
        promptTokenCount: openAIResponse.usage?.prompt_tokens || 0,
        candidatesTokenCount: openAIResponse.usage?.completion_tokens || 0,
        totalTokenCount: openAIResponse.usage?.total_tokens || 0
      }
    };
  }
}
```

## 🧬 Creating Research Personas

### Bioinformatics Expert

```markdown
<!-- ~/.warpio/personas/bio-expert.md -->
---
name: bio-expert
description: Expert in bioinformatics, genomics, and computational biology
tools: [biopython, blast, genome-browser, protein-folding]
metadata:
  version: 1.0.0
  author: Research Team
  categories: [biology, genomics, proteins]
---

You are a bioinformatics expert specializing in genomics and computational biology.

## Core Expertise

### Genomic Analysis
- Sequence alignment and assembly
- Variant calling and annotation
- Gene expression analysis
- Phylogenetic analysis

### Protein Analysis
- Structure prediction
- Protein-protein interactions
- Domain identification
- Functional annotation

### Data Processing
- FASTA/FASTQ file handling
- VCF processing
- BAM/SAM manipulation
- BED file operations

## Available Tools

- **biopython**: Biological computation in Python
- **blast**: Sequence similarity search
- **genome-browser**: UCSC Genome Browser integration
- **protein-folding**: AlphaFold predictions

## Workflow Patterns

When analyzing genomic data:
1. Check data quality first
2. Apply appropriate preprocessing
3. Use standard bioinformatics pipelines
4. Validate results with known databases

## Communication Style

- Use standard bioinformatics terminology
- Reference relevant papers (PMID/DOI)
- Provide statistical significance
- Include quality metrics in analyses
```

### Climate Modeling Expert

```markdown
<!-- ~/.warpio/personas/climate-expert.md -->
---
name: climate-expert
description: Expert in climate modeling and atmospheric sciences
tools: [netcdf, climate-data-operators, xarray, weather-api]
metadata:
  version: 1.0.0
  author: Climate Science Team
  categories: [climate, atmosphere, modeling]
---

You are a climate modeling expert specializing in atmospheric sciences.

## Core Expertise

### Climate Modeling
- Global circulation models (GCM)
- Regional climate models (RCM)
- Earth system models (ESM)
- Statistical downscaling

### Data Analysis
- NetCDF/HDF5 data processing
- Time series analysis
- Spatial interpolation
- Trend detection

### Atmospheric Physics
- Radiation balance
- Cloud microphysics
- Boundary layer processes
- Atmospheric chemistry

## Available Tools

- **netcdf**: NetCDF file operations
- **climate-data-operators**: CDO for climate data
- **xarray**: N-dimensional labeled arrays
- **weather-api**: Real-time weather data

## Best Practices

1. Always check data dimensions and units
2. Apply appropriate masks for land/ocean
3. Consider seasonal cycles in analyses
4. Use ensemble means for projections

## Output Standards

- Follow CF conventions for metadata
- Provide uncertainty estimates
- Include data provenance
- Reference CMIP6 when applicable
```

## 🛠️ Adding Custom MCP Tools

```typescript
// packages/core/src/mcp/custom-tool-server.ts
import { MCPServer } from './mcp-server.js';

export class CustomToolServer extends MCPServer {
  constructor() {
    super({
      name: 'custom-tools',
      version: '1.0.0',
      description: 'Custom scientific tools'
    });
    
    this.registerTools();
  }

  private registerTools() {
    // Register a data processing tool
    this.registerTool({
      name: 'process_dataset',
      description: 'Process scientific dataset',
      parameters: {
        type: 'object',
        properties: {
          inputFile: { type: 'string', description: 'Input file path' },
          outputFormat: { 
            type: 'string', 
            enum: ['hdf5', 'netcdf', 'parquet'],
            description: 'Output format'
          },
          operations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Processing operations to apply'
          }
        },
        required: ['inputFile', 'outputFormat']
      },
      handler: async (params) => {
        return await this.processDataset(params);
      }
    });

    // Register a visualization tool
    this.registerTool({
      name: 'create_plot',
      description: 'Create scientific visualization',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'array', description: 'Data to plot' },
          plotType: { 
            type: 'string',
            enum: ['line', 'scatter', 'heatmap', 'contour'],
            description: 'Type of plot'
          },
          title: { type: 'string', description: 'Plot title' },
          outputPath: { type: 'string', description: 'Output file path' }
        },
        required: ['data', 'plotType']
      },
      handler: async (params) => {
        return await this.createPlot(params);
      }
    });
  }

  private async processDataset(params: any) {
    // Implement dataset processing logic
    console.log(`Processing ${params.inputFile} to ${params.outputFormat}`);
    
    // Example processing
    const data = await this.readFile(params.inputFile);
    const processed = this.applyOperations(data, params.operations);
    const output = await this.convertFormat(processed, params.outputFormat);
    
    return {
      success: true,
      outputFile: output.path,
      recordsProcessed: output.count
    };
  }

  private async createPlot(params: any) {
    // Implement plotting logic
    console.log(`Creating ${params.plotType} plot`);
    
    return {
      success: true,
      plotPath: params.outputPath || '/tmp/plot.png',
      plotType: params.plotType
    };
  }
}

// Register the server
export function registerCustomTools() {
  const server = new CustomToolServer();
  server.start();
  return server;
}
```

## ⚙️ Provider Configuration

### Environment Variables

```bash
# Primary provider selection
WARPIO_PROVIDER=lmstudio|ollama|gemini

# LM Studio configuration
LMSTUDIO_HOST=http://192.168.86.20:1234/v1
LMSTUDIO_MODEL=gpt-oss-20b
LMSTUDIO_API_KEY=lm-studio

# Ollama configuration  
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b
OLLAMA_API_KEY=ollama

# Fallback configuration
WARPIO_FALLBACK_PROVIDER=gemini
WARPIO_FALLBACK_MODEL=gemini-2.0-flash
```

### Settings File

```json
// ~/.warpio/settings.json
{
  "version": "1.0.0",
  "provider": "lmstudio",
  "providerModel": "gpt-oss-20b",
  "fallbackProvider": "gemini",
  "fallbackModel": "gemini-2.0-flash",
  "features": {
    "streaming": true,
    "tools": true,
    "jsonMode": true
  }
}
```

### Command Line Arguments

```bash
# Explicit provider selection
npx warpio --provider lmstudio "Your query"

# Override model
npx warpio --provider ollama --model gpt-oss:20b "Your query"
```

## 🔄 Fallback Patterns

### Global Fallback Strategy

```typescript
// packages/core/src/providers/provider.manager.ts
export class ProviderManager {
  async executeWithFallback(operation) {
    const primaryProvider = this.getProvider(process.env.WARPIO_PROVIDER);
    const fallbackProvider = this.getProvider('gemini');
    
    try {
      return await operation(primaryProvider);
    } catch (error) {
      console.warn(`Primary provider failed: ${error.message}`);
      console.log('Falling back to Gemini...');
      return await operation(fallbackProvider);
    }
  }
}
```

### Persona-Specific Fallbacks

```json
// ~/.warpio/personas/data-expert.json
{
  "name": "data-expert",
  "preferredProvider": "lmstudio",
  "fallbackChain": ["ollama", "gemini"],
  "modelOverrides": {
    "lmstudio": "gpt-oss-20b",
    "ollama": "gpt-oss:20b",
    "gemini": "gemini-2.0-flash"
  }
}
```

## 🧪 Testing Provider Integration

### Quick Test Script

```bash
#!/bin/bash
# test-providers.sh

echo "Testing LM Studio connection..."
export WARPIO_PROVIDER=lmstudio
npx warpio "Say 'LM Studio works'" || echo "LM Studio unavailable"

echo "Testing Ollama connection..."
export WARPIO_PROVIDER=ollama
npx warpio "Say 'Ollama works'" || echo "Ollama unavailable"

echo "Testing fallback to Gemini..."
export WARPIO_PROVIDER=invalid
export WARPIO_FALLBACK_PROVIDER=gemini
npx warpio "Say 'Fallback works'" || echo "Fallback failed"
```

### Provider Health Check

```typescript
// test/provider-health.ts
async function checkProviderHealth() {
  const providers = ['lmstudio', 'ollama', 'gemini'];
  
  for (const provider of providers) {
    process.env.WARPIO_PROVIDER = provider;
    try {
      const response = await warpio.test('ping');
      console.log(`✅ ${provider}: Available`);
    } catch (error) {
      console.log(`❌ ${provider}: ${error.message}`);
    }
  }
}
```

## 📝 Quick Reference

```bash
# Provider Selection
export WARPIO_PROVIDER=lmstudio         # Use LM Studio
export WARPIO_PROVIDER=ollama          # Use Ollama
export WARPIO_PROVIDER=gemini          # Use Gemini (default)

# LM Studio Setup
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
export LMSTUDIO_MODEL=gpt-oss-20b

# Ollama Setup
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=gpt-oss:20b

# Fallback Configuration
export WARPIO_FALLBACK_PROVIDER=gemini
export WARPIO_FALLBACK_MODEL=gemini-2.0-flash

# Command Usage
npx warpio "Your query"                        # Use default provider
npx warpio --provider lmstudio "Your query"    # Explicit provider
npx warpio --persona data-expert "Your query"  # With persona

# Development
npm run build          # Build packages
npm run preflight      # Full validation
```

---

*Focus: Local AI integration with OpenAI-compatible endpoints. For architecture details, see ARCHITECTURE.md.*