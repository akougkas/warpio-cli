# 🏗️ Warpio CLI Architecture

A technical overview of how Warpio extends Google's Gemini CLI for scientific computing.

## 📐 System Design

### Core Architecture Layers

```
┌─────────────────────────────────────────┐
│         User Interface (CLI)            │
├─────────────────────────────────────────┤
│         Persona Layer                   │  ← Our additions
│    (Research-specific configurations)   │
├─────────────────────────────────────────┤
│       Provider Abstraction              │  ← Our additions  
│   (Gemini, OpenAI, Anthropic, Local)   │
├─────────────────────────────────────────┤
│        Core Gemini Engine               │  ← Google's code
│     (Chat, Tools, Context, Memory)     │
├─────────────────────────────────────────┤
│         MCP Server Layer                │  ← IOWarp integration
│    (Scientific tools & libraries)       │
└─────────────────────────────────────────┘
```

## 🔄 The Fork Strategy

### Preservation Philosophy

We maintain 100% upstream compatibility with Google's Gemini CLI:

```typescript
// These files are SACRED - never modified
packages/core/src/
├── gemini.tsx           // Entry point - untouched
├── geminiChat.ts        // Core chat - untouched
├── core/
│   └── client.ts        // GeminiClient - extended only
```

### Extension Points

All Warpio enhancements live in separate directories:

```typescript
packages/core/src/
├── providers/           // NEW: AI provider adapters
├── personas/            // NEW: Research personas
├── services/            // NEW: Shared services
│   └── contextHandoverService.ts
└── tools/               // Extended: Additional tools
```

## 🔌 Provider Architecture

### How Providers Work

All providers implement the `ContentGenerator` interface and translate to/from Gemini's format:

```typescript
// Core interface all providers must implement
export interface ContentGenerator {
  generateContent(config: GenerateContentConfig): Promise<GenerateContentResponse>;
  generateJson(config: GenerateContentConfig): Promise<any>;
  generateEmbedding(params: EmbedContentParameters): Promise<number[]>;
  sendMessageStream(message: string): AsyncGenerator<ServerGeminiStreamEvent>;
}
```

### Provider Flow

```
User Input → Provider Adapter → AI Service → Response Translation → Gemini Format
     ↓            ↓                  ↓              ↓                    ↓
  "Hello"    OpenAIProvider    OpenAI API    OpenAI Response      Gemini Response
```

### Provider Registration

```typescript
// contentGenerator.ts - Minimal disruption pattern
export async function createContentGenerator(
  config: ContentGeneratorConfig,
  authType: AuthType
): Promise<ContentGenerator> {
  // Check for provider override (additive change only)
  const provider = process.env.WARPIO_PROVIDER || config.provider;
  
  if (provider && provider !== 'gemini') {
    // Delegate to provider factory for non-Gemini providers
    return ProviderFactory.create(provider, config);
  }
  
  // DEFAULT PATH: Original Gemini logic remains untouched
  return createGeminiContentGenerator(config, authType);
}

// Provider factory isolated in separate module
class ProviderFactory {
  static create(provider: string, config: Config): ContentGenerator {
    switch (provider) {
      case 'lmstudio':
        return new LMStudioProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      default:
        // Fallback to Gemini
        return createGeminiContentGenerator(config);
    }
  }
}
```

### Fallback Mechanism

```typescript
// Automatic fallback to Gemini on provider failure
class ProviderWithFallback implements ContentGenerator {
  async generateContent(config: GenerateContentConfig) {
    try {
      // Try primary provider
      return await this.primaryProvider.generateContent(config);
    } catch (error) {
      if (this.shouldFallback(error)) {
        // Fallback to Gemini
        console.warn(`Falling back to Gemini: ${error.message}`);
        return await this.geminiProvider.generateContent(config);
      }
      throw error;
    }
  }
}
```

## 👤 Persona System

### Persona Loading Hierarchy

Personas are loaded from three sources in priority order:

```typescript
class PersonaManager {
  static loadPersona(name: string): PersonaDefinition {
    // 1. Built-in IOWarp personas (highest priority)
    if (IOWARP_PERSONAS[name]) {
      return loadIOWarpPersona(name);
    }
    
    // 2. Project-level personas
    const projectPath = `${PROJECT_ROOT}/.gemini/personas/${name}.md`;
    if (exists(projectPath)) {
      return parsePersonaFile(projectPath);
    }
    
    // 3. User-level personas
    const userPath = `~/.warpio/personas/${name}.md`;
    if (exists(userPath)) {
      return parsePersonaFile(userPath);
    }
    
    return null;
  }
}
```

### Persona Definition Structure

```typescript
interface PersonaDefinition {
  name: string;              // Unique identifier
  description: string;       // Human-readable description
  tools: string[];          // MCP servers to load
  systemPrompt: string;     // AI instruction set
  metadata?: {
    version?: string;       // Semantic version
    author?: string;        // Creator attribution
    categories?: string[];  // Classification tags
  };
}
```

### Persona Initialization Flow

```
Load Persona → Parse Definition → Load MCP Tools → Configure AI → Ready
      ↓              ↓                ↓              ↓           ↓
 "data-expert"   YAML+Markdown    [hdf5,adios]   System Prompt  Active
```

## 🔧 MCP Integration

### MCP Server Loading

Each persona can specify MCP servers that provide specialized tools:

```typescript
// When persona is loaded
const persona = PersonaManager.loadPersona('data-expert');

// MCP servers are automatically initialized
for (const tool of persona.tools) {
  await mcpRegistry.loadServer(tool);
}

// Tools are now available to the AI
// e.g., hdf5_read, adios_write, compress_data
```

### MCP Server Communication

```
AI Request → Tool Call → MCP Server → Scientific Library → Result
     ↓           ↓            ↓              ↓               ↓
"Read HDF5"  hdf5_read   HDF5 MCP      h5py/C lib      Data Array
```

## 📁 File Organization

### Directory Structure

```
warpio-cli/
├── packages/
│   ├── core/                 # Backend engine
│   │   ├── src/
│   │   │   ├── core/        # Gemini core (preserved)
│   │   │   ├── providers/   # AI providers (new)
│   │   │   ├── personas/    # Personas (new)
│   │   │   ├── services/    # Services (new)
│   │   │   ├── tools/       # Tools (extended)
│   │   │   └── mcp/         # MCP integration
│   │   └── package.json
│   └── cli/                  # Terminal UI
│       ├── src/
│       │   ├── commands/    # CLI commands
│       │   ├── components/  # React components
│       │   └── ui/          # Ink UI elements
│       └── package.json
├── docs/                     # Original Gemini docs
├── warpio-docs/             # Warpio documentation
│   └── warpio-sdk/          # SDK documentation
└── .claude/                  # AI development aids
    ├── agents/              # Subagent definitions
    └── devlog.md            # Development history
```

### Import Paths

```typescript
// Always use .js extensions for ES modules
import { PersonaManager } from '../personas/persona-manager.js';
import { ContentGenerator } from '../core/contentGenerator.js';
import { Config } from '../config/config.js';
```

## 🔄 Data Flow

### Request Processing Pipeline

```
1. User Input
   ↓
2. CLI Command Parser
   ↓
3. Persona Selection
   ↓
4. Provider Selection
   ↓
5. Context Building
   ↓
6. AI Generation
   ↓
7. Tool Execution (if needed)
   ↓
8. Response Formatting
   ↓
9. User Output
```

### Context Handover

Personas can transfer context to specialized experts:

```typescript
class ContextHandoverService {
  async handover(
    fromPersona: string,
    toPersona: string,
    context: Context
  ): Promise<void> {
    // 1. Save current context
    const snapshot = await this.createSnapshot(context);
    
    // 2. Load target persona
    const targetPersona = await PersonaManager.loadPersona(toPersona);
    
    // 3. Initialize new session with context
    await this.initializeSession(targetPersona, snapshot);
    
    // 4. Transfer control
    await this.transferControl(targetPersona);
  }
}
```

## 🔐 Configuration Management

### Configuration Hierarchy

```typescript
// Configuration sources (in priority order)
1. Command-line arguments     // --model, --provider
2. Environment variables       // WARPIO_MODEL, GEMINI_API_KEY
3. Project config             // .warpio/config.json
4. User config                // ~/.warpio/config.json
5. Default values             // Built-in defaults
```

### Configuration Loading

```typescript
class Config {
  constructor() {
    // Load in reverse priority order
    this.config = {
      ...this.loadDefaults(),
      ...this.loadUserConfig(),
      ...this.loadProjectConfig(),
      ...this.loadEnvVars(),
      ...this.loadCliArgs()
    };
  }
}
```

## 🚀 Performance Optimizations

### Token Compression

```typescript
// Automatic compression for long contexts
if (context.tokenCount > COMPRESSION_THRESHOLD) {
  const compressed = await this.compressContext(context);
  return this.generateWithCompression(compressed);
}
```

### Parallel Tool Execution

```typescript
// Execute independent tools in parallel
const toolCalls = [
  this.readFile('data.hdf5'),
  this.fetchDocs('hdf5-spec'),
  this.analyzeStructure('data.hdf5')
];

const results = await Promise.all(toolCalls);
```

### Caching Strategy

```typescript
// Multi-level caching
class CacheManager {
  // L1: In-memory cache (fast, limited)
  private memoryCache = new Map();
  
  // L2: Disk cache (slower, persistent)
  private diskCache = new DiskCache('~/.warpio/cache');
  
  // L3: Remote cache (optional, shared)
  private remoteCache = new RemoteCache(config.cacheServer);
}
```

## 🔍 Error Handling

### Provider Failure Handling

```typescript
// Graceful degradation on provider failure
try {
  return await provider.generate(request);
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    // Switch to fallback model
    return await this.fallbackModel.generate(request);
  }
  if (error.code === 'PROVIDER_UNAVAILABLE') {
    // Fall back to Gemini
    return await this.geminiClient.generate(request);
  }
  throw error;
}
```

## 🎯 Key Design Principles

1. **Upstream Compatibility**: Never break Google's code
2. **Provider Agnostic**: All providers translate to Gemini format
3. **Graceful Fallback**: Always fall back to Gemini
4. **Modular Extensions**: New features in separate modules
5. **Scientific Focus**: Optimized for research workflows
6. **Performance First**: Parallel execution, caching, compression

## 🔮 Future Architecture Plans

- **Plugin System**: Dynamic loading of provider plugins
- **Distributed Execution**: Multi-node scientific computing
- **Model Routing**: Automatic selection based on task
- **Federation**: Connect multiple Warpio instances
- **Workflow Engine**: DAG-based scientific workflows

---

*This architecture ensures Warpio remains compatible with upstream while providing powerful scientific computing capabilities.*