/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelSkills {
  text: boolean;
  vision: boolean;
  tools: boolean;
  reasoning: boolean;
}

export function detectModelSkills(model: string): ModelSkills {
  const modelLower = model.toLowerCase();
  
  const skills: ModelSkills = {
    text: true, // All models support text
    vision: false,
    tools: false,
    reasoning: false,
  };
  
  // Vision capability detection
  if (
    modelLower.includes('vision') ||
    modelLower.includes('gemini') ||
    modelLower.includes('gpt-4') ||
    modelLower.includes('claude-3')
  ) {
    skills.vision = true;
  }
  
  // Tool calling capability detection
  if (
    modelLower.includes('gemini') ||
    modelLower.includes('gpt-4') ||
    modelLower.includes('gpt-3.5-turbo') ||
    modelLower.includes('claude') ||
    modelLower.includes('qwen') && (modelLower.includes('chat') || modelLower.includes('instruct'))
  ) {
    skills.tools = true;
  }
  
  // Advanced reasoning capability detection
  if (
    modelLower.includes('gemini-1.5-pro') ||
    modelLower.includes('gemini-2.0') ||
    modelLower.includes('gpt-4') ||
    modelLower.includes('claude-3') ||
    modelLower.includes('o1')
  ) {
    skills.reasoning = true;
  }
  
  return skills;
}

export function getSkillIcons(skills: ModelSkills): string[] {
  const icons: string[] = [];
  
  if (skills.text) icons.push('📝');
  if (skills.vision) icons.push('👁️');
  if (skills.tools) icons.push('🔧');
  if (skills.reasoning) icons.push('🧠');
  
  return icons;
}

export function getSkillsDisplay(model: string): string {
  const skills = detectModelSkills(model);
  const icons = getSkillIcons(skills);
  
  return icons.length > 0 ? icons.join('') : '📝';
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