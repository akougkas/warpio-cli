/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WarpioReasoningRegistry,
  ReasoningCapability,
} from './modelCapabilities.js';

export interface ThinkingToken {
  type: 'thinking' | 'content';
  text: string;
  metadata?: {
    subject?: string; // Extracted subject for UI
    level?: string; // thinking intensity
    tokens?: number; // Token count
  };
}

export interface ThinkingProcessorOptions {
  timeoutMs?: number; // Timeout for processing to prevent hanging
  maxThinkingTokens?: number; // Maximum thinking tokens before truncation
  enableDebug?: boolean; // Debug logging
}

export class WarpioThinkingProcessor {
  private capability: ReasoningCapability;
  private buffer = '';
  private thinkingBuffer = '';
  private state: 'idle' | 'thinking' | 'content' = 'idle';
  private options: ThinkingProcessorOptions;
  private thinkingTokenCount = 0;

  constructor(modelId: string, options: ThinkingProcessorOptions = {}) {
    const capability = WarpioReasoningRegistry.getCapability(modelId);
    this.capability = capability ?? {
      supportsThinking: false,
      thinkingType: 'none',
      provider: 'ollama',
      streamSeparation: false,
    };

    this.options = {
      timeoutMs: options.timeoutMs ?? 30000, // 30s default timeout
      maxThinkingTokens: options.maxThinkingTokens ?? 8192,
      enableDebug: options.enableDebug ?? false,
      ...options,
    };
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

    // Set up timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Thinking processor timeout after ${this.options.timeoutMs}ms`,
          ),
        );
      }, this.options.timeoutMs);
    });

    try {
      // Race between stream processing and timeout
      yield* await Promise.race([
        this.processStreamInternal(stream),
        timeoutPromise,
      ]);
    } catch (error) {
      if (this.options.enableDebug) {
        console.error('WarpioThinkingProcessor error:', error);
      }

      // If timeout or error, flush buffer and continue
      if (this.buffer) {
        yield { type: 'content', text: this.buffer };
        this.buffer = '';
      }

      // Don't rethrow - gracefully continue with remaining stream
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn(
          'Thinking processor timed out, continuing with normal stream processing',
        );
      }
    }
  }

  private async *processStreamInternal(
    stream: AsyncIterable<string>,
  ): AsyncGenerator<ThinkingToken> {
    for await (const chunk of stream) {
      this.buffer += chunk;

      // Try to extract thinking tokens
      const tokens = this.extractTokens();
      for (const token of tokens) {
        // Check thinking token limits
        if (token.type === 'thinking') {
          this.thinkingTokenCount += token.metadata?.tokens ?? 0;
          if (this.thinkingTokenCount > this.options.maxThinkingTokens!) {
            if (this.options.enableDebug) {
              console.warn(
                `Thinking tokens exceeded limit (${this.thinkingTokenCount} > ${this.options.maxThinkingTokens}), truncating`,
              );
            }
            // Convert to content to prevent infinite thinking
            token.type = 'content';
          }
        }
        yield token;
      }
    }

    // Flush remaining buffer
    if (this.buffer) {
      yield { type: 'content', text: this.buffer };
      this.buffer = '';
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
        const beforeThinking = this.buffer.substring(0, match.index!);
        if (beforeThinking) {
          tokens.push({ type: 'content', text: beforeThinking });
        }

        // Extract thinking token
        const thinkingText = match[0];
        const subject = this.extractSubject(thinkingText);
        const tokenCount = Math.ceil(thinkingText.length / 4); // Approximate token count

        tokens.push({
          type: 'thinking',
          text: thinkingText,
          metadata: {
            subject,
            level: this.capability.thinkingLevel ?? 'medium',
            tokens: tokenCount,
          },
        });

        if (this.options.enableDebug) {
          console.log(
            `Extracted thinking token: ${subject} (${tokenCount} tokens)`,
          );
        }

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
    const lines = thinkingText.split('\n').filter((line) => line.trim());
    const firstContentLine = lines.find(
      (line) =>
        !line.match(/^<[^>]*>/) && // Skip opening tags
        !line.match(/^\[.*?\]/) && // Skip bracketed markers
        line.trim().length > 0,
    );

    let subject = firstContentLine?.replace(/<.*?>|\[.*?\]/g, '').trim() || '';

    // Fallback to first line if no content found
    if (!subject && lines.length > 0) {
      subject = lines[0].replace(/<.*?>|\[.*?\]/g, '').trim();
    }

    // Default fallback
    if (!subject) {
      subject = 'Processing...';
    }

    // Truncate if too long
    if (subject.length > 50) {
      return subject.substring(0, 47) + '...';
    }

    return subject;
  }

  private mightContainThinking(): boolean {
    // Check if buffer might be incomplete thinking token
    const patterns = ['<think', '<thinking', '[REASON', 'Let me think'];
    return patterns.some((p) =>
      this.buffer.toLowerCase().includes(p.toLowerCase()),
    );
  }

  // Utility methods for integration
  getCapability(): ReasoningCapability {
    return this.capability;
  }

  getThinkingTokenCount(): number {
    return this.thinkingTokenCount;
  }

  reset(): void {
    this.buffer = '';
    this.thinkingBuffer = '';
    this.state = 'idle';
    this.thinkingTokenCount = 0;
  }

  // Static utility for quick checks
  static isThinkingSupported(modelId: string): boolean {
    return WarpioReasoningRegistry.isThinkingSupported(modelId);
  }

  static getThinkingType(modelId: string): 'native' | 'pattern-based' | 'none' {
    return WarpioReasoningRegistry.getThinkingType(modelId);
  }
}
