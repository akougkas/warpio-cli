/**
 * Built-in Warpio Personas
 * Clean separation from old persona-manager.ts
 */
// Import individual persona definitions
import { warpioDefaultPersona } from './warpio-default.js';
import { lmstudioTestPersona } from './lmstudio-test.js';
// TODO: Import other personas as they are created
// import { dataExpertPersona } from './data-expert.js';
// import { analysisExpertPersona } from './analysis-expert.js';
// import { hpcExpertPersona } from './hpc-expert.js';
// import { researchExpertPersona } from './research-expert.js';
// import { workflowExpertPersona } from './workflow-expert.js';
export function getBuiltInPersonas() {
    return [
        warpioDefaultPersona,
        lmstudioTestPersona,
        // TODO: Add other personas as they are implemented
        // dataExpertPersona,
        // analysisExpertPersona,
        // hpcExpertPersona,
        // researchExpertPersona,
        // workflowExpertPersona,
    ];
}
export { warpioDefaultPersona, lmstudioTestPersona,
// TODO: Export other personas as they are created
// dataExpertPersona,
// analysisExpertPersona,
// hpcExpertPersona,
// researchExpertPersona,
// workflowExpertPersona,
 };
