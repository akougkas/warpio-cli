# Model Registry Architecture Design & Analysis

**Generated**: 2025-08-13-10-35-27  
**Type**: Architecture Review & Strategic Design  
**Complexity**: High  
**Risk Level**: Medium - Requires careful integration with existing provider system

## Executive Summary

After comprehensive analysis of Warpio CLI's provider abstraction implementation, I've identified both strengths and critical gaps in the current model configuration approach. The existing two-layer architecture (provider infrastructure + dynamic parameter injection) provides a solid foundation but requires a centralized **ModelRegistry** system for production-ready, reproducible configurations.

**Key Recommendation**: Implement a unified ModelRegistry alongside the existing ProviderRegistry, with model-specific configurations separate from provider infrastructure.

## Current Architecture Analysis

### Strengths of Existing Implementation

1. **Solid Provider Foundation**: Vercel AI SDK integration with `createProviderRegistry` and `createOpenAICompatible`
2. **Working Model-Specific Configs**: `getLMStudioModelConfig()` successfully handles `gpt-oss:20b` vs `qwen3:4b` differences
3. **Tool Schema Adaptation**: Proper OpenAI/LMStudio tool conversion with `jsonSchema()` wrapper vs Zod schema
4. **Fallback System**: Robust error handling with Gemini fallback for connection failures
5. **Environment Override**: Provider selection via `WARPIO_PROVIDER` environment variable

### Critical Gaps Identified

1. **Hardcoded Model Configs**: Model parameters buried in manager methods, not centralized
2. **No Reproducibility**: Model configurations not version-controlled or shareable
3. **Limited Flexibility**: Tool calling formats hardcoded per provider, not per model
4. **Missing Model Discovery**: No central registry of available models across providers
5. **Configuration Duplication**: Same model logic repeated in registry.ts and manager.ts

### Architecture Assessment

**Current State**:

```
Provider Layer (registry.ts) → Model Parameters (manager.ts) → Tool Conversion (manager.ts)
```

**Needed State**:

```
ProviderRegistry → ModelRegistry → ParameterInjection → ToolFormatAdaptation
```

## Detailed ModelRegistry Design

### 1. Core Architecture

```typescript
// New ModelRegistry system alongside existing ProviderRegistry
interface ModelRegistryArchitecture {
  providers: ProviderRegistry; // Existing - infrastructure
  models: ModelRegistry; // NEW - model configurations
  runtime: ModelRuntimeManager; // NEW - active model state
  adapters: ToolFormatAdapters; // NEW - tool calling formats
}
```

### 2. ModelRegistry Interface

```typescript
interface ModelRegistry {
  // Model discovery and metadata
  listAvailableModels(provider?: string): ModelInfo[];
  getModelInfo(modelId: string): ModelInfo | null;

  // Configuration management
  getModelConfig(modelId: string): ModelConfiguration;
  registerModel(modelId: string, config: ModelConfiguration): void;

  // Environment integration
  resolveModelFromEnv(): string;
  validateModelAvailability(modelId: string): Promise<boolean>;
}

interface ModelInfo {
  id: string; // e.g., "lmstudio:gpt-oss-20b"
  provider: string; // "lmstudio", "ollama", "gemini"
  modelName: string; // "gpt-oss-20b"
  displayName: string; // "GPT-OSS 20B (Harmony Format)"
  description: string;
  capabilities: ModelCapabilities;
  status: 'available' | 'unavailable' | 'unknown';
}

interface ModelConfiguration {
  // Generation parameters
  temperature: number;
  maxTokens: number;
  stopTokens: string[];
  topP?: number;
  topK?: number;

  // Tool calling format
  toolFormat:
    | 'openai-json'
    | 'openai-xml'
    | 'gemini-function'
    | 'harmony-special';

  // Special instructions
  systemPromptTemplate?: string;
  responseFormatHints?: string[];

  // Provider-specific settings
  providerSettings: Record<string, any>;
}

interface ModelCapabilities {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsJSON: boolean;
  maxContextLength: number;
  multiModal: boolean;
}
```

### 3. File Structure Design

```
/packages/core/src/models/
├── registry.ts              # ModelRegistry implementation
├── configurations/          # Version-controlled model configs
│   ├── lmstudio/
│   │   ├── gpt-oss-20b.json
│   │   ├── qwen3-4b.json
│   │   └── index.ts
│   ├── ollama/
│   │   ├── gpt-oss-20b.json
│   │   └── index.ts
│   ├── gemini/
│   │   ├── gemini-2.0-flash.json
│   │   └── index.ts
│   └── index.ts             # Central model registry
├── adapters/                # Tool format adapters
│   ├── openai-adapter.ts
│   ├── harmony-adapter.ts
│   ├── gemini-adapter.ts
│   └── index.ts
├── runtime.ts               # Active model state management
└── index.ts                 # Public API
```

### 4. Model Configuration Examples

**`/packages/core/src/models/configurations/lmstudio/gpt-oss-20b.json`**:

```json
{
  "id": "lmstudio:gpt-oss-20b",
  "provider": "lmstudio",
  "modelName": "gpt-oss-20b",
  "displayName": "GPT-OSS 20B (Harmony Format)",
  "description": "20B parameter open-source model with Harmony chat format",
  "capabilities": {
    "supportsTools": true,
    "supportsStreaming": true,
    "supportsJSON": true,
    "maxContextLength": 4096,
    "multiModal": false
  },
  "configuration": {
    "temperature": 1.0,
    "maxTokens": 2048,
    "stopTokens": ["<|endoftext|>", "<|return|>"],
    "topP": 0.95,
    "toolFormat": "openai-json",
    "systemPromptTemplate": "You are a helpful AI assistant. {persona_prompt}",
    "responseFormatHints": [
      "Use clear, technical language",
      "Provide working code examples"
    ],
    "providerSettings": {
      "repeatPenalty": 1.1,
      "presencePenalty": 0.0,
      "frequencyPenalty": 0.0
    }
  }
}
```

**`/packages/core/src/models/configurations/lmstudio/qwen3-4b.json`**:

```json
{
  "id": "lmstudio:qwen3-4b",
  "provider": "lmstudio",
  "modelName": "qwen3-4b",
  "displayName": "Qwen 3 4B (Standard OpenAI)",
  "description": "4B parameter Qwen model with standard OpenAI format",
  "capabilities": {
    "supportsTools": true,
    "supportsStreaming": true,
    "supportsJSON": true,
    "maxContextLength": 8192,
    "multiModal": false
  },
  "configuration": {
    "temperature": 0.7,
    "maxTokens": 2048,
    "stopTokens": ["<|im_end|>", "<|endoftext|>"],
    "topP": 0.9,
    "toolFormat": "openai-json",
    "systemPromptTemplate": "You are a helpful assistant. {persona_prompt}",
    "responseFormatHints": [],
    "providerSettings": {
      "repeatPenalty": 1.0
    }
  }
}
```

### 5. Tool Format Adapters

```typescript
// /packages/core/src/models/adapters/openai-adapter.ts
export class OpenAIToolAdapter {
  adaptGeminiTools(geminiTools: any[]): Record<string, any> {
    const tools: Record<string, any> = {};

    for (const geminiTool of geminiTools) {
      if (geminiTool.functionDeclarations) {
        for (const func of geminiTool.functionDeclarations) {
          const paramSchema = func.parameters || {
            type: 'object',
            properties: {},
          };
          this.ensureObjectTypes(paramSchema);

          tools[func.name] = tool({
            description: func.description || `Tool: ${func.name}`,
            inputSchema: jsonSchema(paramSchema), // Use jsonSchema() for OpenAI
            execute: async (args) => ({ toolCallId: func.name, args }),
          });
        }
      }
    }

    return tools;
  }

  private ensureObjectTypes(schema: any): void {
    // Existing implementation from manager.ts
    if (!schema || typeof schema !== 'object') return;

    if (schema.type && typeof schema.type === 'string') {
      schema.type = schema.type.toLowerCase();
    }

    if (schema.properties && !schema.type) {
      schema.type = 'object';
    }

    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) {
        this.ensureObjectTypes(prop);
      }
    }

    if (schema.items) {
      this.ensureObjectTypes(schema.items);
    }
  }
}

// /packages/core/src/models/adapters/harmony-adapter.ts
export class HarmonyToolAdapter extends OpenAIToolAdapter {
  adaptGeminiTools(geminiTools: any[]): Record<string, any> {
    const baseTools = super.adaptGeminiTools(geminiTools);

    // Add Harmony-specific format modifications
    for (const [toolName, toolDef] of Object.entries(baseTools)) {
      // Harmony models may need special parameter formatting
      const modified = this.addHarmonyFormatting(toolDef);
      baseTools[toolName] = modified;
    }

    return baseTools;
  }

  private addHarmonyFormatting(toolDef: any): any {
    // Add Harmony-specific tool calling format requirements
    return {
      ...toolDef,
      // Harmony-specific metadata or formatting
      harmonyMode: true,
      responseFormat: 'structured',
    };
  }
}
```

### 6. Integration with Existing Architecture

```typescript
// Updated AISDKProviderManager integration
export class AISDKProviderManager implements ContentGenerator {
  private model: LanguageModel;
  private config: ProviderConfig;
  private modelRegistry: ModelRegistry; // NEW
  private activeModelConfig: ModelConfiguration; // NEW
  private toolAdapter: ToolFormatAdapter; // NEW

  constructor(config?: Partial<ProviderConfig>) {
    this.config = { ...parseProviderConfig(), ...config };

    // NEW: Initialize model registry
    this.modelRegistry = ModelRegistry.getInstance();

    // NEW: Resolve model configuration
    const modelId = this.resolveModelId();
    this.activeModelConfig = this.modelRegistry.getModelConfig(modelId);
    this.toolAdapter = this.createToolAdapter(
      this.activeModelConfig.toolFormat,
    );

    this.model = getLanguageModel(this.config);
  }

  private resolveModelId(): string {
    const provider = this.config.provider || 'gemini';
    const model = this.config.model || 'default';
    return `${provider}:${model}`;
  }

  private createToolAdapter(format: string): ToolFormatAdapter {
    switch (format) {
      case 'openai-json':
        return new OpenAIToolAdapter();
      case 'harmony-special':
        return new HarmonyToolAdapter();
      case 'gemini-function':
        return new GeminiToolAdapter();
      default:
        return new OpenAIToolAdapter();
    }
  }

  // Updated generateContent method
  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    try {
      const activeModel = await this.getActiveModel();

      // NEW: Use model registry configuration
      const modelConfig = this.activeModelConfig.configuration;
      const convertedTools = this.toolAdapter.adaptGeminiTools(
        request.config?.tools,
      );

      const genConfig: any = {
        model: activeModel,
        messages: this.convertContentsToMessages(request.contents),
        tools: convertedTools,
        temperature: request.config?.temperature ?? modelConfig.temperature,
        maxOutputTokens:
          request.config?.maxOutputTokens ?? modelConfig.maxTokens,
        stop: modelConfig.stopTokens,
        topP: modelConfig.topP,
        maxRetries: 3,
        system: this.extractSystemMessage(request.config?.systemInstruction),
      };

      // Apply provider-specific settings
      if (modelConfig.providerSettings) {
        Object.assign(genConfig, modelConfig.providerSettings);
      }

      const result = await generateText(genConfig);
      return this.convertToGeminiResponse(result);
    } catch (error) {
      // Existing error handling...
      throw error;
    }
  }
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Files to create:**

- `/packages/core/src/models/registry.ts` - Core ModelRegistry implementation
- `/packages/core/src/models/configurations/index.ts` - Central configuration loader
- `/packages/core/src/models/index.ts` - Public API

**Code changes:**

```typescript
// Create ModelRegistry singleton
export class ModelRegistry {
  private static instance: ModelRegistry;
  private models = new Map<string, ModelInfo>();
  private configurations = new Map<string, ModelConfiguration>();

  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
      ModelRegistry.instance.loadConfigurations();
    }
    return ModelRegistry.instance;
  }

  private loadConfigurations(): void {
    // Load all JSON configs from configurations/ directory
    // Import and register model configurations
  }
}
```

### Phase 2: Model Configurations (Week 1-2)

**Files to create:**

- `/packages/core/src/models/configurations/lmstudio/gpt-oss-20b.json`
- `/packages/core/src/models/configurations/lmstudio/qwen3-4b.json`
- `/packages/core/src/models/configurations/gemini/gemini-2.0-flash.json`
- `/packages/core/src/models/configurations/ollama/gpt-oss-20b.json`

**Migration strategy:**

1. Extract hardcoded configs from `getLMStudioModelConfig()` to JSON files
2. Add comprehensive model metadata and capabilities
3. Create configuration loader with validation

### Phase 3: Tool Format Adapters (Week 2)

**Files to create:**

- `/packages/core/src/models/adapters/openai-adapter.ts`
- `/packages/core/src/models/adapters/harmony-adapter.ts`
- `/packages/core/src/models/adapters/gemini-adapter.ts`

**Code changes:**

- Move tool conversion logic from `manager.ts` to dedicated adapters
- Add model-specific tool calling format support
- Implement adapter factory pattern

### Phase 4: Integration (Week 2-3)

**Files to modify:**

- `/packages/core/src/providers/manager.ts` - Integrate ModelRegistry
- `/packages/core/src/providers/registry.ts` - Add model discovery
- `/packages/core/src/warpio/manager.ts` - Support model-specific persona configs

**Testing strategy:**

- Unit tests for ModelRegistry configuration loading
- Integration tests with existing provider system
- End-to-end testing with gpt-oss:20b and qwen3:4b
- Validation of tool calling format adaptation

### Phase 5: Advanced Features (Week 3-4)

**Features to implement:**

1. **Environment Variable Overrides**: `WARPIO_MODEL_TEMPERATURE=0.9`
2. **Model Auto-Discovery**: Detect available models from LM Studio/Ollama
3. **Performance Profiling**: Track model response times and token usage
4. **Configuration Validation**: JSON schema validation for model configs
5. **Persona-Model Binding**: Persona-specific model preferences

## Success Metrics

- [ ] **Reproducible Configurations**: Model parameters version-controlled and shareable
- [ ] **Tool Calling Quality**: LMStudio tool schema errors resolved with proper format adaptation
- [ ] **Provider Flexibility**: Easy addition of new providers without code changes
- [ ] **Model Discovery**: Automatic detection of available models across providers
- [ ] **Performance Consistency**: Model-specific optimizations improve response quality
- [ ] **Environment Integration**: Override any model parameter via environment variables
- [ ] **Zero Regression**: Existing Gemini and LMStudio functionality preserved

## Risk Assessment & Mitigation

### High Risk: Breaking Existing Functionality

**Mitigation**:

- Implement ModelRegistry as additive feature alongside existing hardcoded configs
- Gradual migration with fallback to current `getLMStudioModelConfig()` method
- Comprehensive integration testing

### Medium Risk: Configuration Complexity

**Mitigation**:

- Start with simple JSON configs for proven models (gpt-oss:20b, qwen3:4b)
- Provide validation and clear error messages
- Document configuration format with examples

### Low Risk: Performance Impact

**Mitigation**:

- Cache model configurations in memory after first load
- Lazy loading of tool adapters
- Profile registry lookup performance

## Architecture Trade-offs

### Chosen: Separate ModelRegistry + ProviderRegistry

**Pros**: Clear separation of concerns, easier testing, flexible model configs
**Cons**: Slightly more complex architecture, additional abstraction layer

### Alternative: Extend ProviderRegistry with Model Configs

**Pros**: Simpler architecture, fewer files
**Cons**: Mixing provider infrastructure with model parameters, harder to maintain

### Alternative: Environment-Only Configuration

**Pros**: Maximum flexibility, no hardcoded configs
**Cons**: No reproducibility, difficult to share configurations, error-prone

## Next Steps

1. **Get Approval**: Review this architecture design with team
2. **Create Foundation**: Implement ModelRegistry core in Phase 1
3. **Migrate Configurations**: Extract existing hardcoded configs to JSON in Phase 2
4. **Test Integration**: Verify LMStudio tool calling works with new system
5. **Add Advanced Features**: Environment overrides and model discovery in Phase 5

## Conclusion

The proposed ModelRegistry system addresses all identified gaps while preserving the strengths of the current provider abstraction. The phased implementation approach ensures minimal disruption to existing functionality while delivering a production-ready, reproducible model configuration system.

The architecture separates concerns cleanly:

- **ProviderRegistry**: Infrastructure and connection management
- **ModelRegistry**: Model-specific parameters and capabilities
- **ToolFormatAdapters**: Model-specific tool calling formats
- **Runtime Management**: Active model state and performance tracking

This design positions Warpio CLI for easy expansion to new providers and models while maintaining the current robust foundation built on Vercel AI SDK.
