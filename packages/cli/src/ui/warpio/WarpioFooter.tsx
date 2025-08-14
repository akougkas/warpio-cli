/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { theme } from '../semantic-colors.js';
import { shortenPath, tildeifyPath } from '@google/gemini-cli-core';
import { ConsoleSummaryDisplay } from '../components/ConsoleSummaryDisplay.js';
import { MemoryUsageDisplay } from '../components/MemoryUsageDisplay.js';
import { DebugProfiler } from '../components/DebugProfiler.js';
import {
  getProviderInfo,
  getModelName,
  getContextInfo,
} from './utils/providerDetection.js';
import { getSkillsDisplay } from './utils/skillDetection.js';
import { WarpioColorSystem } from './utils/warpioColors.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { isNarrowWidth } from '../utils/isNarrowWidth.js';
import process from 'node:process';
import path from 'node:path';

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
      const persona = 'Default';
      return persona.charAt(0).toUpperCase() + persona.slice(1);
    } catch {
      return 'Default';
    }
  }, []);

  // Calculate context percentage
  const contextPercent = Math.round(
    (1 - props.promptTokenCount / contextInfo.max) * 100,
  );

  // Clean path display
  const cleanPath = isNarrow
    ? path.basename(tildeifyPath(props.targetDir))
    : shortenPath(
        tildeifyPath(props.targetDir),
        Math.max(15, Math.floor(terminalWidth * 0.2)),
      );

  // Clean branch display
  const branchDisplay = props.branchName
    ? `${props.branchName.length > 15 ? props.branchName.slice(0, 12) + '...' : props.branchName}*`
    : '';

  return (
    <Box
      justifyContent="space-between"
      width="100%"
      flexDirection={isNarrow ? 'column' : 'row'}
      alignItems={isNarrow ? 'flex-start' : 'center'}
    >
      {/* Left Section: Minimal Path + Debug */}
      <Box>
        {props.debugMode && <DebugProfiler />}
        {props.vimMode && (
          <Text color={theme.text.secondary}>[{props.vimMode}] </Text>
        )}
        {props.nightly ? (
          <Gradient colors={theme.ui.gradient}>
            <Text>
              {cleanPath}
              {branchDisplay && ` (${branchDisplay})`}
            </Text>
          </Gradient>
        ) : (
          <Text color={theme.text.link}>
            {cleanPath}
            {branchDisplay && (
              <Text color={theme.text.secondary}> ({branchDisplay})</Text>
            )}
          </Text>
        )}
        {props.debugMode && (
          <Text color={theme.status.error}>
            {' ' + (props.debugMessage || '--debug')}
          </Text>
        )}
      </Box>

      {/* Middle Section: Only show sandbox if actually configured */}
      {process.env.SANDBOX && process.env.SANDBOX !== 'sandbox-exec' && (
        <Box
          flexGrow={isNarrow ? 0 : 1}
          alignItems="center"
          justifyContent={isNarrow ? 'flex-start' : 'center'}
          display="flex"
          paddingX={isNarrow ? 0 : 1}
          paddingTop={isNarrow ? 1 : 0}
        >
          <Text color="green">
            {process.env.SANDBOX.replace(/^gemini-(?:cli-)?/, '')}
          </Text>
        </Box>
      )}

      {/* Right Section: Enhanced Model Info with Warpio Brand Colors */}
      <Box alignItems="center" paddingTop={isNarrow ? 1 : 0}>
        <Text>
          <Text color={WarpioColorSystem.provider(providerInfo.name)} bold>
            {providerInfo.name}
          </Text>
          <Text color={WarpioColorSystem.separator()}>::</Text>
          <Text color={WarpioColorSystem.model()} bold>
            {modelName}
          </Text>
          <Text color={WarpioColorSystem.capability()}>
            {' '}
            {skillsDisplay} ({contextPercent}%)
          </Text>
          <Text color={WarpioColorSystem.separator()}> | </Text>
          <Text color={WarpioColorSystem.accent()}>{activePersona}</Text>
        </Text>
        {props.corgiMode && (
          <Text>
            <Text color={theme.ui.symbol}>| </Text>
            <Text color={theme.status.error}>▼</Text>
            <Text color={theme.text.primary}>(´</Text>
            <Text color={theme.status.error}>ᴥ</Text>
            <Text color={theme.text.primary}>`)</Text>
            <Text color={theme.status.error}>▼ </Text>
          </Text>
        )}
        {!props.showErrorDetails && props.errorCount > 0 && (
          <Box>
            <Text color={theme.ui.symbol}>| </Text>
            <ConsoleSummaryDisplay errorCount={props.errorCount} />
          </Box>
        )}
        {props.showMemoryUsage && <MemoryUsageDisplay />}
      </Box>
    </Box>
  );
};
