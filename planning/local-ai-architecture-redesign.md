# Implementation Plan: Clean Local AI Architecture for Warpio CLI

## Overview

Complete redesign of local AI support in Warpio CLI, eliminating the complex 4-layer wrapper architecture in favor of a clean, unified OpenAI-compatible approach that maintains full feature parity with Gemini while adding robust tool calling and thinking token support.

## Architecture Analysis

### Current Problems

1. **Complex Wrapper Hierarchy**: LocalModelClient → LocalContentGenerator → LocalGeminiChat → Turn
2. **No Tool Calling**: Both Ollama and LMStudio have no-op `setTools()` methods
3. **Interface Mismatch**: Forcing native SDKs into Gemini response shapes
4. **Duplicated Code**: Separate implementations for Ollama/LMStudio despite OpenAI compatibility

### Key Insight: Universal OpenAI Compatibility

Both Ollama and LMStudio support OpenAI-compatible endpoints:
- **Ollama**: `http://localhost:11434/v1` (OpenAI compatibility layer)
- **LMStudio**: `http://localhost:1234/v1` (native OpenAI-compatible)

This enables a **single unified implementation** using the OpenAI SDK.

## Proposed Architecture

### Core Design: Strategy Pattern with Unified OpenAI Client

```
                    GeminiClient (interface)
                            |
                    UnifiedLocalClient
                   (OpenAI SDK based)
                       /    |    \
                      /     |     \
            OllamaProvider  |  LMStudioProvider
              (config)      |     (config)
                           |
                    OpenAIProvider
                     (future ready)
```

### Class Hierarchy

```typescript
// Core unified client using OpenAI SDK
class UnifiedLocalClient implements GeminiClient {
  private openai: OpenAI;
  private provider: LocalProvider;
  private toolManager: LocalToolManager;
  private thinkingProcessor: WarpioThinkingProcessor;
  
  // Full GeminiClient interface implementation
  sendMessageStream(): AsyncGenerator<ServerGeminiStreamEvent, Turn>
  setTools(tools: Tool[]): Promise<void>
  getChat(): GeminiChat
}

// Provider strategy interface
interface LocalProvider {
  name: string;
  baseUrl: string;
  supportsTools: boolean;
  supportsThinking: boolean;
  configureClient(config: OpenAI.ClientOptions): void;
  transformRequest(messages: Message[]): Message[];
  processStream(stream: Stream): AsyncIterable<ThinkingToken>;
}

// Tool calling manager
class LocalToolManager {
  private tools: Map<string, ToolDefinition>;
  
  setTools(tools: Tool[]): void
  executeToolCall(call: ToolCall): Promise<ToolResult>
  formatToolsForOpenAI(): OpenAI.Tool[]
}
```

## Step-by-Step Implementation

### Step 1: Create Unified Local Client Base

- File: `/packages/core/src/core/unifiedLocalClient.ts`
- Operation: Create new file

```typescript
import OpenAI from 'openai';
import { 
  GeminiClient, 
  Content, 
  Tool,
  PartListUnion 
} from '@google/genai';
import { LocalProvider } from './providers/index.js';
import { LocalToolManager } from './localToolManager.js';
import { WarpioThinkingProcessor } from '../reasoning/thinkingProcessor.js';

export class UnifiedLocalClient implements GeminiClient {
  private openai: OpenAI;
  private provider: LocalProvider;
  private toolManager: LocalToolManager;
  private thinkingProcessor: WarpioThinkingProcessor;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  
  constructor(
    config: Config,
    provider: LocalProvider
  ) {
    this.provider = provider;
    
    // Configure OpenAI client with provider-specific settings
    this.openai = new OpenAI({
      baseURL: provider.baseUrl,
      apiKey: provider.apiKey || 'not-needed',
      ...provider.getClientConfig()
    });
    
    this.toolManager = new LocalToolManager();
    this.thinkingProcessor = new WarpioThinkingProcessor(
      `${provider.name}:${config.model}`,
      { timeoutMs: 30000 }
    );
  }
  
  async *sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    const messages = this.buildMessages(request);
    const tools = this.toolManager.formatToolsForOpenAI();
    
    const stream = await this.openai.chat.completions.create({
      model: this.provider.getModelName(),
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
      signal
    });
    
    // Process stream with thinking detection
    for await (const chunk of this.processStreamWithThinking(stream)) {
      yield chunk;
    }
    
    return new Turn(this.getChat(), prompt_id);
  }
  
  async setTools(tools: Tool[]): Promise<void> {
    if (!this.provider.supportsTools) {
      console.warn(`Provider ${this.provider.name} doesn't support tools`);
      return;
    }
    this.toolManager.setTools(tools);
  }
}
```

### Step 2: Implement Provider Strategy Pattern

- File: `/packages/core/src/core/providers/index.ts`
- Operation: Create new file

```typescript
export interface LocalProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  supportsTools: boolean;
  supportsThinking: boolean;
  
  getClientConfig(): Partial<OpenAI.ClientOptions>;
  getModelName(): string;
  transformMessages(messages: Message[]): Message[];
  configureStreamOptions(options: StreamOptions): void;
}

export class OllamaProvider implements LocalProvider {
  name = 'ollama';
  baseUrl = 'http://localhost:11434/v1';
  supportsTools = true; // Via OpenAI compatibility
  supportsThinking = true; // Native support
  
  constructor(private model: string) {}
  
  getClientConfig() {
    return {
      defaultHeaders: {
        'X-Ollama-Compatibility': 'openai'
      }
    };
  }
  
  transformMessages(messages: Message[]): Message[] {
    // Ollama-specific message transformations if needed
    return messages;
  }
}

export class LMStudioProvider implements LocalProvider {
  name = 'lmstudio';
  baseUrl = 'http://localhost:1234/v1';
  supportsTools = true; // Native OpenAI support
  supportsThinking = false; // Pattern detection only
  
  constructor(private model: string) {}
  
  getClientConfig() {
    return {
      apiKey: 'lm-studio' // LMStudio requires a dummy key
    };
  }
}
```

### Step 3: Implement Robust Tool Calling

- File: `/packages/core/src/core/localToolManager.ts`
- Operation: Create new file

```typescript
import { Tool, FunctionCall } from '@google/genai';
import OpenAI from 'openai';

export class LocalToolManager {
  private tools = new Map<string, ToolDefinition>();
  private pendingCalls = new Map<string, ToolCall>();
  
  setTools(tools: Tool[]): void {
    this.tools.clear();
    for (const tool of tools) {
      const openAITool = this.convertToOpenAITool(tool);
      this.tools.set(tool.name, {
        geminiTool: tool,
        openAITool
      });
    }
  }
  
  formatToolsForOpenAI(): OpenAI.ChatCompletionTool[] {
    return Array.from(this.tools.values()).map(t => t.openAITool);
  }
  
  async handleToolCalls(
    toolCalls: OpenAI.ChatCompletionMessageToolCall[]
  ): Promise<OpenAI.ChatCompletionToolMessageParam[]> {
    const results = [];
    
    for (const call of toolCalls) {
      const tool = this.tools.get(call.function.name);
      if (!tool) {
        results.push({
          role: 'tool' as const,
          tool_call_id: call.id,
          content: `Error: Unknown tool ${call.function.name}`
        });
        continue;
      }
      
      try {
        const args = JSON.parse(call.function.arguments);
        const result = await this.executeToolCall(
          tool.geminiTool,
          args
        );
        
        results.push({
          role: 'tool' as const,
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
      } catch (error) {
        results.push({
          role: 'tool' as const,
          tool_call_id: call.id,
          content: `Error: ${error.message}`
        });
      }
    }
    
    return results;
  }
  
  private convertToOpenAITool(tool: Tool): OpenAI.ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: tool.functionDeclarations[0].name,
        description: tool.functionDeclarations[0].description,
        parameters: this.convertSchema(tool.functionDeclarations[0].parameters)
      }
    };
  }
}
```

### Step 4: Integrate Thinking Token Processing

- File: `/packages/core/src/core/streamProcessors.ts`
- Operation: Create new file

```typescript
import { ServerGeminiStreamEvent, GeminiEventType } from './turn.js';
import { WarpioThinkingProcessor, ThinkingToken } from '../reasoning/index.js';

export class LocalStreamProcessor {
  constructor(
    private thinkingProcessor: WarpioThinkingProcessor,
    private provider: LocalProvider
  ) {}
  
  async *processOpenAIStream(
    stream: AsyncIterable<OpenAI.ChatCompletionChunk>,
    toolManager: LocalToolManager
  ): AsyncIterable<ServerGeminiStreamEvent> {
    let accumulatedContent = '';
    let currentToolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      // Handle content
      if (delta?.content) {
        accumulatedContent += delta.content;
        
        // Process through thinking detector
        const tokens = await this.processThinkingContent(delta.content);
        for (const token of tokens) {
          if (token.type === 'thinking') {
            yield {
              type: GeminiEventType.Thought,
              value: { thought: token.text }
            };
          } else {
            yield {
              type: GeminiEventType.Content,
              value: token.text
            };
          }
        }
      }
      
      // Handle tool calls
      if (delta?.tool_calls) {
        currentToolCalls.push(...delta.tool_calls);
      }
      
      // When stream ends with tool calls, execute them
      if (chunk.choices[0]?.finish_reason === 'tool_calls') {
        yield {
          type: GeminiEventType.ToolCall,
          value: await this.executeToolCalls(currentToolCalls, toolManager)
        };
      }
    }
  }
  
  private async *processThinkingContent(
    content: string
  ): AsyncIterable<ThinkingToken> {
    // Use existing WarpioThinkingProcessor
    const stream = (async function*() { yield content; })();
    yield* this.thinkingProcessor.processStream(stream);
  }
}
```

### Step 5: Create Seamless Chat Integration

- File: `/packages/core/src/core/localGeminiChat.ts`  
- Operation: Replace existing file

```typescript
import { GeminiChat } from './geminiChat.js';
import { UnifiedLocalClient } from './unifiedLocalClient.js';
import { GenerateContentResponse, SendMessageParameters } from '@google/genai';

export class LocalGeminiChat extends GeminiChat {
  constructor(
    private localClient: UnifiedLocalClient,
    config: Config
  ) {
    // Create a proper ContentGenerator that delegates to UnifiedLocalClient
    const contentGenerator = new LocalContentGenerator(localClient);
    super(config, contentGenerator, {}, []);
  }
  
  async sendMessageStream(
    params: SendMessageParameters,
    prompt_id: string
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    // Leverage the unified client's streaming with full tool support
    const stream = this.localClient.streamWithTools(params);
    
    // Convert to GenerateContentResponse format
    return this.convertToGeminiFormat(stream);
  }
  
  private async *convertToGeminiFormat(
    stream: AsyncIterable<LocalStreamResponse>
  ): AsyncGenerator<GenerateContentResponse> {
    for await (const chunk of stream) {
      yield {
        candidates: [{
          content: {
            parts: chunk.content ? [{ text: chunk.content }] : [],
            role: 'model'
          },
          finishReason: chunk.finishReason
        }],
        get text() { return chunk.content; },
        get functionCalls() { return chunk.toolCalls; }
      };
    }
  }
}
```

### Step 6: Implement Model Discovery Service

- File: `/packages/core/src/services/modelDiscoveryService.ts`
- Operation: Enhance existing file

```typescript
export class UnifiedModelDiscoveryService {
  private providers: Map<string, ProviderConfig> = new Map([
    ['ollama', { 
      baseUrl: 'http://localhost:11434',
      healthEndpoint: '/api/tags',
      modelsEndpoint: '/api/tags',
      supportsOpenAI: true,
      openAIEndpoint: '/v1'
    }],
    ['lmstudio', {
      baseUrl: 'http://localhost:1234',
      healthEndpoint: '/v1/models',
      modelsEndpoint: '/v1/models',
      supportsOpenAI: true,
      openAIEndpoint: '/v1'
    }]
  ]);
  
  async discoverAllModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    
    for (const [provider, config] of this.providers) {
      try {
        const discovered = await this.discoverProviderModels(provider, config);
        models.push(...discovered);
      } catch (error) {
        // Provider not available, skip silently
      }
    }
    
    return models;
  }
  
  async getOptimalProvider(modelName: string): Promise<LocalProvider> {
    // Smart provider selection based on model capabilities
    const providers = await this.getAvailableProviders(modelName);
    
    // Prefer providers with native tool support
    const withTools = providers.filter(p => p.supportsTools);
    if (withTools.length > 0) return withTools[0];
    
    // Fallback to any available provider
    return providers[0];
  }
}
```

### Step 7: Wire Everything Together

- File: `/packages/core/src/core/clientFactory.ts`
- Operation: Create new file

```typescript
import { Config } from '../config/config.js';
import { GeminiClient } from './client.js';
import { UnifiedLocalClient } from './unifiedLocalClient.js';
import { UnifiedModelDiscoveryService } from '../services/modelDiscoveryService.js';

export class ClientFactory {
  private static discoveryService = new UnifiedModelDiscoveryService();
  
  static async createClient(config: Config): Promise<GeminiClient> {
    const { model } = config;
    
    // Check if it's a local model
    if (this.isLocalModel(model)) {
      return this.createLocalClient(config);
    }
    
    // Default to Gemini
    return new GeminiClient(config);
  }
  
  private static async createLocalClient(config: Config): Promise<GeminiClient> {
    const provider = await this.discoveryService.getOptimalProvider(config.model);
    
    if (!provider) {
      throw new Error(`No local provider available for model ${config.model}`);
    }
    
    return new UnifiedLocalClient(config, provider);
  }
  
  private static isLocalModel(model: string): boolean {
    // Check if model is available locally
    return model.includes(':') || 
           !model.startsWith('gemini') || 
           !model.startsWith('models/');
  }
}
```

## Testing Strategy

### Phase 1: Unit Tests

```typescript
// test/unit/unifiedLocalClient.test.ts
describe('UnifiedLocalClient', () => {
  it('should handle tool calls correctly', async () => {
    const client = new UnifiedLocalClient(config, new MockProvider());
    await client.setTools([readFileTool, writeFileTool]);
    
    const response = await client.sendMessage('Read file.txt');
    expect(response.toolCalls).toBeDefined();
  });
  
  it('should process thinking tokens', async () => {
    const client = new UnifiedLocalClient(config, new OllamaProvider());
    const events = [];
    
    for await (const event of client.sendMessageStream('Think about this')) {
      events.push(event);
    }
    
    const thoughts = events.filter(e => e.type === GeminiEventType.Thought);
    expect(thoughts.length).toBeGreaterThan(0);
  });
});
```

### Phase 2: Integration Tests

```typescript
// test/e2e/local-parity.test.ts
describe('Local Model Parity with Gemini', () => {
  const testCases = [
    'Simple text generation',
    'Tool calling with file operations',
    'Multi-turn conversation',
    'Thinking model responses'
  ];
  
  for (const testCase of testCases) {
    it(`should handle ${testCase} like Gemini`, async () => {
      const geminiResponse = await geminiClient.test(testCase);
      const localResponse = await localClient.test(testCase);
      
      expect(localResponse.structure).toEqual(geminiResponse.structure);
      expect(localResponse.toolCalls).toEqual(geminiResponse.toolCalls);
    });
  }
});
```

### Phase 3: Provider-Specific Tests

```typescript
// test/providers/ollama.test.ts
describe('Ollama Provider', () => {
  it('should use OpenAI compatibility endpoint', async () => {
    const provider = new OllamaProvider('llama3.3');
    expect(provider.baseUrl).toBe('http://localhost:11434/v1');
  });
  
  it('should handle thinking models correctly', async () => {
    const provider = new OllamaProvider('qwen2.5-coder:32b');
    expect(provider.supportsThinking).toBe(true);
  });
});
```

## Migration Path

### Phase 1: Parallel Implementation (Week 1)
1. Build UnifiedLocalClient alongside existing code
2. Implement core provider strategies
3. Add comprehensive unit tests

### Phase 2: Feature Parity (Week 2)
1. Implement tool calling system
2. Add thinking token processing
3. Integration testing with real models

### Phase 3: Gradual Migration (Week 3)
1. Add feature flag for new implementation
2. A/B test with select users
3. Monitor performance and reliability

### Phase 4: Cleanup (Week 4)
1. Remove old LocalModelClient
2. Remove LMStudioModelClient
3. Update documentation

## Performance Optimizations

### Connection Pooling
```typescript
class ConnectionPool {
  private connections = new Map<string, OpenAI>();
  
  getConnection(provider: LocalProvider): OpenAI {
    const key = `${provider.name}:${provider.baseUrl}`;
    if (!this.connections.has(key)) {
      this.connections.set(key, new OpenAI(provider.getConfig()));
    }
    return this.connections.get(key)!;
  }
}
```

### Response Caching
```typescript
class ResponseCache {
  private cache = new LRU<string, CachedResponse>(100);
  
  async getOrGenerate(
    key: string,
    generator: () => Promise<Response>
  ): Promise<Response> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const response = await generator();
    this.cache.set(key, response);
    return response;
  }
}
```

## Success Criteria

1. **Tool Calling Parity**: Local models match Gemini Flash reliability
2. **Thinking Token Support**: Seamless integration with existing UI
3. **Performance**: <100ms overhead vs direct API calls
4. **Code Reduction**: 50% less code than current implementation
5. **Test Coverage**: >90% coverage on critical paths

## Benefits of This Architecture

### Immediate Benefits
- **Single Implementation**: One codebase for all OpenAI-compatible providers
- **Full Tool Support**: Robust tool calling for all local models
- **Clean Abstractions**: Strategy pattern for provider differences
- **Maintainable**: Clear separation of concerns

### Future Benefits
- **Easy Provider Addition**: Just implement LocalProvider interface
- **OpenAI Ready**: When adding OpenAI support, reuse 90% of code
- **Anthropic Ready**: Same OpenAI-compatible approach works
- **Performance**: Connection pooling and caching built-in

### Architecture Advantages
- **No Wrapper Hell**: Direct, clean class hierarchy
- **Native SDK Usage**: OpenAI SDK handles all complexity
- **Upstream Safe**: All changes isolated in new files
- **Test Friendly**: Every component independently testable

## Implementation Timeline

- **Day 1-2**: Core UnifiedLocalClient and provider strategies
- **Day 3-4**: Tool calling system implementation
- **Day 5-6**: Thinking token integration
- **Day 7-8**: Testing and migration preparation
- **Day 9-10**: Documentation and cleanup

## Risk Mitigation

1. **OpenAI SDK Version**: Lock to stable version, test upgrades carefully
2. **Provider Changes**: Abstract provider-specific logic for easy updates
3. **Performance**: Implement monitoring and fallback mechanisms
4. **Compatibility**: Extensive testing against Gemini behavior

This architecture provides a clean, maintainable, and feature-complete solution for local AI support in Warpio CLI while eliminating all the complexity of the current implementation.