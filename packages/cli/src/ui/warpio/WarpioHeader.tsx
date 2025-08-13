/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { Header } from '../components/Header.js';
import { theme } from '../semantic-colors.js';
import { getProviderInfo, getModelName } from './utils/providerDetection.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface WarpioHeaderProps {
  customAsciiArt?: string;
  version: string;
  nightly: boolean;
  showWelcome?: boolean;
}

export const WarpioHeader: React.FC<WarpioHeaderProps> = ({
  customAsciiArt,
  version,
  nightly,
  showWelcome = false,
}) => {
  const { columns: terminalWidth } = useTerminalSize();
  const providerInfo = getProviderInfo();
  const modelName = getModelName();

  return (
    <Box flexDirection="column" alignItems="flex-start">
      {/* Original Header */}
      <Header 
        customAsciiArt={customAsciiArt}
        version={version}
        nightly={nightly}
      />
      
      {/* Warpio Welcome Banner */}
      {showWelcome && (
        <Box 
          flexDirection="column" 
          alignItems="center" 
          width={Math.min(terminalWidth, 80)}
          marginTop={1}
          marginBottom={1}
        >
          <Box 
            borderStyle="double"
            borderColor={theme.border.focused}
            paddingY={1}
            paddingX={2}
            width="100%"
          >
            <Box flexDirection="column" alignItems="center" width="100%">
              <Gradient colors={theme.ui.gradient}>
                <Text bold>WARPIO SCIENTIFIC CLI</Text>
              </Gradient>
              <Text color={theme.text.secondary} dimColor>
                AI-Powered Research & Computing
              </Text>
            </Box>
          </Box>
          
          <Box marginTop={1} flexDirection="column" alignItems="center">
            <Text color={theme.text.secondary}>
              Provider: <Text color={providerInfo.color} bold>{providerInfo.name}</Text>
              {' | '}
              Model: <Text color={theme.text.accent} bold>{modelName}</Text>
            </Text>
            <Box marginTop={1}>
              <Gradient colors={['#3CA84B', '#0D83C9']}>
                <Text>🧬 Ready for Science 🧬</Text>
              </Gradient>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};