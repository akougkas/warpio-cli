/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Text, Box } from 'ink';
import { Colors } from '../../colors.js';
import {
  EnhancedErrorMessage,
  createEnhancedError,
  type EnhancedErrorProps,
} from '../EnhancedErrorMessage.js';

interface ErrorMessageProps {
  text: string;
  enhanced?: boolean;
  context?: {
    provider?: string;
    model?: string;
    operation?: string;
  };
  enhancedProps?: Partial<EnhancedErrorProps>;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  text,
  enhanced = false,
  context,
  enhancedProps,
}) => {
  // Use enhanced error display if requested and context is available
  if (enhanced && (context || enhancedProps)) {
    const baseErrorProps = createEnhancedError(text, context);
    const errorProps = enhancedProps
      ? { ...baseErrorProps, ...enhancedProps }
      : baseErrorProps;
    return <EnhancedErrorMessage {...errorProps} />;
  }

  // Fall back to simple error display
  const prefix = '✕ ';
  const prefixWidth = prefix.length;

  return (
    <Box flexDirection="row" marginBottom={1}>
      <Box width={prefixWidth}>
        <Text color={Colors.AccentRed}>{prefix}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text wrap="wrap" color={Colors.AccentRed}>
          {text}
        </Text>
      </Box>
    </Box>
  );
};
