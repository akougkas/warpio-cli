/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ELIMINATED: UnifiedLocalClient has been replaced by the ModelManager architecture
 * 
 * NEW ARCHITECTURE:
 * - Use ModelManager.parseModel() for model parsing
 * - Use OpenAIAdapter for local model clients (Ollama, LMStudio)
 * - Use GeminiAdapter for Gemini models
 * 
 * MIGRATION:
 * ```typescript
 * // OLD (eliminated):
 * const client = new UnifiedLocalClient(config, provider);
 * 
 * // NEW:
 * const manager = ModelManager.getInstance();
 * const parsed = manager.parseModel("ollama::llama3:8b");
 * const client = await manager.createClient(parsed, config);
 * ```
 * 
 * See:
 * - /core/modelManager.ts - Main entry point
 * - /core/adapters/openaiAdapter.ts - Local model clients
 * - /core/adapters/geminiAdapter.ts - Gemini clients
 */

export class UnifiedLocalClient {
  constructor() {
    throw new Error(
      'UnifiedLocalClient has been eliminated. ' +
      'Use ModelManager.getInstance().createClient() instead. ' +
      'See /core/modelManager.ts for the new unified architecture.'
    );
  }
}