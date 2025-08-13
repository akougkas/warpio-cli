# 🚀 Warpio SDK Developer Guide

Welcome to the Warpio SDK! This guide will help you extend Warpio CLI with new AI providers, custom personas, and scientific computing tools.

## 📚 Quick Start

Warpio CLI is a fork of Google's Gemini CLI, enhanced with scientific computing capabilities through the IOWarp ecosystem. We maintain upstream compatibility while adding powerful new features.

## 🏗️ How Things Work

### The Fork Strategy

We carefully wrap Gemini CLI without breaking it:

```typescript
// We NEVER touch these sacred files:
packages/core/src/gemini.tsx      // Original Gemini entry point
packages/core/src/geminiChat.ts   // Core chat logic

// All our enhancements go in:
packages/core/src/providers/      // New AI providers
packages/core/src/personas/       // Research personas
packages/core/src/services/       // Shared services
```

### Persona System

Personas are specialized AI configurations for different research domains:

```typescript
// Built-in personas in persona-manager.ts
const IOWARP_PERSONAS = {
  warpio: 'warpio-default', // General purpose
  'data-expert': 'data-io-expert', // Scientific data I/O
  'analysis-expert': 'analysis-viz', // Data analysis
  'hpc-expert': 'hpc-performance', // HPC optimization
  'research-expert': 'research-doc', // Documentation
  'workflow-expert': 'workflow-orch', // Workflow automation
};
```

### MCP Server Integration

Each persona can load specific MCP (Model Context Protocol) servers:

```yaml
# Persona definition with MCP tools
---
name: data-expert
tools: [adios, hdf5, compression] # MCP servers to load
systemPrompt: Expert in scientific data formats...
---
```

## 🎨 Adding New Features

### 1. Adding a Local AI Provider (LM Studio, Ollama)

Warpio supports OpenAI-compatible endpoints for local models. Following Qwen's isolation philosophy, providers are added without touching Gemini code:

```typescript
// packages/core/src/providers/lmstudio.provider.ts
import { OpenAICompatibleProvider } from './openai-compatible.provider.js';

export class LMStudioProvider extends OpenAICompatibleProvider {
  constructor(config: ContentGeneratorConfig) {
    super(config);
    // Read from environment or use defaults
    this.baseUrl = process.env.LMSTUDIO_HOST || 'http://192.168.86.20:1234/v1';
    this.model = process.env.LMSTUDIO_MODEL || 'gpt-oss-20b';
  }

  // Provider maintains Gemini format internally
  async generateContent(request): Promise<GenerateContentResponse> {
    const openAIFormat = this.transformer.toOpenAI(request);
    const response = await this.callEndpoint(openAIFormat);
    return this.transformer.toGemini(response); // Back to Gemini format
  }
}
```

Configure via environment variables:

```bash
export WARPIO_PROVIDER=lmstudio
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
npx warpio "Your query here"
```

### 2. Creating a Custom Research Persona

Create a persona file in `~/.warpio/personas/`:

```markdown
## <!-- ~/.warpio/personas/quantum-expert.md -->

name: quantum-expert
description: Expert in quantum computing and simulations
tools: [qiskit, quantum-sim, jupyter]
metadata:
version: 1.0.0
author: Your Name
categories: [quantum, simulation, research]

---

You are a quantum computing expert specializing in:

## Core Expertise

- Quantum algorithm development
- Quantum circuit optimization
- Simulation of quantum systems
- Error correction strategies

## Available Tools

- **qiskit**: IBM's quantum computing SDK
- **quantum-sim**: High-performance quantum simulator
- **jupyter**: Interactive notebook environment

## Communication Style

- Use precise quantum computing terminology
- Provide mathematical proofs when relevant
- Include circuit diagrams in explanations
- Reference relevant papers and preprints
```

### 3. Adding Local Model Support (Ollama)

Configure local inference in your environment:

```bash
# Set environment variables
export WARPIO_PROVIDER=ollama
export OLLAMA_HOST=http://localhost:11434
export WARPIO_MODEL=hopephoto/Qwen3-4B-Instruct-2507_q8:latest
```

Update the provider configuration:

```typescript
// packages/core/src/providers/ollama-provider.ts
export class OllamaProvider implements ContentGenerator {
  constructor(private config: ContentGeneratorConfig) {
    this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  }

  async generateContent(
    config: GenerateContentConfig,
  ): Promise<GenerateContentResponse> {
    const response = await fetch(`${this.host}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: this.config.model,
        prompt: this.formatPrompt(config),
        stream: false,
      }),
    });

    return this.formatResponse(response);
  }
}
```

## 🧪 Testing Your Additions

### Testing a New Provider

```bash
# 1. Build the project
npm run build

# 2. Set provider environment
export WARPIO_PROVIDER=openai
export OPENAI_API_KEY=your-key

# 3. Test the provider
npx warpio "Test message"

# 4. Run integration tests
npm run test:providers
```

### Testing a Custom Persona

```bash
# 1. List available personas
npx warpio --list-personas

# 2. Test your persona
npx warpio --persona quantum-expert "Explain Shor's algorithm"

# 3. Verify MCP tools are loaded
npx warpio --persona quantum-expert --debug "Run a quantum simulation"
```

## 📦 Project Structure

```
packages/
├── core/src/
│   ├── core/               # Core Gemini logic (don't modify!)
│   │   ├── client.ts       # GeminiClient class
│   │   └── geminiChat.ts   # Chat implementation
│   ├── providers/          # Your providers go here
│   │   ├── openai-provider.ts
│   │   └── ollama-provider.ts
│   ├── personas/           # Persona management
│   │   └── persona-manager.ts
│   └── services/           # Shared services
│       └── contextHandoverService.ts
└── cli/src/
    └── commands/           # CLI commands
```

## 🛡️ Important Rules

### Never Break These

1. **Package Names**: Keep `@google/gemini-cli-core` and `@google/gemini-cli`
2. **Environment Variables**: Preserve `GEMINI_API_KEY`, `GEMINI_SANDBOX`
3. **Core Classes**: Don't modify `GeminiClient` interface
4. **File Structure**: Keep `gemini.tsx` and `geminiChat.ts` intact

### Safe to Modify

1. **User-Facing Strings**: Rebrand "Gemini CLI" → "Warpio CLI"
2. **Command Names**: Use `warpio` instead of `gemini`
3. **Documentation**: Update help text and guides
4. **Config Files**: Rename `.geminiignore` → `.warpioignore`

## 🚦 Common Patterns

### Provider Fallback

```typescript
// Automatic fallback to Gemini on provider failure
try {
  return await this.customProvider.generateContent(config);
} catch (error) {
  console.warn(`Provider failed, falling back to Gemini: ${error}`);
  return await this.geminiClient.generateContent(config);
}
```

### Persona Handover

```typescript
// Hand over to specialized persona
const handoverTool = {
  name: 'handover_to_persona',
  parameters: {
    targetPersona: 'hpc-expert',
    context: 'User needs help optimizing MPI code',
  },
};
```

### MCP Server Loading

```typescript
// Personas automatically load their MCP servers
const persona = PersonaManager.loadPersona('data-expert');
// MCP servers [adios, hdf5, compression] are now available
```

## 🎯 Next Steps

1. **Browse Examples**: Check `warpio-docs/warpio-sdk/EXTENDING.md` for copy-paste examples
2. **Understand Architecture**: Read `ARCHITECTURE.md` for system design
3. **Join Community**: Contribute your personas and providers back!
4. **Test Everything**: Run `npm run preflight` before committing

## 💡 Pro Tips

- Start with a simple provider that just logs and forwards to Gemini
- Test personas in isolation before adding MCP tools
- Use `--debug` flag to see what's happening under the hood
- Keep provider adapters thin - translate formats, don't add logic
- Personas can hand over to each other for complex workflows

Happy coding! 🚀 Remember: We're building on Google's solid foundation while adding scientific superpowers!
