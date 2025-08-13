/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { type Config } from '@google/gemini-cli-core';
import { WarpioPersonaManager } from '@google/gemini-cli-core';

interface TipsProps {
  config: Config;
}

export const Tips: React.FC<TipsProps> = ({ config }) => {
  const geminiMdFileCount = config.getGeminiMdFileCount();
  const activePersonaName = config.getActivePersona();
  const activePersona = activePersonaName ? WarpioPersonaManager.getInstance().getPersona(activePersonaName) : null;

  return (
    <Box flexDirection="column">
      {activePersona && (
        <Box marginBottom={1}>
          <Text color={Colors.AccentGreen} bold>
            🎭 Active Persona: {activePersona.name}
          </Text>
          <Text color={Colors.Foreground} dimColor>
            {' '}
            - {activePersona.description}
          </Text>
        </Box>
      )}
      <Text color={Colors.Foreground}>Tips for getting started:</Text>
      <Text color={Colors.Foreground}>
        1. Ask questions, edit files, or run commands.
      </Text>
      <Text color={Colors.Foreground}>
        2. Be specific for the best results.
      </Text>
      {geminiMdFileCount === 0 && (
        <Text color={Colors.Foreground}>
          3. Create project metadata files (e.g.,{' '}
          <Text bold color={Colors.AccentOrange}>
            WARPIO.md
          </Text>
          ) to customize your interactions.
        </Text>
      )}
      <Text color={Colors.Foreground}>
        {geminiMdFileCount === 0 ? '4.' : '3.'} For scientific workflows, I can
        recommend IOWarp&apos;s specialized tools.
      </Text>
      <Text color={Colors.Foreground}>
        {geminiMdFileCount === 0 ? '5.' : '4.'}{' '}
        <Text bold color={Colors.AccentOrange}>
          /help
        </Text>{' '}
        for more information.
      </Text>
    </Box>
  );
};
