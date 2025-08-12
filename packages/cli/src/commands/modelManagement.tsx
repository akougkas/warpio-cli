/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, Box, Text } from 'ink';
import { Config, getModelDisplayName } from '@google/gemini-cli-core';
import { Colors } from '../ui/colors.js';
import {
  ModelStatus,
  ModelSwitchStatus,
} from '../ui/components/ModelStatus.js';
import {
  useProviderStatus,
  type ProviderHealthStatus,
} from '../ui/components/ProviderStatus.js';

interface ModelManagementOptions {
  config: Config;
  action: 'status' | 'switch' | 'health';
  targetModel?: string;
}

/**
 * Main model management command handler
 */
export async function handleModelManagement(
  options: ModelManagementOptions,
): Promise<void> {
  const { config, action, targetModel } = options;

  switch (action) {
    case 'status':
      return renderModelStatus(config);
    case 'switch':
      return handleModelSwitch(config, targetModel);
    case 'health':
      return renderProviderHealth();
    default:
      throw new Error(`Unknown model management action: ${action}`);
  }
}

/**
 * Render current model status
 */
async function renderModelStatus(config: Config): Promise<void> {
  const ModelStatusDisplay: React.FC = () => {
    const { providers, isLoading } = useProviderStatus();
    const currentModel = config.getModel();
    const displayName = getModelDisplayName(currentModel);

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color={Colors.AccentBlue}>
          Warpio Model Status
        </Text>

        <Box marginY={1}>
          <Text color={Colors.AccentGreen}>Active Model: </Text>
          <Text bold>{displayName}</Text>
          {displayName !== currentModel && (
            <Text color={Colors.Gray}> ({currentModel})</Text>
          )}
        </Box>

        {/* Provider Health Summary */}
        <ModelStatus
          currentModel={displayName}
          providers={providers}
          isLoading={isLoading}
        />

        {/* Usage Instructions */}
        <Box
          marginTop={1}
          paddingTop={1}
          borderStyle="single"
          borderColor="gray"
        >
          <Box flexDirection="column">
            <Text bold>Available Commands:</Text>
            <Text>
              • <Text color={Colors.AccentBlue}>warpio --model status</Text> -
              Show this status
            </Text>
            <Text>
              • <Text color={Colors.AccentBlue}>warpio --model health</Text> -
              Check provider health
            </Text>
            <Text>
              • <Text color={Colors.AccentBlue}>warpio --model list</Text> -
              List all available models
            </Text>
            <Text>
              •{' '}
              <Text color={Colors.AccentBlue}>warpio --model &lt;name&gt;</Text>{' '}
              - Switch to model
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };

  return new Promise<void>((resolve) => {
    const { unmount } = render(<ModelStatusDisplay />);

    // Auto-close after displaying status
    setTimeout(() => {
      unmount();
      resolve();
    }, 100);
  });
}

/**
 * Handle model switching with UI feedback
 */
async function handleModelSwitch(
  config: Config,
  targetModel?: string,
): Promise<void> {
  if (!targetModel) {
    throw new Error('Target model not specified for switch operation');
  }

  const currentModel = getModelDisplayName(config.getModel());

  const ModelSwitchDisplay: React.FC = () => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | undefined>();
    const [newModel, setNewModel] = React.useState<string | undefined>();

    React.useEffect(() => {
      const performSwitch = async () => {
        try {
          // Validate the target model exists
          const { ModelDiscoveryService } = await import(
            '@google/gemini-cli-core'
          );
          const modelDiscovery = new ModelDiscoveryService();
          const allModels = await modelDiscovery.listAllProvidersModels();

          // Find the model in any provider
          let foundModel = false;
          for (const [, models] of Object.entries(allModels)) {
            const model = models.find(
              (m) =>
                m.id === targetModel ||
                m.aliases?.includes(targetModel) ||
                m.displayName === targetModel,
            );
            if (model) {
              foundModel = true;
              break;
            }
          }

          if (!foundModel) {
            throw new Error(
              `Model '${targetModel}' not found. Use 'warpio --model list' to see available models.`,
            );
          }

          // Update the config (this doesn't persist, just for this session)
          config.setModel(targetModel);
          setNewModel(getModelDisplayName(targetModel));
          setIsLoading(false);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Unknown error occurred',
          );
          setIsLoading(false);
        }
      };

      performSwitch();
    }, []);

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color={Colors.AccentBlue}>
          Model Switch
        </Text>

        <ModelSwitchStatus
          isLoading={isLoading}
          currentModel={currentModel}
          targetModel={targetModel}
          error={error}
        />

        {newModel && (
          <Box marginTop={1}>
            <Text color={Colors.AccentGreen}>
              ✅ Model switched successfully!
            </Text>
            <Text color={Colors.Gray}>
              Note: This change only affects the current session.
            </Text>
            <Text color={Colors.Gray}>
              Use config commands to make permanent changes.
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  return new Promise<void>((resolve, _reject) => {
    const { unmount } = render(<ModelSwitchDisplay />);

    // Auto-close after switch completes
    setTimeout(() => {
      unmount();
      resolve();
    }, 3000);
  });
}

/**
 * Render detailed provider health information
 */
async function renderProviderHealth(): Promise<void> {
  const ProviderHealthDisplay: React.FC = () => {
    const { providers, isLoading } = useProviderStatus();

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color={Colors.AccentBlue}>
          Provider Health Status
        </Text>

        {isLoading ? (
          <Box marginY={1}>
            <Text color={Colors.Gray}>⏳ Checking provider health...</Text>
          </Box>
        ) : providers.length === 0 ? (
          <Box marginY={1}>
            <Text color={Colors.AccentYellow}>⚠️ No providers detected</Text>
          </Box>
        ) : (
          <Box flexDirection="column" marginY={1}>
            {providers.map((provider) => (
              <ProviderHealthDetail
                key={provider.provider}
                provider={provider}
              />
            ))}
          </Box>
        )}

        {/* Health Summary */}
        {!isLoading && providers.length > 0 && (
          <Box
            marginTop={1}
            paddingTop={1}
            borderStyle="single"
            borderColor="gray"
          >
            <Box flexDirection="column">
              <Text bold>Summary:</Text>
              <Text>
                Healthy: {providers.filter((p) => p.isHealthy).length} /{' '}
                {providers.length}
              </Text>
              <Text>
                Total Models:{' '}
                {providers.reduce((sum, p) => sum + p.modelCount, 0)}
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return new Promise<void>((resolve) => {
    const { unmount } = render(<ProviderHealthDisplay />);

    // Auto-close after displaying health
    setTimeout(() => {
      unmount();
      resolve();
    }, 100);
  });
}

interface ProviderHealthDetailProps {
  provider: ProviderHealthStatus;
}

const ProviderHealthDetail: React.FC<ProviderHealthDetailProps> = ({
  provider,
}) => {
  const statusIcon = provider.isHealthy ? '✅' : '❌';
  const statusColor = provider.isHealthy
    ? Colors.AccentGreen
    : Colors.AccentRed;
  const providerName =
    provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1);

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      {/* Provider name and status */}
      <Box flexDirection="row" alignItems="center">
        <Text>{statusIcon} </Text>
        <Text color={statusColor} bold>
          {providerName}
        </Text>
        {provider.isHealthy && provider.responseTime && (
          <Text color={Colors.Gray}> ({provider.responseTime}ms)</Text>
        )}
      </Box>

      {/* Details */}
      <Box flexDirection="row" marginLeft={2}>
        <Text color={Colors.Gray}>Models: {provider.modelCount}</Text>
        {provider.lastChecked && (
          <Text color={Colors.Gray}>
            {' • '}Last check:{' '}
            {new Date(provider.lastChecked).toLocaleTimeString()}
          </Text>
        )}
      </Box>

      {/* Error details */}
      {!provider.isHealthy && provider.error && (
        <Box marginLeft={2}>
          <Text color={Colors.AccentRed}>Error: {provider.error}</Text>
        </Box>
      )}
    </Box>
  );
};
