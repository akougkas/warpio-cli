/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Built-in Warpio Personas
 * Clean separation from old persona-manager.ts
 */

import { WarpioPersonaDefinition } from '../types.js';

// Import individual persona definitions
import { warpioDefaultPersona } from './warpio-default.js';
import { configTestPersona } from './config-test.js';

export function getBuiltInPersonas(): WarpioPersonaDefinition[] {
  return [warpioDefaultPersona, configTestPersona];
}

export {
  warpioDefaultPersona,
  configTestPersona,
  // Keep old export for backwards compatibility
  configTestPersona as lmstudioTestPersona,
};
