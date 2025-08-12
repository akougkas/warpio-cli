# Warpio Thinking/Reasoning Model Architecture

## Overview

This document defines a comprehensive architecture for supporting thinking/reasoning models in Warpio CLI, with a focus on local model providers (Ollama, LM Studio) while maintaining upstream compatibility with Google's Gemini CLI.

## Current State Analysis

### Gemini CLI Thinking Support

- **Detection**: `isThinkingSupported()` checks for `gemini-2.5+` models
- **Configuration**: `thinkingConfig` with `thinkingBudget` and `includeThoughts` options
- **Stream Processing**: Separates thinking tokens (`thought` parts) from response content
- **UI Display**: Shows thinking subject in LoadingIndicator component
- **Event System**: `GeminiEventType.Thought` events with `ThoughtSummary` data

### Local Model Provider Analysis

#### Ollama Provider (Full Native Support ✅)

- **Native API Support**: Full `think` parameter in official SDK
- **Configuration Options**: boolean | "high" | "medium" | "low"
- **Stream Processing**: Works with both `chat()` and `generate()` methods
- **Automatic Detection**: Can identify reasoning models (e.g., gpt-oss:20b) and auto-configure
- **Token Handling**: Stream includes all content including thinking tokens
- **Implementation**: Straightforward via native SDK parameters

#### LM Studio Provider (No Native Support ❌)

- **No API Support**: SDK and API have NO thinking token configuration
- **Pattern Detection Required**: Must rely purely on stream content analysis
- **Manual Processing**: WarpioThinkingProcessor must detect patterns
- **Complex Implementation**: More sophisticated pattern matching needed
- **Future Compatibility**: OpenAI-compatible endpoints will likely follow this pattern

#### Current Issues

- **GPT-OSS:20b**: Hangs on complex prompts (reasoning model generating thinking tokens)
- **LocalModelClient**: Streams all content directly without separation
- **No UI Feedback**: Users don't see thinking process for local models
- **Provider Differences**: Need different strategies for Ollama vs LM Studio

## Architecture Design

### 1. Model Capability Registry

```typescript
// packages/core/src/reasoning/modelCapabilities.ts

export interface ReasoningCapability {
  supportsThinking: boolean;
  thinkingType: 'native' | 'pattern-based' | 'none';
  provider: 'ollama' | 'lm-studio' | 'gemini' | 'openai-compatible';
  thinkingLevel?: 'low' | 'medium' | 'high';
  thinkingPatterns?: RegExp[]; // Required for pattern-based providers
  defaultBudget?: number;
  streamSeparation: boolean; // Can separate thinking from response
  nativeApiSupport?: boolean; // Provider has native thinking API
}

export class WarpioReasoningRegistry {
  private static capabilities = new Map<string, ReasoningCapability>();

  static {
    // Ollama reasoning models (Native API support)
    this.register('ollama:gpt-oss:20b', {
      supportsThinking: true,
      thinkingType: 'native',
      provider: 'ollama',
      thinkingLevel: 'high', // Use 'high' for reasoning models
      nativeApiSupport: true,
      thinkingPatterns: [
        /^<thinking>.*?<\/thinking>/s,
        /^\[REASONING\].*?\[\/REASONING\]/s,
        /^Let me think.*?(?=\n\n)/s,
      ],
      defaultBudget: 8192,
      streamSeparation: true,
    });

    this.register('ollama:deepseek-r1:*', {
      supportsThinking: true,
      thinkingType: 'native',
      provider: 'ollama',
      thinkingLevel: 'high',
      nativeApiSupport: true,
      thinkingPatterns: [/^<think>.*?<\/think>/s],
      defaultBudget: 16384,
      streamSeparation: true,
    });

    // LM Studio models (Pattern-based detection only)
    this.register('lm-studio:gpt-oss:*', {
      supportsThinking: true,
      thinkingType: 'pattern-based',
      provider: 'lm-studio',
      nativeApiSupport: false,
      thinkingPatterns: [
        /^<thinking>.*?<\/thinking>/s,
        /^\[REASONING\].*?\[\/REASONING\]/s,
        /^Let me think.*?(?=\n\n)/s,
      ],
      defaultBudget: 8192,
      streamSeparation: true,
    });

    this.register('lm-studio:deepseek-r1:*', {
      supportsThinking: true,
      thinkingType: 'pattern-based',
      provider: 'lm-studio',
      nativeApiSupport: false,
      thinkingPatterns: [/^<think>.*?<\/think>/s],
      defaultBudget: 16384,
      streamSeparation: true,
    });

    // Gemini models (upstream compatibility)
    this.register('gemini:gemini-2.5-*', {
      supportsThinking: true,
      thinkingType: 'native',
      provider: 'gemini',
      nativeApiSupport: true,
      streamSeparation: true,
      defaultBudget: -1, // Unlimited
    });
  }

  static register(pattern: string, capability: ReasoningCapability): void {
    this.capabilities.set(pattern, capability);
  }

  static getCapability(modelId: string): ReasoningCapability {
    // Check exact match first
    if (this.capabilities.has(modelId)) {
      return this.capabilities.get(modelId)!;
    }

    // Check patterns
    for (const [pattern, capability] of this.capabilities) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(modelId)) {
        return capability;
      }
    }

    return {
      supportsThinking: false,
      thinkingType: 'none',
      streamSeparation: false,
    };
  }
}
```

### 2. Thinking Stream Processor

```typescript
// packages/core/src/reasoning/thinkingProcessor.ts

export interface ThinkingToken {
  type: 'thinking' | 'content';
  text: string;
  metadata?: {
    subject?: string; // Extracted subject for UI
    level?: string; // thinking intensity
    tokens?: number; // Token count
  };
}

export class WarpioThinkingProcessor {
  private capability: ReasoningCapability;
  private buffer = '';
  private thinkingBuffer = '';
  private state: 'idle' | 'thinking' | 'content' = 'idle';

  constructor(modelId: string) {
    this.capability = WarpioReasoningRegistry.getCapability(modelId);
  }

  async *processStream(
    stream: AsyncIterable<string>,
  ): AsyncGenerator<ThinkingToken> {
    if (!this.capability.streamSeparation) {
      // Pass through for models without thinking separation
      for await (const chunk of stream) {
        yield { type: 'content', text: chunk };
      }
      return;
    }

    for await (const chunk of stream) {
      this.buffer += chunk;

      // Try to extract thinking tokens
      const tokens = this.extractTokens();
      for (const token of tokens) {
        yield token;
      }
    }

    // Flush remaining buffer
    if (this.buffer) {
      yield { type: 'content', text: this.buffer };
    }
  }

  private extractTokens(): ThinkingToken[] {
    const tokens: ThinkingToken[] = [];

    if (!this.capability.thinkingPatterns) {
      // No patterns, treat all as content
      const content = this.buffer;
      this.buffer = '';
      if (content) {
        tokens.push({ type: 'content', text: content });
      }
      return tokens;
    }

    // Check for thinking patterns
    for (const pattern of this.capability.thinkingPatterns) {
      const match = this.buffer.match(pattern);
      if (match) {
        // Extract content before thinking
        const beforeThinking = this.buffer.substring(0, match.index);
        if (beforeThinking) {
          tokens.push({ type: 'content', text: beforeThinking });
        }

        // Extract thinking token
        const thinkingText = match[0];
        const subject = this.extractSubject(thinkingText);
        tokens.push({
          type: 'thinking',
          text: thinkingText,
          metadata: {
            subject,
            tokens: thinkingText.length / 4, // Approximate
          },
        });

        // Update buffer with remaining content
        this.buffer = this.buffer.substring(match.index! + match[0].length);

        // Recursively process remaining buffer
        return [...tokens, ...this.extractTokens()];
      }
    }

    // No patterns matched, check if we should wait for more data
    if (this.mightContainThinking()) {
      // Hold buffer for next chunk
      return tokens;
    }

    // Flush as content
    const content = this.buffer;
    this.buffer = '';
    if (content) {
      tokens.push({ type: 'content', text: content });
    }

    return tokens;
  }

  private extractSubject(thinkingText: string): string {
    // Extract a subject line for UI display
    const lines = thinkingText.split('\n');
    const firstLine = lines[0].replace(/<.*?>|\[.*?\]/g, '').trim();

    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...';
    }
    return firstLine || 'Thinking...';
  }

  private mightContainThinking(): boolean {
    // Check if buffer might be incomplete thinking token
    const patterns = ['<think', '[REASON', 'Let me think'];
    return patterns.some((p) => this.buffer.includes(p));
  }
}
```

### 3. Provider-Specific Thinking Strategies

```typescript
// packages/core/src/reasoning/providerStrategies.ts

export interface ThinkingStrategy {
  configureRequest(options: any, capability: ReasoningCapability): void;
  processStream(
    stream: AsyncIterable<string>,
    capability: ReasoningCapability,
  ): AsyncIterable<ThinkingToken>;
}

export class OllamaThinkingStrategy implements ThinkingStrategy {
  configureRequest(options: any, capability: ReasoningCapability): void {
    // Ollama native API support - just set the think parameter
    if (capability.supportsThinking && capability.nativeApiSupport) {
      options.think = capability.thinkingLevel || true;
    }
  }

  async *processStream(
    stream: AsyncIterable<string>,
    capability: ReasoningCapability,
  ): AsyncIterable<ThinkingToken> {
    // Ollama includes thinking in stream, use processor to extract
    const processor = new WarpioThinkingProcessor(capability);
    yield* processor.processStream(stream);
  }
}

export class LMStudioThinkingStrategy implements ThinkingStrategy {
  configureRequest(options: any, capability: ReasoningCapability): void {
    // LM Studio has no native support - rely on pattern detection
    // No special configuration needed
  }

  async *processStream(
    stream: AsyncIterable<string>,
    capability: ReasoningCapability,
  ): AsyncIterable<ThinkingToken> {
    // LM Studio requires pure pattern-based detection
    const processor = new WarpioThinkingProcessor(capability);
    processor.setStrictPatternMode(true); // More aggressive pattern matching
    yield* processor.processStream(stream);
  }
}

export class ThinkingStrategyFactory {
  static getStrategy(provider: string): ThinkingStrategy {
    switch (provider) {
      case 'ollama':
        return new OllamaThinkingStrategy();
      case 'lm-studio':
        return new LMStudioThinkingStrategy();
      case 'gemini':
        return new GeminiThinkingStrategy(); // Existing Gemini handling
      default:
        return new LMStudioThinkingStrategy(); // Pattern-based fallback
    }
  }
}
```

### 4. Enhanced LocalModelClient

```typescript
// packages/core/src/core/localClient.ts (modifications)

import { WarpioReasoningRegistry, WarpioThinkingProcessor } from '../reasoning/index.js';
import { ThinkingStrategyFactory } from '../reasoning/providerStrategies.js';

export class LocalModelClient {
  private reasoningEnabled: boolean;
  private thinkingStrategy: ThinkingStrategy;

  constructor(config: Config, modelConfig: LocalModelConfig) {
    // ... existing code ...

    // Setup thinking support based on provider
    const modelKey = `${modelConfig.provider}:${modelConfig.model}`;
    const capability = WarpioReasoningRegistry.getCapability(modelKey);
    this.reasoningEnabled = capability.supportsThinking;
    this.thinkingStrategy = ThinkingStrategyFactory.getStrategy(modelConfig.provider);
  }

  async generateContentStream(prompt: string): Promise<AsyncIterable<string>> {
    this.conversationHistory.push({ role: 'user', content: prompt });

    // Base options for all providers
    const options: any = {
      temperature: this.config.temperature || 0.7,
      num_predict: this.config.maxTokens || 4096,
    };

    // Provider-specific thinking configuration
    const modelKey = `${this.config.provider}:${this.config.model}`;
    const capability = WarpioReasoningRegistry.getCapability(modelKey);
    this.thinkingStrategy.configureRequest(options, capability);

    const stream = await this.client.chat({
      model: this.config.model,
      messages: this.conversationHistory,
      stream: true,
      options,
    });

    // Process stream through thinking processor
    const processor = new WarpioThinkingProcessor(this.config.model);
    const fullResponse: string[] = [];
    const conversationHistory = this.conversationHistory;

    return {
      async *[Symbol.asyncIterator]() {
        const processedStream = processor.processStream(
          (async function* () {
            for await (const chunk of stream) {
              if (chunk.message.content) {
                yield chunk.message.content;
              }
            }
          })()
        );

        for await (const token of processedStream) {
          if (token.type === 'content') {
            fullResponse.push(token.text);
            yield token.text;
          }
          // Thinking tokens are not yielded to maintain compatibility
          // They will be handled by the enhanced stream processor
        }

        conversationHistory.push({
          role: 'assistant',
          content: fullResponse.join(''),
        });
      },
    };
  }

  async *sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    _prompt_id: string,
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    const prompt = /* ... extract prompt ... */;

    try {
      const stream = await this.generateContentStream(prompt || 'Hello');
      const processor = new WarpioThinkingProcessor(this.config.model);

      // Create enhanced stream that emits both content and thinking events
      const processedStream = processor.processStream(
        (async function* () {
          for await (const chunk of stream) {
            yield chunk;
          }
        })()
      );

      for await (const token of processedStream) {
        if (signal.aborted) break;

        if (token.type === 'thinking') {
          // Emit thinking event for UI
          yield {
            type: GeminiEventType.Thought,
            value: {
              subject: token.metadata?.subject || 'Processing...',
              detail: token.text,
            },
          };
        } else {
          // Emit content event
          yield {
            type: GeminiEventType.Content,
            value: token.text,
          };
        }
      }

      // Return Turn object
      const localChat = new LocalGeminiChat(this, this.config);
      return new Turn(localChat, _prompt_id);
    } catch (error) {
      yield {
        type: GeminiEventType.Error,
        value: { error: { message: error.message } },
      };
      throw error;
    }
  }
}
```

### 4. UI Integration

```typescript
// packages/cli/src/ui/components/WarpioThinkingDisplay.tsx

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { ThoughtSummary } from '@google/gemini-cli-core';

interface WarpioThinkingDisplayProps {
  thought: ThoughtSummary | null;
  provider?: string;
  modelId?: string;
}

export const WarpioThinkingDisplay: React.FC<WarpioThinkingDisplayProps> = ({
  thought,
  provider,
  modelId,
}) => {
  const [thinkingDots, setThinkingDots] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!thought) {
      setThinkingDots('');
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setThinkingDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
      setElapsedTime((prev) => prev + 0.5);
    }, 500);

    return () => clearInterval(interval);
  }, [thought]);

  if (!thought) return null;

  const isLocalModel = provider && provider !== 'gemini';
  const icon = isLocalModel ? '🧠' : '✨';

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text color={Colors.AccentPurple}>
          {icon} {thought.subject}
          {thinkingDots}
        </Text>
        {elapsedTime > 2 && (
          <Text color={Colors.Gray}> ({elapsedTime.toFixed(1)}s)</Text>
        )}
      </Box>
      {thought.detail && thought.detail.length < 100 && (
        <Box marginLeft={2}>
          <Text color={Colors.Gray} dimColor>
            {thought.detail}
          </Text>
        </Box>
      )}
    </Box>
  );
};
```

### 5. Configuration & Settings

```typescript
// packages/core/src/config/warpioConfig.ts

export interface WarpioReasoningConfig {
  enabled: boolean;
  showThinking: boolean;
  thinkingVerbosity: 'none' | 'summary' | 'full';
  autoDetect: boolean;
  modelOverrides: Map<string, ReasoningCapability>;
}

export const DEFAULT_REASONING_CONFIG: WarpioReasoningConfig = {
  enabled: true,
  showThinking: true,
  thinkingVerbosity: 'summary',
  autoDetect: true,
  modelOverrides: new Map(),
};

// CLI arguments extension
export interface WarpioCliArgs {
  // ... existing args ...
  thinking?: boolean; // --thinking / --no-thinking
  thinkingVerbosity?: string; // --thinking-verbosity=full
  thinkingBudget?: number; // --thinking-budget=4096
}
```

### 6. Performance Optimizations

```typescript
// packages/core/src/reasoning/thinkingCache.ts

export class WarpioThinkingCache {
  private cache = new Map<string, ThinkingResult>();
  private maxSize = 100;

  async getCachedThinking(
    prompt: string,
    modelId: string,
  ): Promise<ThinkingResult | null> {
    const key = this.generateKey(prompt, modelId);
    return this.cache.get(key) || null;
  }

  async cacheThinking(
    prompt: string,
    modelId: string,
    result: ThinkingResult,
  ): Promise<void> {
    const key = this.generateKey(prompt, modelId);

    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, result);
  }

  private generateKey(prompt: string, modelId: string): string {
    // Create hash of prompt + model for cache key
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(`${modelId}:${prompt}`)
      .digest('hex')
      .substring(0, 16);
  }
}
```

## Implementation Phases (Provider-Prioritized)

### Phase 1: Ollama Native Support (Priority 1 - 2 days)

**Why First**: Easiest implementation with full native API support

1. Create reasoning model registry with Ollama-specific entries
2. Implement OllamaThinkingStrategy with native `think` parameter
3. Test with ollama:gpt-oss:20b model (high thinking level)
4. Verify stream processing and thinking token extraction

### Phase 2: Core Infrastructure (Priority 2 - 2 days)

1. Build WarpioReasoningRegistry with provider detection
2. Implement base WarpioThinkingProcessor
3. Create ThinkingStrategyFactory for provider routing
4. Add model capability auto-detection for Ollama

### Phase 3: LM Studio Pattern Detection (Priority 3 - 3 days)

**More Complex**: Pure pattern-based detection without API support

1. Implement LMStudioThinkingStrategy with strict pattern mode
2. Enhance WarpioThinkingProcessor for sophisticated pattern matching
3. Add buffering logic for incomplete thinking tokens
4. Test with lm-studio:gpt-oss and deepseek models

### Phase 4: UI Enhancement (Priority 4 - 2 days)

1. Create WarpioThinkingDisplay component
2. Add provider-specific thinking indicators (🧠 for local, ✨ for Gemini)
3. Integrate with existing LoadingIndicator
4. Add thinking verbosity controls per provider

### Phase 5: OpenAI-Compatible Support (Priority 5 - 2 days)

**Future-Proofing**: Generic pattern for other providers

1. Create OpenAICompatibleStrategy (similar to LM Studio)
2. Add support for custom API endpoints
3. Test with various OpenAI-compatible servers
4. Document configuration for custom providers

### Phase 6: Testing & Optimization (Priority 6 - 2 days)

1. Create provider-specific test suites
2. Performance testing: Ollama native vs LM Studio patterns
3. Cache implementation for repeated queries
4. Production hardening and error handling

## Testing Strategy

### Unit Tests

```typescript
describe('WarpioReasoningRegistry', () => {
  it('should detect reasoning models correctly', () => {
    expect(
      WarpioReasoningRegistry.getCapability('gpt-oss:20b').supportsThinking,
    ).toBe(true);
    expect(
      WarpioReasoningRegistry.getCapability('llama3:8b').supportsThinking,
    ).toBe(false);
  });
});

describe('WarpioThinkingProcessor', () => {
  it('should separate thinking tokens from content', async () => {
    const processor = new WarpioThinkingProcessor('gpt-oss:20b');
    const stream = async function* () {
      yield '<thinking>Processing request...</thinking>';
      yield 'Here is the answer';
    };

    const tokens = [];
    for await (const token of processor.processStream(stream())) {
      tokens.push(token);
    }

    expect(tokens[0].type).toBe('thinking');
    expect(tokens[1].type).toBe('content');
  });
});
```

### Integration Tests

```typescript
describe('Local Model Thinking Integration', () => {
  it('should handle reasoning models without hanging', async () => {
    const client = new LocalModelClient(config, {
      provider: 'ollama',
      model: 'gpt-oss:20b',
      baseUrl: 'http://localhost:11434',
    });

    const stream = client.generateContentStream('Complex reasoning task...');
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
      if (chunks.length > 100) break; // Prevent hanging
    }

    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

## Success Metrics

1. **No Hanging**: GPT-OSS:20b and other reasoning models work without hanging
2. **Thinking Visibility**: Users can see thinking process in real-time
3. **Performance**: <100ms overhead for thinking separation
4. **Compatibility**: All existing functionality preserved
5. **User Control**: CLI flags to control thinking behavior

## Key Advantages & Competitive Edge

### Market Differentiation

1. **First-to-Market**: First CLI to properly handle thinking tokens across multiple local providers
2. **Provider Expertise**: Unique dual approach - native for Ollama, pattern-based for LM Studio
3. **Zero-Config Experience**: Automatic detection and configuration per provider
4. **Scientific Computing Focus**: Optimized for complex reasoning in HPC/research contexts

### Technical Advantages

#### Ollama Integration (Native)

- **Full API Support**: Leverages native `think` parameter
- **Automatic Optimization**: Detects reasoning models and sets appropriate levels
- **Stream Efficiency**: Native handling means less overhead
- **Future-Proof**: Ready for Ollama's evolving thinking features

#### LM Studio Support (Pattern-Based)

- **No API? No Problem**: Works despite lack of native support
- **Sophisticated Detection**: Advanced pattern matching for thinking tokens
- **Buffered Processing**: Handles incomplete tokens across chunks
- **Fallback Ready**: Same approach works for OpenAI-compatible endpoints

### User Benefits

1. **Visual Feedback**: See what the model is thinking in real-time
2. **Performance Insights**: Understand reasoning complexity through UI indicators
3. **Provider Transparency**: Clear indication of which provider/strategy is active
4. **Configurable Control**: Fine-tune thinking behavior per provider
5. **Upstream Compatible**: All enhancements preserve Gemini CLI compatibility

## Configuration Examples

### Ollama Provider (Native Support)

```bash
# Automatic thinking configuration for reasoning models
npx warpio -m ollama:gpt-oss:20b -p "Complex reasoning task"
# → Automatically uses think="high" parameter

# Override thinking level
npx warpio -m ollama:deepseek-r1 --thinking-level=medium -p "Moderate task"
# → Uses think="medium" in API call

# Disable thinking for speed (even on reasoning models)
npx warpio -m ollama:gpt-oss:20b --no-thinking -p "Simple query"
# → Omits think parameter entirely
```

### LM Studio Provider (Pattern-Based)

```bash
# Pattern detection automatically enabled for known models
npx warpio -m lm-studio:gpt-oss:20b -p "Complex reasoning task"
# → Uses WarpioThinkingProcessor with strict pattern mode

# Verbose output to see detected thinking patterns
npx warpio -m lm-studio:deepseek-r1 --thinking-verbosity=full -p "Debug this"
# → Shows all detected thinking tokens in UI

# Custom pattern configuration
npx warpio -m lm-studio:custom-model --thinking-patterns="<think>,<reasoning>" -p "Test"
# → Adds custom patterns to detection
```

### Cross-Provider Commands

```bash
# Compare providers with same model
npx warpio --compare ollama:gpt-oss:20b lm-studio:gpt-oss:20b -p "Test query"
# → Shows performance difference between native vs pattern-based

# Auto-detect best provider for model
npx warpio --model gpt-oss:20b --auto-provider -p "Complex task"
# → Chooses Ollama if available (native support preferred)
```

## Next Steps

1. Review and approve provider-specific architecture
2. Create feature branch: `warpio/thinking-architecture`
3. **Start with Phase 1**: Ollama native support (easiest win)
4. Test with ollama:gpt-oss:20b model (native thinking)
5. Then tackle LM Studio pattern detection (Phase 3)

---

## Research Summary & Key Findings

### Provider Capabilities Matrix

| Provider              | Native API | Think Parameter                  | Pattern Detection       | Implementation Complexity     |
| --------------------- | ---------- | -------------------------------- | ----------------------- | ----------------------------- |
| **Ollama**            | ✅ Full    | ✅ boolean/"high"/"medium"/"low" | ✅ Optional enhancement | **Low** - Native SDK support  |
| **LM Studio**         | ❌ None    | ❌ Not supported                 | ✅ Required             | **High** - Pure pattern-based |
| **Gemini**            | ✅ Full    | ✅ Built-in                      | ✅ Native               | **Already Done** - Upstream   |
| **OpenAI-Compatible** | ❌ Varies  | ❌ Usually none                  | ✅ Required             | **Medium** - Like LM Studio   |

### Critical Implementation Insights

1. **Ollama Advantage**: Full native `think` parameter support makes implementation straightforward
2. **LM Studio Challenge**: No API support means relying entirely on sophisticated pattern matching
3. **Provider Detection**: Must identify provider to apply correct strategy
4. **Stream Processing**: Different approaches needed - native for Ollama, pattern for LM Studio
5. **User Experience**: Same UI can work for both, but backend strategies differ significantly

### Why This Architecture Wins

- **Dual Strategy Approach**: Leverages native where available, patterns where not
- **Provider-Specific Optimization**: Each provider gets its optimal implementation
- **Future-Proof Design**: Easy to add new providers with either strategy
- **Warpio Brand Value**: First CLI to properly handle thinking across all major local providers
- **Scientific Computing Edge**: Critical for complex reasoning in research/HPC contexts

This architecture provides a comprehensive, provider-aware solution for thinking/reasoning model support in Warpio CLI, positioning it as the premier tool for local AI reasoning workflows.
