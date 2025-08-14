/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { Colors } from '../colors.js';
import { theme } from '../semantic-colors.js';
import { type Config } from '@google/gemini-cli-core';
import { WarpioPersonaManager } from '@google/gemini-cli-core';
import { getProviderInfo, getModelName } from './utils/providerDetection.js';
import { getModelCapabilityWarning } from './utils/skillDetection.js';
import { WarpioColorSystem } from './utils/warpioColors.js';

interface WarpioTipsProps {
  config: Config;
}

export const WarpioTips: React.FC<WarpioTipsProps> = ({ config }) => {
  const geminiMdFileCount = config.getGeminiMdFileCount();
  const activePersonaName = config.getActivePersona();
  const activePersona = activePersonaName
    ? WarpioPersonaManager.getInstance().getPersona(activePersonaName)
    : null;

  const providerInfo = getProviderInfo();
  const modelName = getModelName();
  const capabilityWarning = getModelCapabilityWarning(modelName);

  // Get persona-specific info from actual persona definitions
  const getPersonaDisplayInfo = (persona: any) => {
    if (!persona) return null;
    
    const mcpTools = persona.mcpConfigs?.map((config: any) => config.description).join(', ') || '';
    const categories = persona.metadata?.categories?.join(', ') || '';
    
    // Generate simple examples based on persona name and tools
    const generateExamples = (personaName: string) => {
      const exampleMap: Record<string, string[]> = {
        'data-expert': [
          'Extract temperature data from climate.nc',
          'Convert CSV to optimized HDF5 format',
          'Compress large datasets with custom algorithms',
        ],
        'analysis-expert': [
          'Plot correlation matrix from experiment.csv', 
          'Perform statistical analysis on research data',
          'Create publication-ready visualizations',
        ],
        'hpc-expert': [
          'Create SLURM script for MPI simulation',
          'Optimize parallel code performance', 
          'Debug memory usage in HPC jobs',
        ],
        'research-expert': [
          'Summarize recent ML research papers',
          'Generate methodology documentation',
          'Find relevant citations for research',
        ],
        'workflow-expert': [
          'Create automated data processing pipeline',
          'Design experiment workflow templates',
          'Set up monitoring for long-running jobs',
        ],
      };
      
      return exampleMap[personaName] || ['Ask specialized questions for this persona'];
    };
    
    return {
      description: persona.description,
      tools: mcpTools || categories || 'specialized computing tools',
      examples: generateExamples(persona.name),
    };
  };

  const personaInfo = activePersona
    ? getPersonaDisplayInfo(activePersona)
    : null;

  return (
    <Box flexDirection="column">
      {/* Clean Warpio Branding */}
      <Box marginBottom={1}>
        <Gradient colors={theme.ui.gradient}>
          <Text bold>🚀 Warpio Scientific Computing Interface:</Text>
        </Gradient>
      </Box>

      {/* Active Persona Display */}
      {activePersona && personaInfo && (
        <Box marginBottom={1} flexDirection="column">
          <Text color={WarpioColorSystem.persona()} bold>
            🧬 {activePersona.name} Active - {personaInfo.description}
          </Text>
          <Text color={Colors.Foreground} dimColor>
            Available tools: {personaInfo.tools}
          </Text>
          {personaInfo.examples.length > 0 && (
            <Text color={Colors.Foreground}>
              Example:{' '}
              <Text color={WarpioColorSystem.accent()}>
                &quot;{personaInfo.examples[0]}&quot;
              </Text>
            </Text>
          )}
        </Box>
      )}

      {/* Provider-specific warnings */}
      {capabilityWarning && (
        <Text color={WarpioColorSystem.accent()}>💡 {capabilityWarning}</Text>
      )}

      {/* Streamlined Tips with Warpio Colors */}
      {!activePersona && (
        <>
          <Text color={Colors.Foreground}>
            • Process data:{' '}
            <Text color={WarpioColorSystem.accent()}>
              &quot;Convert NetCDF to HDF5 with compression&quot;
            </Text>
          </Text>
          <Text color={Colors.Foreground}>
            • Run simulations:{' '}
            <Text color={WarpioColorSystem.accent()}>
              &quot;Create SLURM script for MPI job&quot;
            </Text>
          </Text>
          <Text color={Colors.Foreground}>
            • Analyze results:{' '}
            <Text color={WarpioColorSystem.accent()}>
              &quot;Plot correlation matrix from data.csv&quot;
            </Text>
          </Text>
          <Text color={Colors.Foreground}>
            • Use personas:{' '}
            <Text bold color={WarpioColorSystem.secondary()}>
              --persona data-expert
            </Text>{' '}
            for specialized tools
          </Text>
        </>
      )}

      {/* Compact Control Tips with Warpio Interactive Colors */}
      <Text color={Colors.Foreground} dimColor>
        - Model control:{' '}
        <Text bold color={WarpioColorSystem.interactive()}>
          /model list
        </Text>{' '}
        to see all AI providers
      </Text>
      {geminiMdFileCount === 0 && (
        <Text color={Colors.Foreground} dimColor>
          - Project setup: Create{' '}
          <Text bold color={WarpioColorSystem.secondary()}>
            WARPIO.md
          </Text>{' '}
          to customize interactions
        </Text>
      )}
      <Text color={Colors.Foreground} dimColor>
        - Help:{' '}
        <Text bold color={WarpioColorSystem.interactive()}>
          /help
        </Text>{' '}
        for more information
      </Text>

      {/* Local Model Info with Provider-Aware Color */}
      {providerInfo.isLocal && (
        <Text color={WarpioColorSystem.provider(providerInfo.name)} dimColor>
          🏠 Using local model ({modelName}) - Fast and private
        </Text>
      )}
    </Box>
  );
};
