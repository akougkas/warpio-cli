/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enhanced Footer with Warpio Provider/Model/Persona Information
 * 
 * Wraps the upstream Footer with additional Warpio-specific enhancements:
 * - Provider::Model display with brand colors
 * - Active persona information
 * - Smart path wrapping for long paths
 * - Model capability indicators
 */

import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { shortenPath, tildeifyPath } from '@google/gemini-cli-core';
import { ConsoleSummaryDisplay } from '../components/ConsoleSummaryDisplay.js';
import { MemoryUsageDisplay } from '../components/MemoryUsageDisplay.js';
import { DebugProfiler } from '../components/DebugProfiler.js';
import Gradient from 'ink-gradient';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { isNarrowWidth } from '../utils/isNarrowWidth.js';
import {
  getProviderInfo,
  getModelName,
  getContextInfo,
} from './utils/providerDetection.js';
import { getSkillsDisplay, getSkillsDisplayAsync } from './utils/skillDetection.js';
import { WarpioColorSystem } from './utils/warpioColors.js';
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

export const WarpioFooter: React.FC<WarpioFooterProps> = ({
  model,
  targetDir,
  branchName,
  debugMode,
  debugMessage,
  corgiMode,
  errorCount,
  showErrorDetails,
  showMemoryUsage,
  promptTokenCount,
  nightly,
  vimMode,
}) => {
  const { columns: terminalWidth } = useTerminalSize();
  const isNarrow = isNarrowWidth(terminalWidth);

  // Enhanced Warpio provider/model detection
  const providerInfo = getProviderInfo();
  const modelName = getModelName();
  const contextInfo = getContextInfo(model);
  
  // Dynamic skill detection with fallback
  const [skillsDisplay, setSkillsDisplay] = React.useState<string>(getSkillsDisplay(model));
  
  React.useEffect(() => {
    // Async capability detection
    getSkillsDisplayAsync(model).then(setSkillsDisplay);
  }, [model]);

  // Get active persona (Warpio-specific)
  const activePersona = React.useMemo(() => {
    const persona = process.env.WARPIO_PERSONA;
    if (!persona || persona === 'warpio') return null;
    return persona.charAt(0).toUpperCase() + persona.slice(1);
  }, []);

  // Enhanced context calculation
  const contextPercent = Math.round((1 - promptTokenCount / contextInfo.max) * 100);

  // Smart path wrapping - balanced for enhanced footer content
  const pathLength = Math.max(20, Math.floor(terminalWidth * 0.3)); // Slightly more conservative due to enhanced right section

  const displayPath = isNarrow
    ? path.basename(tildeifyPath(targetDir))
    : shortenPath(tildeifyPath(targetDir), pathLength);

  return (
    <Box
      justifyContent="space-between"
      width="100%"
      flexDirection={isNarrow ? 'column' : 'row'}
      alignItems={isNarrow ? 'flex-start' : 'center'}
    >
      {/* Left Section: Path + Debug (Enhanced) */}
      <Box>
        {debugMode && <DebugProfiler />}
        {vimMode && <Text color={theme.text.secondary}>[{vimMode}] </Text>}
        {nightly ? (
          <Gradient colors={theme.ui.gradient}>
            <Text>
              {displayPath}
              {branchName && <Text> ({branchName}*)</Text>}
            </Text>
          </Gradient>
        ) : (
          <Text color={theme.text.link}>
            {displayPath}
            {branchName && (
              <Text color={theme.text.secondary}> ({branchName}*)</Text>
            )}
          </Text>
        )}
        {debugMode && (
          <Text color={theme.status.error}>
            {' ' + (debugMessage || '--debug')}
          </Text>
        )}
      </Box>

      {/* Middle Section: Sandbox Info (Same as upstream) */}
      <Box
        flexGrow={isNarrow ? 0 : 1}
        alignItems="center"
        justifyContent={isNarrow ? 'flex-start' : 'center'}
        display="flex"
        paddingX={isNarrow ? 0 : 1}
        paddingTop={isNarrow ? 1 : 0}
      >
        {process.env.SANDBOX && process.env.SANDBOX !== 'sandbox-exec' ? (
          <Text color="green">
            {process.env.SANDBOX.replace(/^gemini-(?:cli-)?/, '')}
          </Text>
        ) : process.env.SANDBOX === 'sandbox-exec' ? (
          <Text color={theme.status.warning}>
            macOS Seatbelt{' '}
            <Text color={theme.text.secondary}>
              ({process.env.SEATBELT_PROFILE})
            </Text>
          </Text>
        ) : (
          <Text color={theme.status.error}>
            no sandbox <Text color={theme.text.secondary}>(see /docs)</Text>
          </Text>
        )}
      </Box>

      {/* Right Section: Enhanced Model Info with Warpio Branding */}
      <Box alignItems="center" paddingTop={isNarrow ? 1 : 0}>
        <Text>
          {/* Provider in brand colors */}
          <Text color={WarpioColorSystem.provider(providerInfo.name)} bold>
            {providerInfo.name}
          </Text>
          <Text color={WarpioColorSystem.primary()}>::</Text>
          <Text color={WarpioColorSystem.secondary()} bold>
            {modelName}
          </Text>
          {/* Skills and context */}
          <Text color={WarpioColorSystem.accent()}>
            {' '}
            {skillsDisplay} ({contextPercent}% context left)
          </Text>
          {/* Active persona if set */}
          {activePersona && (
            <>
              <Text color={WarpioColorSystem.primary()}> | </Text>
              <Text color={WarpioColorSystem.accent()} bold>
                {activePersona}
              </Text>
            </>
          )}
        </Text>

        {/* Corgi mode (same as upstream) */}
        {corgiMode && (
          <Text>
            <Text color={theme.ui.symbol}>| </Text>
            <Text color={theme.status.error}>▼</Text>
            <Text color={theme.text.primary}>(´</Text>
            <Text color={theme.status.error}>ᴥ</Text>
            <Text color={theme.text.primary}>`)</Text>
            <Text color={theme.status.error}>▼ </Text>
          </Text>
        )}

        {/* Error summary (same as upstream) */}
        {!showErrorDetails && errorCount > 0 && (
          <Box>
            <Text color={theme.ui.symbol}>| </Text>
            <ConsoleSummaryDisplay errorCount={errorCount} />
          </Box>
        )}

        {/* Memory usage (same as upstream) */}
        {showMemoryUsage && <MemoryUsageDisplay />}
      </Box>
    </Box>
  );
};