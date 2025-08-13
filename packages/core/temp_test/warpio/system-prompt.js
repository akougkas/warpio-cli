/**
 * Warpio System Prompt Integration
 * Clean replacement for persona prompt injection in prompts.ts
 */
import { WarpioPersonaManager } from './manager.js';
export function enhanceSystemPromptWithPersona(basePrompt) {
    const manager = WarpioPersonaManager.getInstance();
    return manager.enhanceSystemPrompt(basePrompt);
}
export function isWarpioPersonaActive() {
    const manager = WarpioPersonaManager.getInstance();
    return manager.getActivePersona() !== null;
}
