/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Thinking Content Filter for Local Models
 * 
 * Handles extraction and filtering of thinking content from model responses
 * when using OpenAI-compatible endpoints (LM Studio, Ollama)
 */

export interface ThinkingResponse {
  content: string;
  reasoning?: string;
  hasThinking: boolean;
}

/**
 * Extract thinking content from response with reasoning_content field
 * This is used when LM Studio has "separate reasoning_content" enabled
 */
export function extractReasoningContent(response: any): ThinkingResponse {
  // Check if response has the separated reasoning_content field (LM Studio feature)
  if (response?.choices?.[0]?.message?.reasoning_content) {
    return {
      content: response.choices[0].message.content || '',
      reasoning: response.choices[0].message.reasoning_content,
      hasThinking: true,
    };
  }
  
  // For streaming responses
  if (response?.choices?.[0]?.delta?.reasoning_content) {
    return {
      content: response.choices[0].delta.content || '',
      reasoning: response.choices[0].delta.reasoning_content,
      hasThinking: true,
    };
  }

  // Fallback to parsing thinking tags from content
  const content = response?.choices?.[0]?.message?.content || 
                  response?.choices?.[0]?.delta?.content || '';
  
  return parseThinkingTags(content);
}

/**
 * Parse thinking tags from content when not separated by API
 * Handles <think>...</think> tags used by Qwen models
 */
export function parseThinkingTags(content: string): ThinkingResponse {
  const thinkPattern = /<think>([\s\S]*?)<\/think>/;
  const match = content.match(thinkPattern);
  
  if (match) {
    // Extract thinking content and remove it from the main content
    const reasoning = match[1].trim();
    const cleanContent = content.replace(thinkPattern, '').trim();
    
    return {
      content: cleanContent,
      reasoning,
      hasThinking: true,
    };
  }
  
  return {
    content,
    reasoning: undefined,
    hasThinking: false,
  };
}

/**
 * Check if a model supports thinking based on its name
 */
export function isThinkingModel(modelName: string): boolean {
  const model = modelName.toLowerCase();
  
  return (
    model.includes('thinking') ||
    model.includes('think') ||
    model.includes('reasoning') ||
    model.includes('o1') ||
    model.includes('qwen') || // Qwen models with thinking capability
    model.includes('deepseek') || // DeepSeek models may have thinking
    (model.includes('gpt-oss') && model.includes('20b'))
  );
}

/**
 * Format thinking content for display (optional)
 * Can be used to show thinking in a special format
 */
export function formatThinkingDisplay(response: ThinkingResponse): string {
  if (!response.hasThinking || !response.reasoning) {
    return response.content;
  }
  
  // Option 1: Hide thinking completely (default)
  return response.content;
  
  // Option 2: Show thinking in a collapsed/expandable section
  // return `<details><summary>Thinking process</summary>\n${response.reasoning}\n</details>\n\n${response.content}`;
  
  // Option 3: Show thinking with a visual separator
  // return `💭 Thinking:\n${response.reasoning}\n\n---\n\n${response.content}`;
}

/**
 * Process streaming chunks with thinking detection
 */
export function processStreamingChunk(chunk: any): {
  content: string;
  reasoning?: string;
  isThinking: boolean;
} {
  // Check for separated reasoning in streaming
  if (chunk?.choices?.[0]?.delta?.reasoning_content) {
    return {
      content: chunk.choices[0].delta.content || '',
      reasoning: chunk.choices[0].delta.reasoning_content,
      isThinking: true,
    };
  }
  
  const deltaContent = chunk?.choices?.[0]?.delta?.content || '';
  
  // Check if we're currently in thinking tags
  const isThinking = deltaContent.includes('<think>') || 
                     (deltaContent.includes('</think>') === false && 
                      deltaContent.match(/<think>/));
  
  return {
    content: deltaContent,
    reasoning: undefined,
    isThinking,
  };
}