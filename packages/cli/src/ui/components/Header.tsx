/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { Colors } from '../colors.js';
import { shortAsciiLogo, longAsciiLogo, tinyAsciiLogo } from './AsciiArt.js';
import { getAsciiArtWidth } from '../utils/textUtils.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { ProviderStatusIndicators, type ProviderHealthStatus } from './ProviderStatus.js';

interface HeaderProps {
  customAsciiArt?: string; // For user-defined ASCII art
  version: string;
  nightly: boolean;
  showProviderStatus?: boolean;
  providers?: ProviderHealthStatus[];
}

export const Header: React.FC<HeaderProps> = ({
  customAsciiArt,
  version,
  nightly,
  showProviderStatus = false,
  providers = [],
}) => {
  const { columns: terminalWidth } = useTerminalSize();
  let displayTitle;
  const widthOfLongLogo = getAsciiArtWidth(longAsciiLogo);
  const widthOfShortLogo = getAsciiArtWidth(shortAsciiLogo);

  if (customAsciiArt) {
    displayTitle = customAsciiArt;
  } else if (terminalWidth >= widthOfLongLogo) {
    displayTitle = longAsciiLogo;
  } else if (terminalWidth >= widthOfShortLogo) {
    displayTitle = shortAsciiLogo;
  } else {
    displayTitle = tinyAsciiLogo;
  }

  const artWidth = getAsciiArtWidth(displayTitle);

  return (
    <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between" width="100%">
      {/* Logo section */}
      <Box
        alignItems="flex-start"
        width={artWidth}
        flexShrink={0}
        flexDirection="column"
      >
        {Colors.GradientColors ? (
          <Gradient colors={Colors.GradientColors}>
            <Text>{displayTitle}</Text>
          </Gradient>
        ) : (
          <Text>{displayTitle}</Text>
        )}
        {nightly && (
          <Box width="100%" flexDirection="row" justifyContent="flex-end">
            {Colors.GradientColors ? (
              <Gradient colors={Colors.GradientColors}>
                <Text>v{version}</Text>
              </Gradient>
            ) : (
              <Text>v{version}</Text>
            )}
          </Box>
        )}
      </Box>

      {/* Provider status section */}
      {showProviderStatus && providers.length > 0 && (
        <Box alignItems="flex-end" flexShrink={0} paddingTop={1}>
          <ProviderStatusIndicators providers={providers} compact />
        </Box>
      )}
    </Box>
  );
};
