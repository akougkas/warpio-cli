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
          <Text color={theme.text.secondary}>
            Provider: <Text color={providerInfo.color} bold>{providerInfo.name}</Text>
            {' | '}
            Model: <Text color={theme.text.accent} bold>{modelName}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};