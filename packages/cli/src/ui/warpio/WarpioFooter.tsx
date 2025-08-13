/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Footer } from '../components/Footer.js';
import { theme } from '../semantic-colors.js';
import { getProviderInfo, getModelName, getContextInfo } from './utils/providerDetection.js';
import { getSkillsDisplay } from './utils/skillDetection.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { isNarrowWidth } from '../utils/isNarrowWidth.js';

interface WarpioFooterProps {
  model: string;
  targetDir: string;
  branchName?: string;
  debugMode: boolean;
  debugMessage: string;
  corgiMode: boolean;
  errorCount: number;
  showErrorDetails: boolean;
  showMemoryUsage?: boolean;
  promptTokenCount: number;
  nightly: boolean;
  vimMode?: string;
}

export const WarpioFooter: React.FC<WarpioFooterProps> = (props) => {
  const { columns: terminalWidth } = useTerminalSize();
  const isNarrow = isNarrowWidth(terminalWidth);
  
  const providerInfo = getProviderInfo();
  const modelName = getModelName();
  const contextInfo = getContextInfo(props.model);
  const skillsDisplay = getSkillsDisplay(props.model);
  
  // Get active persona from config if available
  const activePersona = React.useMemo(() => {
    try {
      // Try to get persona from environment or config
      const persona = process.env.WARPIO_PERSONA || 'Default';
      return persona.charAt(0).toUpperCase() + persona.slice(1);
    } catch {
      return 'Default';
    }
  }, []);

  // Format context display
  const formatContext = (current: number, max: number): string => {
    if (max > 1000000) {
      return `${(max / 1048576).toFixed(0)}M`;
    } else if (max > 1000) {
      return `${Math.round(max / 1024)}K`;
    }
    return `${max}`;
  };

  const contextDisplay = formatContext(contextInfo.current, contextInfo.max);

  return (
    <Box flexDirection="column" width="100%">
      {/* Original Footer */}
      <Footer {...props} />
      
      {/* Ultra-Clean Status Line */}
      <Box paddingTop={1} paddingLeft={1}>
        <Text color={theme.text.secondary} dimColor>
          <Text color={providerInfo.color}>{providerInfo.name}</Text>
          <Text color={theme.text.secondary}> • </Text>
          <Text>{skillsDisplay}</Text>
          <Text color={theme.text.secondary}> ({contextDisplay}) • </Text>
          <Text color={theme.text.accent}>{activePersona}</Text>
        </Text>
      </Box>
    </Box>
  );
};