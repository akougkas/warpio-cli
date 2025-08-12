/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ELIMINATED: Old provider classes have been removed.
 * Use ModelManager architecture instead:
 * 
 * - ModelManager.parseModel() for model parsing
 * - GeminiAdapter + OpenAIAdapter for client creation
 * - See /core/modelManager.ts for new implementation
 */

// This file is kept minimal to avoid breaking imports during transition
// The actual provider logic is now in:
// - /core/adapters/geminiAdapter.ts  
// - /core/adapters/openaiAdapter.ts
// - /core/modelManager.ts