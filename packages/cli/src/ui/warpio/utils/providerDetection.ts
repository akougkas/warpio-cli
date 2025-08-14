/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Simplified provider detection with essential info only
export interface ProviderInfo {
  name: string;
  isLocal: boolean;
  color: string; // Needed for WarpioHeader compatibility
}

// Essential provider info - simplified from complex system
export function getProviderInfo(): ProviderInfo {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  
  const providers: Record<string, ProviderInfo> = {
    gemini: { name: 'Google', isLocal: false, color: '#0D83C9' },
    lmstudio: { name: 'LMStudio', isLocal: true, color: '#3CA84B' },
    ollama: { name: 'Ollama', isLocal: true, color: '#3CA84B' },
    openai: { name: 'OpenAI', isLocal: false, color: '#0D83C9' },
  };
  
  return providers[provider] || { name: provider, isLocal: false, color: '#F47B20' };
}

// Simple model name extraction
export function getModelName(): string {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  
  const modelEnvVars: Record<string, string> = {
    lmstudio: process.env.LMSTUDIO_MODEL || 'local-model',
    ollama: process.env.OLLAMA_MODEL || 'local-model',
    openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    gemini: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  };
  
  return modelEnvVars[provider] || 'unknown';
}

// Minimal context info for compatibility
export function getContextInfo(model: string): { current: number; max: number } {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  const defaults: Record<string, number> = {
    gemini: 1048576,
    openai: 128000,
    lmstudio: 32768,
    ollama: 8192,
  };
  
  return { current: 0, max: defaults[provider] || 8192 };
}
