/**
 * Built-in Warpio Personas
 * Clean separation from old persona-manager.ts
 */

import { WarpioPersonaDefinition } from '../types.js';

// Import individual persona definitions
import { warpioDefaultPersona } from './warpio-default.js';
import { lmstudioTestPersona } from './lmstudio-test.js';

export function getBuiltInPersonas(): WarpioPersonaDefinition[] {
  return [
    warpioDefaultPersona,
    lmstudioTestPersona,
  ];
}

export {
  warpioDefaultPersona,
  lmstudioTestPersona,
};