/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  getSkillsDisplayDynamic
} from './dynamicCapabilityDetection.js';

export interface ModelSkills {
  text: boolean;
  vision: boolean;
  tools: boolean;
  reasoning: boolean;
}

// Fallback: Simplified model capability detection (for when API calls fail)
export function detectModelSkillsFallback(model: string): ModelSkills {
  const m = model.toLowerCase();
  
  return {
    text: true, // All models support text
    vision: m.includes('vision') || m.includes('gemini') || m.includes('gpt-4'),
    tools: m.includes('gemini') || m.includes('gpt-4') || m.includes('claude'),
    reasoning: m.includes('gemini-2') || m.includes('gpt-4') || m.includes('o1'),
  };
}

// Legacy function for backward compatibility
export function detectModelSkills(model: string): ModelSkills {
  return detectModelSkillsFallback(model);
}

export function getSkillIcons(skills: ModelSkills): string[] {
  const icons: string[] = [];

  if (skills.text) icons.push('📝');
  if (skills.vision) icons.push('👁️');
  if (skills.tools) icons.push('🔧');
  if (skills.reasoning) icons.push('🧠');

  return icons;
}

// Legacy synchronous function - uses fallback detection
export function getSkillsDisplay(model: string): string {
  const skills = detectModelSkillsFallback(model);
  const icons = getSkillIcons(skills);

  return icons.length > 0 ? icons.join('') : '📝';
}

// New async function that uses dynamic API-based detection
export async function getSkillsDisplayAsync(model: string): Promise<string> {
  try {
    return await getSkillsDisplayDynamic(model);
  } catch (error) {
    // Fallback to static detection if dynamic fails
    console.warn('Dynamic capability detection failed, using fallback:', error);
    return getSkillsDisplay(model);
  }
}

export function getModelCapabilityWarning(model: string): string | null {
  const skills = detectModelSkills(model);
  const provider = process.env.WARPIO_PROVIDER || 'gemini';

  if (provider === 'lmstudio' || provider === 'ollama') {
    if (!skills.tools) {
      return 'Tool usage may be limited with this local model';
    }
    if (!skills.vision) {
      return 'Vision capabilities not available with this model';
    }
  }

  return null;
}
