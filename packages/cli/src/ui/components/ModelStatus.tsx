import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { type ProviderHealthStatus } from './ProviderStatus.js';

interface ModelStatusProps {
  currentModel?: string;
  providers: ProviderHealthStatus[];
  isLoading?: boolean;
}

export const ModelStatus: React.FC<ModelStatusProps> = ({
  currentModel,
  providers,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.Gray}>⏳ Checking model status...</Text>
      </Box>
    );
  }

  if (providers.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.Gray}>No providers detected</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>Model Status</Text>
      <Box paddingY={1}>
        {currentModel && (
          <Box marginBottom={1}>
            <Text color={Colors.AccentGreen}>Active Model: </Text>
            <Text bold>{currentModel}</Text>
          </Box>
        )}
        
        <Text bold marginBottom={1}>Provider Health:</Text>
        {providers.map((provider) => (
          <ProviderDetailRow key={provider.provider} provider={provider} />
        ))}
      </Box>
    </Box>
  );
};

interface ProviderDetailRowProps {
  provider: ProviderHealthStatus;
}

const ProviderDetailRow: React.FC<ProviderDetailRowProps> = ({ provider }) => {
  const statusIcon = provider.isHealthy ? '✅' : '❌';
  const statusColor = provider.isHealthy ? Colors.AccentGreen : Colors.AccentRed;
  const providerName = provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Main status line */}
      <Box flexDirection="row" alignItems="center">
        <Text>{statusIcon} </Text>
        <Text color={statusColor} bold>{providerName}</Text>
        {provider.responseTime && (
          <Text color={Colors.Gray}> ({provider.responseTime}ms)</Text>
        )}
      </Box>
      
      {/* Details line */}
      <Box flexDirection="row" marginLeft={2}>
        <Text color={Colors.Gray}>
          Models: {provider.modelCount}
        </Text>
        {provider.lastChecked && (
          <Text color={Colors.Gray}>
            {' • '}Last checked: {new Date(provider.lastChecked).toLocaleTimeString()}
          </Text>
        )}
      </Box>
      
      {/* Error line (if any) */}
      {provider.error && (
        <Box marginLeft={2}>
          <Text color={Colors.AccentRed}>Error: {provider.error}</Text>
        </Box>
      )}
    </Box>
  );
};

interface ModelSwitchStatusProps {
  isLoading?: boolean;
  currentModel?: string;
  targetModel?: string;
  error?: string;
}

export const ModelSwitchStatus: React.FC<ModelSwitchStatusProps> = ({
  isLoading = false,
  currentModel,
  targetModel,
  error,
}) => {
  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.AccentRed}>❌ Model switch failed</Text>
        <Text color={Colors.Gray}>Error: {error}</Text>
      </Box>
    );
  }

  if (isLoading && targetModel) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.AccentYellow}>⏳ Switching to {targetModel}...</Text>
        {currentModel && (
          <Text color={Colors.Gray}>From: {currentModel}</Text>
        )}
      </Box>
    );
  }

  if (currentModel) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.AccentGreen}>✅ Active: {currentModel}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color={Colors.Gray}>No active model</Text>
    </Box>
  );
};

interface ModelRecoveryStatusProps {
  failedProvider: string;
  fallbackProvider?: string;
  isRecovering?: boolean;
  recoverySuccess?: boolean;
}

export const ModelRecoveryStatus: React.FC<ModelRecoveryStatusProps> = ({
  failedProvider,
  fallbackProvider,
  isRecovering = false,
  recoverySuccess,
}) => {
  if (isRecovering) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.AccentYellow}>
          ⏳ {failedProvider} failed, attempting recovery...
        </Text>
        {fallbackProvider && (
          <Text color={Colors.Gray}>Trying fallback: {fallbackProvider}</Text>
        )}
      </Box>
    );
  }

  if (recoverySuccess && fallbackProvider) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.AccentGreen}>
          ✅ Recovered using {fallbackProvider}
        </Text>
        <Text color={Colors.Gray}>
          Original provider ({failedProvider}) is still unavailable
        </Text>
      </Box>
    );
  }

  if (recoverySuccess === false) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.AccentRed}>
          ❌ Recovery failed - no healthy providers available
        </Text>
        <Text color={Colors.Gray}>
          Please check your {failedProvider} configuration
        </Text>
      </Box>
    );
  }

  return null;
};