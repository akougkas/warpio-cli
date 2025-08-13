# Provider Abstraction Implementation Plan

## Executive Summary

Implement a true provider abstraction layer for Warpio CLI that maintains 100% backward compatibility with upstream Gemini CLI while enabling seamless integration with local AI models through OpenAI-compatible endpoints.

**MVP Focus**: Make LM Studio with gpt-oss-20b work completely with Warpio's tool calling, MCP integration, and persona system before generalizing to other providers.

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

#### 2.2 LM Studio Provider (MVP Focus)
```typescript
// packages/core/src/providers/lmstudio.provider.ts
export class LMStudioProvider extends OpenAICompatibleProvider {
  name = 'lmstudio';
  
  constructor(config: ContentGeneratorConfig, appConfig: Config) {
    super(config, appConfig);
    this.baseUrl = process.env.LMSTUDIO_HOST || 'http://192.168.86.20:1234/v1';
    this.apiKey = process.env.LMSTUDIO_API_KEY || 'lm-studio';
    this.model = process.env.LMSTUDIO_MODEL || 'gpt-oss-20b';
    
    // gpt-oss-20b specific optimizations
    this.maxTokens = 131072;
    this.streamingEnabled = true;
    this.toolsEnabled = true;
  }
  
  getFeatures(): ProviderFeatures {
    return {
      chat: true,
      streaming: true,
      vision: false,  // gpt-oss-20b doesn't support vision
      tools: true,    // Critical for Warpio MCP integration
      embeddings: false, // Not needed for MVP
      jsonMode: true  // gpt-oss-20b supports JSON mode
    };
  }
  
  // Add system prompt injection for Warpio context
  protected addSystemContext(messages: OpenAIMessage[]): OpenAIMessage[] {
    const systemPrompt = this.getSystemPrompt();
    return [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
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
  
  private convertTools(geminiTools: Tool[]): OpenAITool[] {
    return geminiTools?.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parametersJsonSchema // Direct mapping from Gemini
      }
    })) || [];
  }
  
  private transformToolCalls(openAIToolCalls: any[]): Part[] {
    return openAIToolCalls?.map(tc => ({
      functionCall: {
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments)
      }
    })) || [];
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

### Phase 5: Simplified Fallback Strategy

#### 5.1 Connection-Based Fallback Only
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
      // Only fallback on connection/availability errors
      if (this.isConnectionError(error)) {
        console.warn('LM Studio unavailable, falling back to Gemini');
        return await operation(this.fallbackProvider);
      }
      // Let other errors bubble up for debugging
      throw error;
    }
  }
  
  private isConnectionError(error: any): boolean {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ENOTFOUND' ||
           error.status === 404 ||
           error.status === 503;
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

## Implementation Timeline (MVP Focus)

### Phase 1: LM Studio MVP (Week 1-2)
- [ ] Create minimal `OpenAICompatibleProvider` base class
- [ ] Implement `LMStudioProvider` specifically for gpt-oss-20b
- [ ] Build `OpenAIToGeminiTransformer` with focus on:
  - [ ] Text messages
  - [ ] Tool schemas (Gemini → OpenAI format)
  - [ ] Tool calls (OpenAI → Gemini format)
- [ ] Test basic chat functionality with LM Studio

### Phase 2: Tool Integration (Week 2-3)
- [ ] Ensure all MCP tools work through OpenAI format
- [ ] Test each Warpio tool (Read, Write, Edit, Bash, etc.)
- [ ] Verify tool responses are properly handled
- [ ] Test complex multi-tool workflows
- [ ] Test persona instructions and system prompts

### Phase 3: Polish & Generalize (Week 3-4)
- [ ] Add streaming support for LM Studio
- [ ] Implement connection-based fallback
- [ ] Add Ollama provider using same base class
- [ ] Document patterns for future providers

## Testing Strategy (MVP Focus)

### Connection & Basic Tests
- **Connection test**: Can we reach LM Studio at http://192.168.86.20:1234?
- **Chat test**: Does basic conversation work with gpt-oss-20b?
- **System prompt test**: Are Warpio instructions properly injected?

### Tool Integration Tests
- **Tool discovery**: Are Warpio tools properly formatted for OpenAI?
- **Tool execution**: Can gpt-oss-20b call tools successfully?
- **Tool response**: Are results properly transformed back to Gemini format?
- **Multi-tool workflows**: Do complex tool chains work?

### Warpio Integration Tests
- **Memory test**: Does context persist across turns?
- **Persona test**: Do persona instructions apply correctly?
- **MCP test**: Do all MCP servers work through the new provider?
- **Fallback test**: Does connection failure trigger Gemini fallback?

### Unit Tests
```typescript
// packages/core/test/providers/lmstudio.provider.test.ts
describe('LMStudioProvider MVP', () => {
  it('should connect to LM Studio', async () => {
    const provider = new LMStudioProvider(config, appConfig);
    expect(await provider.isAvailable()).toBe(true);
  });
  
  it('should transform tool schemas correctly', async () => {
    const geminiTools = [readFileTool, bashTool];
    const openAITools = transformer.convertTools(geminiTools);
    expect(openAITools[0].type).toBe('function');
    expect(openAITools[0].function.name).toBe('read_file');
  });
  
  it('should handle tool calls from gpt-oss-20b', async () => {
    const openAIResponse = { 
      choices: [{ 
        message: { 
          tool_calls: [{ function: { name: 'read_file', arguments: '{"path": "/test"}' } }] 
        } 
      }] 
    };
    const geminiFormat = transformer.toGeminiFormat(openAIResponse);
    expect(geminiFormat.candidates[0].content.parts[0].functionCall.name).toBe('read_file');
  });
});
```

## Success Criteria (MVP)

✅ **LM Studio with gpt-oss-20b can**:
1. **Connect**: Establish connection to http://192.168.86.20:1234
2. **Chat**: Receive and respond to chat messages in Warpio
3. **Tool Discovery**: See available Warpio tools in OpenAI format
4. **Tool Execution**: Call tools successfully (Read, Write, Edit, Bash, etc.)
5. **Tool Processing**: Process tool responses correctly
6. **Context Persistence**: Maintain conversation context across turns
7. **Persona Integration**: Follow persona instructions from Warpio
8. **MCP Integration**: Work with all existing MCP servers
9. **Fallback**: Gracefully fallback to Gemini on connection issues
10. **Backward Compatibility**: All existing Gemini functionality unchanged

✅ **Technical Requirements**:
- 100% isolation in `packages/core/src/providers/`
- Zero modifications to core Gemini files
- Flat configuration structure
- Environment variable configuration

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

### MVP Configuration: LM Studio with gpt-oss-20b
```bash
# Core MVP setup
export WARPIO_PROVIDER=lmstudio
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
export LMSTUDIO_MODEL=gpt-oss-20b

# Optional fallback (connection failure only)
export WARPIO_FALLBACK_PROVIDER=gemini
export WARPIO_FALLBACK_MODEL=gemini-2.0-flash

# Test MVP
npx warpio "Test LM Studio integration"
npx warpio --persona data-expert "Read a file and analyze it"
```

### Future: Ollama Support (After MVP)
```bash
export WARPIO_PROVIDER=ollama
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=gpt-oss:20b
npx warpio "Test Ollama integration"
```

### Future: Settings File Support (After MVP)
```json
{
  "provider": "lmstudio",
  "providerBaseUrl": "http://192.168.86.20:1234/v1",
  "providerModel": "gpt-oss-20b",
  "fallbackProvider": "gemini",
  "fallbackModel": "gemini-2.0-flash"
}
```

## Notes

**MVP Priority**: Make LM Studio + gpt-oss-20b work completely before generalizing

- Focus exclusively on LM Studio integration first
- Ensure all Warpio features work: tools, personas, MCP, memory
- Only fallback on connection errors, not response quality
- Transform at API boundaries only - maintain Gemini format internally
- Keep configuration flat and simple
- Zero modifications to core Gemini files
- Build patterns that can be reused for Ollama and other providers

**Success = gpt-oss-20b can do everything Gemini can do in Warpio**