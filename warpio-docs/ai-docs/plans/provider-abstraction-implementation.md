# Provider Abstraction Implementation Plan

## Executive Summary

Implement a true provider abstraction layer for Warpio CLI that maintains 100% backward compatibility with upstream Gemini CLI while enabling seamless integration with local AI models (LM Studio, Ollama) through OpenAI-compatible endpoints.

## Core Philosophy

Following Qwen's isolation strategy:
- **Zero disruption** to existing Gemini code
- **Transform at boundaries** - maintain Gemini format internally
- **Additive only** - no breaking changes
- **Explicit with smart defaults** - user controls provider selection

## Implementation Strategy

### Phase 1: Provider Abstraction Layer

#### 1.1 Create Provider Interface
```typescript
// packages/core/src/providers/provider.interface.ts
export interface Provider extends ContentGenerator {
  name: string;
  baseUrl: string;
  isAvailable(): Promise<boolean>;
  getFeatures(): ProviderFeatures;
}

export interface ProviderFeatures {
  chat: boolean;
  streaming: boolean;
  vision: boolean;
  tools: boolean;
  embeddings: boolean;
  jsonMode: boolean;
}
```

#### 1.2 Refactor ContentGenerator
```typescript
// packages/core/src/core/contentGenerator.ts
// PRESERVE existing function signature
export async function createContentGenerator(
  contentGeneratorConfig: ContentGeneratorConfig,
  config: Config,
  sessionId: string,
): Promise<ContentGenerator> {
  // Check for provider override
  const provider = config.getProvider();
  
  if (provider && provider !== 'gemini') {
    return ProviderFactory.create(provider, contentGeneratorConfig, config);
  }
  
  // DEFAULT: Original Gemini logic (UNTOUCHED)
  return createGeminiContentGenerator(contentGeneratorConfig, config, sessionId);
}
```

#### 1.3 Provider Factory
```typescript
// packages/core/src/providers/provider.factory.ts
export class ProviderFactory {
  static create(
    providerName: string,
    config: ContentGeneratorConfig,
    appConfig: Config
  ): Provider {
    switch (providerName) {
      case 'lmstudio':
        return new LMStudioProvider(config, appConfig);
      case 'ollama':
        return new OllamaProvider(config, appConfig);
      case 'openai-compatible':
        return new OpenAICompatibleProvider(config, appConfig);
      default:
        // Fallback to Gemini
        return new GeminiProvider(config, appConfig);
    }
  }
}
```

### Phase 2: OpenAI-Compatible Provider Implementation

#### 2.1 Base OpenAI-Compatible Provider
```typescript
// packages/core/src/providers/openai-compatible.provider.ts
export class OpenAICompatibleProvider implements Provider {
  protected transformer = new OpenAIToGeminiTransformer();
  
  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string
  ): Promise<GenerateContentResponse> {
    const openAIRequest = this.transformer.toOpenAIFormat(request);
    const response = await this.callOpenAIEndpoint(openAIRequest);
    return this.transformer.toGeminiFormat(response);
  }
  
  protected async callOpenAIEndpoint(request: OpenAIRequest) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request)
    });
    return response.json();
  }
}
```

#### 2.2 LM Studio Provider (Priority 1)
```typescript
// packages/core/src/providers/lmstudio.provider.ts
export class LMStudioProvider extends OpenAICompatibleProvider {
  name = 'lmstudio';
  
  constructor(config: ContentGeneratorConfig, appConfig: Config) {
    super(config, appConfig);
    this.baseUrl = process.env.LMSTUDIO_HOST || 'http://192.168.86.20:1234/v1';
    this.apiKey = process.env.LMSTUDIO_API_KEY || 'lm-studio';
    this.model = process.env.LMSTUDIO_MODEL || 'gpt-oss-20b';
  }
  
  getFeatures(): ProviderFeatures {
    return {
      chat: true,
      streaming: true,
      vision: false,  // LM Studio vision support varies by model
      tools: true,     // OpenAI-compatible function calling
      embeddings: true,
      jsonMode: true
    };
  }
}
```

#### 2.3 Ollama Provider
```typescript
// packages/core/src/providers/ollama.provider.ts
export class OllamaProvider extends OpenAICompatibleProvider {
  name = 'ollama';
  
  constructor(config: ContentGeneratorConfig, appConfig: Config) {
    super(config, appConfig);
    this.baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.apiKey = process.env.OLLAMA_API_KEY || 'ollama';
    this.model = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
  }
  
  // Use OpenAI-compatible endpoint (not native Ollama API)
  protected async callOpenAIEndpoint(request: OpenAIRequest) {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  }
}
```

### Phase 3: Response Transformation

#### 3.1 Transformer Implementation
```typescript
// packages/core/src/providers/transformers/openai-gemini.transformer.ts
export class OpenAIToGeminiTransformer {
  toGeminiFormat(openAIResponse: OpenAIResponse): GenerateContentResponse {
    return {
      candidates: [{
        content: {
          role: 'model',
          parts: openAIResponse.choices[0].message.content 
            ? [{ text: openAIResponse.choices[0].message.content }]
            : this.transformToolCalls(openAIResponse.choices[0].message.tool_calls)
        },
        finishReason: this.mapFinishReason(openAIResponse.choices[0].finish_reason),
        index: 0,
        safetyRatings: []
      }],
      usageMetadata: {
        promptTokenCount: openAIResponse.usage?.prompt_tokens || 0,
        candidatesTokenCount: openAIResponse.usage?.completion_tokens || 0,
        totalTokenCount: openAIResponse.usage?.total_tokens || 0
      }
    };
  }
  
  toOpenAIFormat(geminiRequest: GenerateContentParameters): OpenAIRequest {
    return {
      model: this.model,
      messages: this.convertContents(geminiRequest.contents),
      temperature: geminiRequest.generationConfig?.temperature,
      max_tokens: geminiRequest.generationConfig?.maxOutputTokens,
      tools: this.convertTools(geminiRequest.tools),
      stream: false
    };
  }
  
  private convertContents(contents: Content[]): OpenAIMessage[] {
    return contents.map(content => ({
      role: content.role === 'user' ? 'user' : 'assistant',
      content: content.parts.map(part => {
        if ('text' in part) return part.text;
        if ('functionCall' in part) return JSON.stringify(part.functionCall);
        return '';
      }).join('\n')
    }));
  }
}
```

### Phase 4: Configuration Management

#### 4.1 Flat Configuration Structure (Keep Simple)
```typescript
// Extend existing Config class minimally
export interface ConfigParameters {
  // ... existing parameters ...
  
  // New provider parameters (flat structure)
  provider?: string;  // 'gemini' | 'lmstudio' | 'ollama'
  providerBaseUrl?: string;
  providerApiKey?: string;
  providerModel?: string;
}
```

#### 4.2 Settings File Support
```json
// ~/.warpio/settings.json
{
  "version": "1.0.0",
  "provider": "lmstudio",
  "providerBaseUrl": "http://192.168.86.20:1234/v1",
  "providerModel": "gpt-oss-20b",
  "fallbackProvider": "gemini",
  "fallbackModel": "gemini-2.0-flash"
}
```

#### 4.3 Environment Variable Priority
```typescript
// Priority order (highest to lowest):
// 1. Command line args: --provider lmstudio
// 2. Environment vars: WARPIO_PROVIDER=lmstudio
// 3. Settings file: ~/.warpio/settings.json
// 4. Default: gemini with gemini-2.0-flash
```

### Phase 5: Fallback Strategy

#### 5.1 Global Fallback with Override
```typescript
// packages/core/src/providers/provider.manager.ts
export class ProviderManager {
  private primaryProvider: Provider;
  private fallbackProvider: Provider;
  
  async execute<T>(
    operation: (provider: Provider) => Promise<T>
  ): Promise<T> {
    try {
      return await operation(this.primaryProvider);
    } catch (error) {
      console.warn(`Primary provider failed: ${error.message}`);
      console.log('Falling back to Gemini...');
      return await operation(this.fallbackProvider);
    }
  }
}
```

### Phase 6: MCP Tool Adaptation

#### 6.1 Provider-Specific Tool Handling
```typescript
// packages/core/src/providers/tool-adapters/lmstudio.adapter.ts
export class LMStudioToolAdapter {
  adaptToolsForProvider(geminiTools: Tool[]): OpenAITool[] {
    return geminiTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }
  
  adaptToolResponseForGemini(openAIResponse: any): any {
    // Convert OpenAI tool call format back to Gemini format
    return {
      functionCall: {
        name: openAIResponse.function.name,
        args: JSON.parse(openAIResponse.function.arguments)
      }
    };
  }
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Create provider interface and factory
- [ ] Refactor contentGenerator (minimal changes)
- [ ] Implement base OpenAICompatibleProvider

### Week 2: LM Studio Integration
- [ ] Implement LMStudioProvider
- [ ] Create OpenAIToGeminiTransformer
- [ ] Test with local LM Studio instance

### Week 3: Configuration & Fallbacks
- [ ] Add provider configuration to Config class
- [ ] Implement settings.json support
- [ ] Create fallback mechanism

### Week 4: Ollama & Polish
- [ ] Implement OllamaProvider
- [ ] Add MCP tool adaptation
- [ ] Update documentation minimally

## Testing Strategy

### Unit Tests
```typescript
// packages/core/test/providers/lmstudio.provider.test.ts
describe('LMStudioProvider', () => {
  it('should transform OpenAI response to Gemini format', async () => {
    const provider = new LMStudioProvider(config, appConfig);
    const response = await provider.generateContent(geminiRequest);
    expect(response).toHaveProperty('candidates');
    expect(response.candidates[0].content.role).toBe('model');
  });
  
  it('should fall back to Gemini on error', async () => {
    // Test fallback mechanism
  });
});
```

### Integration Tests
1. Test LM Studio connection at http://192.168.86.20:1234
2. Test Ollama connection at localhost:11434
3. Test fallback from LM Studio to Gemini
4. Test MCP tools with local providers

## Success Criteria

1. **100% Backward Compatibility**: All existing Gemini CLI functionality works unchanged
2. **Seamless Local Integration**: LM Studio and Ollama work out-of-the-box
3. **Transparent Fallbacks**: Automatic fallback to Gemini on provider failure
4. **Minimal Code Changes**: Following Qwen's isolation philosophy
5. **Simple Configuration**: Flat config structure, environment variables work

## Risk Mitigation

### Risk 1: Breaking Gemini Compatibility
**Mitigation**: All changes are additive, original code paths preserved

### Risk 2: Response Format Mismatch
**Mitigation**: Comprehensive transformer with extensive testing

### Risk 3: Local Model Performance
**Mitigation**: Clear documentation about model requirements and capabilities

### Risk 4: MCP Tool Incompatibility
**Mitigation**: Provider-specific adapters for tool handling

## Future Considerations

1. **OpenRouter Integration** (Phase 2): Universal model access
2. **LiteLLM Integration** (Phase 3): Replace custom transformers
3. **Provider Metrics**: Track performance, cost, success rates
4. **Dynamic Provider Selection**: Choose provider based on task type

## Configuration Examples

### Example 1: LM Studio as Primary
```bash
export WARPIO_PROVIDER=lmstudio
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
export LMSTUDIO_MODEL=gpt-oss-20b
npx warpio "Analyze this dataset"
```

### Example 2: Ollama with Fallback
```bash
export WARPIO_PROVIDER=ollama
export OLLAMA_HOST=http://localhost:11434
export WARPIO_FALLBACK_PROVIDER=gemini
export WARPIO_FALLBACK_MODEL=gemini-2.0-flash
npx warpio "Complex scientific query"
```

### Example 3: Settings File
```json
{
  "provider": "lmstudio",
  "providerBaseUrl": "http://192.168.86.20:1234/v1",
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

## Notes

- Start with LM Studio as it's the simplest OpenAI-compatible case
- Maintain Gemini format internally, transform only at API boundaries
- Keep configuration flat for simplicity
- Explicit provider selection with smart defaults
- No LiteLLM dependency for now (future consideration)
- Minimal documentation changes to SDK files