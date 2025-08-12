import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

export interface RecoveryAction {
  label: string;
  command?: string;
  description?: string;
}

export interface EnhancedErrorProps {
  error: string;
  errorType?: 'provider_connection' | 'model_not_found' | 'configuration' | 'authentication' | 'general';
  failedProvider?: string;
  targetModel?: string;
  recoveryActions?: RecoveryAction[];
  showFallbackSuggestion?: boolean;
}

export const EnhancedErrorMessage: React.FC<EnhancedErrorProps> = ({
  error,
  errorType = 'general',
  failedProvider,
  targetModel,
  recoveryActions,
  showFallbackSuggestion = true,
}) => {
  const actions = recoveryActions || getDefaultRecoveryActions(errorType, failedProvider, targetModel);
  
  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Main error message */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color={Colors.AccentRed}>❌ </Text>
        <Text color={Colors.AccentRed} bold>Error: </Text>
        <Text color={Colors.AccentRed}>{error}</Text>
      </Box>

      {/* Context information */}
      {(failedProvider || targetModel) && (
        <Box flexDirection="column" marginLeft={2} marginBottom={1}>
          {failedProvider && (
            <Text color={Colors.Gray}>Provider: {failedProvider}</Text>
          )}
          {targetModel && (
            <Text color={Colors.Gray}>Target Model: {targetModel}</Text>
          )}
        </Box>
      )}

      {/* Recovery suggestions */}
      {actions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={Colors.AccentYellow}>💡 Try these solutions:</Text>
          {actions.map((action, index) => (
            <RecoveryActionRow key={index} action={action} index={index + 1} />
          ))}
        </Box>
      )}

      {/* Fallback suggestion */}
      {showFallbackSuggestion && errorType === 'provider_connection' && (
        <Box flexDirection="column" paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color={Colors.AccentBlue}>ℹ️ Auto-fallback available</Text>
          <Text color={Colors.Gray}>
            Warpio can automatically switch to working providers when this happens.
          </Text>
          <Text color={Colors.Gray}>
            Run <Text color={Colors.AccentBlue}>warpio --model health</Text> to check all providers.
          </Text>
        </Box>
      )}
    </Box>
  );
};

interface RecoveryActionRowProps {
  action: RecoveryAction;
  index: number;
}

const RecoveryActionRow: React.FC<RecoveryActionRowProps> = ({ action, index }) => (
  <Box flexDirection="column" marginLeft={2} marginBottom={1}>
    <Box flexDirection="row" alignItems="center">
      <Text color={Colors.AccentYellow}>{index}. </Text>
      <Text bold>{action.label}</Text>
    </Box>
    
    {action.command && (
      <Box marginLeft={3}>
        <Text color={Colors.AccentBlue}>{action.command}</Text>
      </Box>
    )}
    
    {action.description && (
      <Box marginLeft={3}>
        <Text color={Colors.Gray}>{action.description}</Text>
      </Box>
    )}
  </Box>
);

/**
 * Generate context-aware recovery actions based on error type
 */
function getDefaultRecoveryActions(
  errorType: EnhancedErrorProps['errorType'],
  failedProvider?: string,
  targetModel?: string
): RecoveryAction[] {
  switch (errorType) {
    case 'provider_connection':
      if (failedProvider === 'ollama') {
        return [
          {
            label: 'Check if Ollama is running',
            command: 'ollama list',
            description: 'Verify Ollama server is available on localhost:11434',
          },
          {
            label: 'Start Ollama service',
            command: 'ollama serve',
            description: 'Start the Ollama server if not running',
          },
          {
            label: 'Try Gemini instead',
            command: 'warpio --model flash -p "test"',
            description: 'Use Gemini as fallback while fixing Ollama',
          },
        ];
      }
      
      if (failedProvider === 'gemini') {
        return [
          {
            label: 'Check API key configuration',
            command: 'warpio auth',
            description: 'Verify GEMINI_API_KEY is set correctly',
          },
          {
            label: 'Test authentication',
            command: 'warpio --model flash -p "test"',
            description: 'Try a simple request to verify credentials',
          },
          {
            label: 'Try local model',
            command: 'warpio --model small -p "test"',
            description: 'Use Ollama while fixing Gemini authentication',
          },
        ];
      }
      
      return [
        {
          label: 'Check provider status',
          command: 'warpio --model health',
          description: 'See which providers are currently working',
        },
        {
          label: 'List available models',
          command: 'warpio --model list',
          description: 'Find working models from healthy providers',
        },
      ];

    case 'model_not_found':
      return [
        {
          label: 'List available models',
          command: 'warpio --model list',
          description: 'See all models from all providers',
        },
        {
          label: 'Check model name spelling',
          description: 'Verify the model name matches exactly',
        },
        ...(targetModel?.includes(':') ? [] : [
          {
            label: 'Try with provider prefix',
            command: `warpio --model ollama:${targetModel || 'model'} -p "test"`,
            description: 'Some models need provider prefix',
          },
        ]),
      ];

    case 'configuration':
      return [
        {
          label: 'Check configuration',
          command: 'warpio config list',
          description: 'Review current Warpio settings',
        },
        {
          label: 'Reset to defaults',
          command: 'warpio config reset',
          description: 'Clear potentially corrupted configuration',
        },
      ];

    case 'authentication':
      return [
        {
          label: 'Run authentication setup',
          command: 'warpio auth',
          description: 'Configure API keys and authentication',
        },
        {
          label: 'Check environment variables',
          description: 'Verify GEMINI_API_KEY is set in your environment',
        },
      ];

    default:
      return [
        {
          label: 'Check system status',
          command: 'warpio --model health',
          description: 'Verify all providers are working correctly',
        },
        {
          label: 'Try different model',
          command: 'warpio --model list',
          description: 'List available models and try another one',
        },
      ];
  }
}

/**
 * Utility function to create enhanced errors from basic error messages
 */
export function createEnhancedError(
  error: string,
  context?: {
    provider?: string;
    model?: string;
    operation?: string;
  }
): EnhancedErrorProps {
  let errorType: EnhancedErrorProps['errorType'] = 'general';
  
  // Categorize error based on message content
  if (error.toLowerCase().includes('connection') || 
      error.toLowerCase().includes('econnrefused') ||
      error.toLowerCase().includes('timeout')) {
    errorType = 'provider_connection';
  } else if (error.toLowerCase().includes('not found') || 
             error.toLowerCase().includes('unavailable')) {
    errorType = 'model_not_found';
  } else if (error.toLowerCase().includes('auth') || 
             error.toLowerCase().includes('api key') ||
             error.toLowerCase().includes('unauthorized')) {
    errorType = 'authentication';
  } else if (error.toLowerCase().includes('config')) {
    errorType = 'configuration';
  }

  return {
    error,
    errorType,
    failedProvider: context?.provider,
    targetModel: context?.model,
  };
}