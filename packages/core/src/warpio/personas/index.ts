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
import { dataExpertPersona } from './data-expert.js';
import { analysisExpertPersona } from './analysis-expert.js';
import { hpcExpertPersona } from './hpc-expert.js';
import { researchExpertPersona } from './research-expert.js';
import { workflowExpertPersona } from './workflow-expert.js';

export function getBuiltInPersonas(): WarpioPersonaDefinition[] {
  return [
    warpioDefaultPersona,
    configTestPersona,
    dataExpertPersona,
    analysisExpertPersona,
    hpcExpertPersona,
    researchExpertPersona,
    workflowExpertPersona,
  ];
}

export {
  warpioDefaultPersona,
  configTestPersona,
  dataExpertPersona,
  analysisExpertPersona,
  hpcExpertPersona,
  researchExpertPersona,
  workflowExpertPersona,
  // Keep old export for backwards compatibility
  configTestPersona as lmstudioTestPersona,
};
