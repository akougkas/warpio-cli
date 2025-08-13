/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Warpio System Prompt Integration
 * Clean replacement for persona prompt injection in prompts.ts
 */

import { WarpioPersonaManager } from './manager.js';

export function enhanceSystemPromptWithPersona(basePrompt: string): string {
  const manager = WarpioPersonaManager.getInstance();
  return manager.enhanceSystemPrompt(basePrompt);
}

export function isWarpioPersonaActive(): boolean {
  const manager = WarpioPersonaManager.getInstance();
  return manager.getActivePersona() !== null;
}
