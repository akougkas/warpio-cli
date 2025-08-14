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
import {
  getSkillsDisplay,
  getSkillsDisplayAsync,
} from './utils/skillDetection.js';
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
  const [skillsDisplay, setSkillsDisplay] = React.useState<string>(
    getSkillsDisplay(model),
  );

  React.useEffect(() => {
    // Async capability detection
    getSkillsDisplayAsync(model).then(setSkillsDisplay);
  }, [model]);

  // Get active persona (Warpio-specific)
  const activePersona = React.useMemo(() => {
    const persona = process.env.WARPIO_PERSONA;
    if (!persona || persona === 'warpio') return null;
    return persona;
  }, []);

  // Enhanced context calculation
  const contextPercent = Math.round(
    (1 - promptTokenCount / contextInfo.max) * 100,
  );

  // Smart path wrapping - more conservative for compact footer
  const pathLength = Math.max(15, Math.floor(terminalWidth * 0.25)); // More conservative for compact layout

  const displayPath = isNarrow
    ? path.basename(tildeifyPath(targetDir))
    : shortenPath(tildeifyPath(targetDir), pathLength);

  // Smart combined path and branch wrapping
  const { displayPath: finalDisplayPath, displayBranch } = React.useMemo(() => {
    if (!branchName) {
      return { displayPath, displayBranch: null };
    }

    // Calculate available space for path + branch combined
    const reservedSpace = Math.floor(terminalWidth * 0.6); // Reserve 60% for middle + right sections
    const availableSpace = Math.max(30, terminalWidth - reservedSpace);

    // Format: "path (branch)*"
    const branchText = ` (${branchName})*`;
    const combinedLength = displayPath.length + branchText.length;

    if (combinedLength <= availableSpace) {
      // Both fit comfortably
      return { displayPath, displayBranch: branchName };
    }

    // Need to truncate intelligently
    const minPathLength = 15; // Minimum path length
    const maxBranchLength = Math.max(10, Math.floor(availableSpace * 0.4)); // 40% for branch
    const maxPathLength = availableSpace - maxBranchLength - 5; // 5 chars for " ()*"

    const truncatedPath =
      displayPath.length > maxPathLength
        ? shortenPath(
            tildeifyPath(targetDir),
            Math.max(minPathLength, maxPathLength),
          )
        : displayPath;

    const truncatedBranch =
      branchName.length > maxBranchLength
        ? branchName.substring(0, maxBranchLength - 3) + '...'
        : branchName;

    return { displayPath: truncatedPath, displayBranch: truncatedBranch };
  }, [displayPath, branchName, terminalWidth, targetDir]);

  // Persona icon mapping
  const getPersonaIcon = (persona: string | null) => {
    if (!persona || persona === 'warpio') return null;

    const icons: Record<string, string> = {
      'data-expert': '📊',
      'analysis-expert': '📈',
      'hpc-expert': '🖥️',
      'research-expert': '🔬',
      'workflow-expert': '⚙️',
    };

    return icons[persona.toLowerCase()] || '🤖';
  };

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
              {finalDisplayPath}
              {displayBranch && <Text> ({displayBranch})*</Text>}
            </Text>
          </Gradient>
        ) : (
          <Text color={theme.text.link}>
            {finalDisplayPath}
            {displayBranch && (
              <Text color={theme.text.secondary}> ({displayBranch})*</Text>
            )}
          </Text>
        )}
        {debugMode && (
          <Text color={theme.status.error}>
            {' ' + (debugMessage || '--debug')}
          </Text>
        )}
      </Box>

      {/* Middle Section: Smart Minimal Environment/Persona */}
      <Box
        flexGrow={isNarrow ? 0 : 1}
        alignItems="center"
        justifyContent={isNarrow ? 'flex-start' : 'center'}
        display="flex"
        paddingX={isNarrow ? 0 : 1}
        paddingTop={isNarrow ? 1 : 0}
      >
        {/* Only show if active sandbox */}
        {process.env.SANDBOX && process.env.SANDBOX !== 'sandbox-exec' ? (
          <Text color="green">
            🛡️ {process.env.SANDBOX.replace(/^gemini-(?:cli-)?/, '')}
          </Text>
        ) : process.env.SANDBOX === 'sandbox-exec' ? (
          <Text color={theme.status.warning}>🛡️ Seatbelt</Text>
        ) : null}

        {/* Active persona icon with color */}
        {getPersonaIcon(process.env.WARPIO_PERSONA || null) && (
          <>
            {process.env.SANDBOX && (
              <Text color={theme.text.secondary}> | </Text>
            )}
            <Text color={WarpioColorSystem.accent()}>
              {getPersonaIcon(process.env.WARPIO_PERSONA || null)}
            </Text>
          </>
        )}

        {/* Show Iowa Warp branding if no active sandbox AND no active persona */}
        {!process.env.SANDBOX &&
          !getPersonaIcon(process.env.WARPIO_PERSONA || null) && (
            <Text color={WarpioColorSystem.accent()}>
              warpio <Text color={theme.text.secondary}>(iowarp.ai)</Text>
            </Text>
          )}

        {/* Show active persona with Iowa Warp branding */}
        {activePersona && (
          <Text color={WarpioColorSystem.accent()}>
            active_persona({activePersona}){' '}
            <Text color={theme.text.secondary}>(iowarp.ai)</Text>
          </Text>
        )}
      </Box>

      {/* Right Section: Compact Model Info */}
      <Box alignItems="center" paddingTop={isNarrow ? 1 : 0}>
        <Text>
          {/* Provider::Model */}
          <Text color={WarpioColorSystem.provider(providerInfo.name)} bold>
            {providerInfo.name}
          </Text>
          <Text color={WarpioColorSystem.primary()}>::</Text>
          <Text color={WarpioColorSystem.secondary()} bold>
            {modelName}
          </Text>

          {!isNarrow && (
            <>
              {/* Skills and memory together in parentheses */}
              <Text color={WarpioColorSystem.accent()}>
                {' '}
                ({skillsDisplay}💾{contextPercent}%)
              </Text>
            </>
          )}

          {isNarrow && (
            /* Compact version for narrow screens */
            <Text color={WarpioColorSystem.accent()}>
              {' '}
              (💾{contextPercent}%)
            </Text>
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
