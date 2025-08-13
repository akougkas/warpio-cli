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

  // Get persona-specific tips
  const getPersonaTips = (personaName: string) => {
    const personaTips: Record<string, {
      description: string;
      tools: string;
      examples: string[];
    }> = {
      'data-expert': {
        description: 'Scientific Data I/O Specialist',
        tools: 'HDF5, NetCDF, ADIOS2, compression',
        examples: [
          'Extract temperature data from climate.nc',
          'Convert CSV to optimized HDF5 format',
          'Compress large datasets with custom algorithms',
        ],
      },
      'analysis-expert': {
        description: 'Data Analysis & Visualization',
        tools: 'pandas, matplotlib, plotly, scipy',
        examples: [
          'Plot correlation matrix from experiment.csv',
          'Perform statistical analysis on research data',
          'Create publication-ready visualizations',
        ],
      },
      'hpc-expert': {
        description: 'HPC Optimization Specialist',
        tools: 'SLURM, MPI, performance profiling',
        examples: [
          'Create SLURM script for MPI simulation',
          'Optimize parallel code performance',
          'Debug memory usage in HPC jobs',
        ],
      },
      'research-expert': {
        description: 'Research & Documentation',
        tools: 'arxiv, papers, documentation',
        examples: [
          'Summarize recent ML research papers',
          'Generate methodology documentation',
          'Find relevant citations for research',
        ],
      },
      'workflow-expert': {
        description: 'Workflow Orchestration',
        tools: 'automation, pipelines, scheduling',
        examples: [
          'Create automated data processing pipeline',
          'Design experiment workflow templates',
          'Set up monitoring for long-running jobs',
        ],
      },
    };
    
    return personaTips[personaName] || null;
  };

  const personaInfo = activePersonaName ? getPersonaTips(activePersonaName) : null;

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
          <Text color={Colors.AccentGreen} bold>
            🧬 {activePersona.name} Active - {personaInfo.description}
          </Text>
          <Text color={Colors.Foreground} dimColor>
            Available tools: {personaInfo.tools}
          </Text>
          {personaInfo.examples.length > 0 && (
            <Text color={Colors.Foreground}>
              Example: <Text color={Colors.AccentOrange}>"{personaInfo.examples[0]}"</Text>
            </Text>
          )}
        </Box>
      )}

      {/* Provider-specific warnings */}
      {capabilityWarning && (
        <Text color={Colors.AccentOrange}>💡 {capabilityWarning}</Text>
      )}

      {/* Streamlined Tips */}
      {!activePersona && (
        <>
          <Text color={Colors.Foreground}>
            • Process data: <Text color={Colors.AccentOrange}>"Convert NetCDF to HDF5 with compression"</Text>
          </Text>
          <Text color={Colors.Foreground}>
            • Run simulations: <Text color={Colors.AccentOrange}>"Create SLURM script for MPI job"</Text>
          </Text>
          <Text color={Colors.Foreground}>
            • Analyze results: <Text color={Colors.AccentOrange}>"Plot correlation matrix from data.csv"</Text>
          </Text>
          <Text color={Colors.Foreground}>
            • Use personas: <Text bold color={Colors.AccentOrange}>--persona data-expert</Text> for specialized tools
          </Text>
        </>
      )}

      {/* Compact Control Tips */}
      <Text color={Colors.Foreground} dimColor>
        - Model control: <Text bold color={Colors.AccentOrange}>/model list</Text> to see all AI providers
      </Text>
      {geminiMdFileCount === 0 && (
        <Text color={Colors.Foreground} dimColor>
          - Project setup: Create <Text bold color={Colors.AccentOrange}>WARPIO.md</Text> to customize interactions
        </Text>
      )}
      <Text color={Colors.Foreground} dimColor>
        - Help: <Text bold color={Colors.AccentOrange}>/help</Text> for more information
      </Text>

      {/* Local Model Info */}
      {providerInfo.isLocal && (
        <Text color={Colors.AccentGreen} dimColor>
          🏠 Using local model ({modelName}) - Fast and private
        </Text>
      )}
    </Box>
  );
};