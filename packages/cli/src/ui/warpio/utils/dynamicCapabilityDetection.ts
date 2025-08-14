/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dynamic Model Capability Detection
 * 
 * Programmatically detects model capabilities by hitting provider APIs
 * instead of relying on hardcoded "known model capabilities"
 */

import process from 'node:process';

export interface DynamicModelCapabilities {
  text: boolean;
  vision: boolean;
  tools: boolean;
  reasoning: boolean;
  codeExecution?: boolean;
  searchGrounding?: boolean;
  error?: string;
}

/**
 * Cache for capability detection to avoid repeated API calls
 */
interface CacheEntry {
  capabilities: DynamicModelCapabilities;
  timestamp: number;
}

const capabilityCache = new Map<string, CacheEntry>();
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour cache

/**
 * Detect capabilities for Google Gemini models using the GenAI API
 */
async function detectGeminiCapabilities(apiKey: string, modelName: string): Promise<DynamicModelCapabilities> {
  try {
    // Use REST API to list models and find the specific model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const models = data.models || [];
    
    // Find the matching model
    const model = models.find((m: unknown) => {
      const modelObj = m as { name?: string; displayName?: string };
      return modelObj.name === `models/${modelName}` || 
             modelObj.name?.endsWith(`/${modelName}`) ||
             modelObj.displayName === modelName;
    });

    if (!model) {
      return {
        text: true, // Default assumption
        vision: false,
        tools: false,
        reasoning: false,
        error: `Model ${modelName} not found in Gemini API`,
      };
    }

    // Extract capabilities from supportedGenerationMethods and other properties
    const supportedMethods = model.supportedGenerationMethods || [];
    const inputTokenLimit = model.inputTokenLimit || 0;
    const _outputTokenLimit = model.outputTokenLimit || 0;
    
    const capabilities: DynamicModelCapabilities = {
      text: supportedMethods.includes('generateContent'),
      vision: model.supportedGenerationMethods?.includes('generateContent') && 
              (model.description?.toLowerCase().includes('vision') || 
               model.displayName?.toLowerCase().includes('vision') ||
               inputTokenLimit > 100000), // High token limit often indicates vision support
      tools: supportedMethods.includes('generateContent') && 
             (model.description?.toLowerCase().includes('function') ||
              model.description?.toLowerCase().includes('tool')),
      reasoning: model.displayName?.includes('2.0') || model.displayName?.includes('2.5') || false,
      codeExecution: model.description?.toLowerCase().includes('code'),
      searchGrounding: model.description?.toLowerCase().includes('search'),
    };

    return capabilities;
  } catch (error) {
    return {
      text: true,
      vision: false,
      tools: false,
      reasoning: false,
      error: `Gemini API error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Detect capabilities for OpenAI models
 */
async function detectOpenAICapabilities(apiKey: string, modelName: string): Promise<DynamicModelCapabilities> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const model = data.data?.find((m: unknown) => {
      const modelObj = m as { id?: string };
      return modelObj.id === modelName;
    });

    if (!model) {
      return {
        text: true,
        vision: false,
        tools: false,
        reasoning: false,
        error: `Model ${modelName} not found in OpenAI API`,
      };
    }

    // OpenAI model capability inference
    const capabilities: DynamicModelCapabilities = {
      text: true,
      vision: modelName.includes('vision') || modelName.includes('gpt-4'),
      tools: modelName.includes('gpt-4') || modelName.includes('gpt-3.5-turbo'),
      reasoning: modelName.includes('o1') || modelName.includes('gpt-4'),
    };

    return capabilities;
  } catch (error) {
    return {
      text: true,
      vision: false,
      tools: false,
      reasoning: false,
      error: `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Detect capabilities for local models (LMStudio, Ollama)
 * These don't have capability APIs, so we make educated guesses
 */
function detectLocalModelCapabilities(modelName: string, provider: string): DynamicModelCapabilities {
  const lowerModel = modelName.toLowerCase();
  
  return {
    text: true, // All local models support text
    vision: lowerModel.includes('vision') || lowerModel.includes('llava') || lowerModel.includes('multimodal'),
    tools: lowerModel.includes('tool') || lowerModel.includes('function') || lowerModel.includes('instruct'),
    reasoning: lowerModel.includes('reasoning') || lowerModel.includes('cot') || lowerModel.includes('think'),
    error: `Local model (${provider}): Using heuristic detection - actual capabilities may vary`,
  };
}

/**
 * Main function to dynamically detect model capabilities
 */
export async function detectModelCapabilitiesDynamic(
  modelName: string, 
  provider: string = 'gemini'
): Promise<DynamicModelCapabilities> {
  const cacheKey = `${provider}:${modelName}`;
  
  // Check cache first
  const cached = capabilityCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
    return cached.capabilities;
  }

  let capabilities: DynamicModelCapabilities;

  try {
    switch (provider.toLowerCase()) {
      case 'gemini':
      case 'google': {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY not found');
        }
        capabilities = await detectGeminiCapabilities(apiKey, modelName);
        break;
      }

      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY not found');
        }
        capabilities = await detectOpenAICapabilities(apiKey, modelName);
        break;
      }

      case 'lmstudio':
      case 'ollama':
        capabilities = detectLocalModelCapabilities(modelName, provider);
        break;

      default:
        capabilities = {
          text: true,
          vision: false,
          tools: false,
          reasoning: false,
          error: `Unknown provider: ${provider}`,
        };
    }

    // Cache the result
    capabilityCache.set(cacheKey, {
      capabilities,
      timestamp: Date.now(),
    });

    return capabilities;
  } catch (error) {
    const fallbackCapabilities: DynamicModelCapabilities = {
      text: true,
      vision: false,
      tools: false,
      reasoning: false,
      error: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
    };

    return fallbackCapabilities;
  }
}

/**
 * Convert dynamic capabilities to skill icons
 */
export function getSkillIconsFromDynamic(capabilities: DynamicModelCapabilities): string[] {
  const icons: string[] = [];

  if (capabilities.text) icons.push('📝');
  if (capabilities.vision) icons.push('👁️');
  if (capabilities.tools) icons.push('🔧');
  if (capabilities.reasoning) icons.push('🧠');
  if (capabilities.codeExecution) icons.push('💻');
  if (capabilities.searchGrounding) icons.push('🔍');

  // Show error indicator if there was an issue
  if (capabilities.error && icons.length === 1) {
    icons.push('⚠️'); // Warning for issues
  }

  return icons;
}

/**
 * Get skill display with dynamic detection
 */
export async function getSkillsDisplayDynamic(model: string): Promise<string> {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  const capabilities = await detectModelCapabilitiesDynamic(model, provider);
  const icons = getSkillIconsFromDynamic(capabilities);
  
  return icons.length > 0 ? icons.join('') : '📝';
}