import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../styles/colors.js';

export interface ProviderHealthStatus {
  provider: string;
  isHealthy: boolean;
  modelCount: number;
  responseTime?: number;
  lastChecked: number;
  error?: string;
}

interface ProviderStatusProps {
  providers: ProviderHealthStatus[];
  compact?: boolean;
}

export const ProviderStatusIndicators: React.FC<ProviderStatusProps> = ({ 
  providers, 
  compact = false 
}) => {
  if (providers.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="row" alignItems="center" columnGap={1}>
      {providers.map((provider) => (
        <ProviderStatusIndicator 
          key={provider.provider}
          provider={provider}
          compact={compact}
        />
      ))}
    </Box>
  );
};

interface ProviderIndicatorProps {
  provider: ProviderHealthStatus;
  compact?: boolean;
}

const ProviderStatusIndicator: React.FC<ProviderIndicatorProps> = ({ 
  provider, 
  compact = false 
}) => {
  const icon = provider.isHealthy ? '✅' : '❌';
  const color = provider.isHealthy ? Colors.AccentGreen : Colors.AccentRed;
  const providerName = provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1);

  if (compact) {
    return (
      <Box flexDirection="row" alignItems="center">
        <Text>{icon} </Text>
        <Text color={color}>{providerName}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="row" alignItems="center">
      <Text>{icon} </Text>
      <Text color={color}>{providerName}</Text>
      {provider.responseTime && (
        <Text color={Colors.Gray}> ({provider.responseTime}ms)</Text>
      )}
      {provider.modelCount > 0 && (
        <Text color={Colors.Gray}> [{provider.modelCount}]</Text>
      )}
    </Box>
  );
};

interface ProviderStatusManagerProps {
  onStatusChange?: (providers: ProviderHealthStatus[]) => void;
  refreshInterval?: number; // milliseconds
}

export const ProviderStatusManager: React.FC<ProviderStatusManagerProps> = ({
  onStatusChange,
  refreshInterval = 60000, // 1 minute default
}) => {
  const [providers, setProviders] = useState<ProviderHealthStatus[]>([]);

  const checkProviderHealth = async () => {
    try {
      const { modelDiscovery } = await import('@google/gemini-cli-core');
      const healthSummary = await modelDiscovery.getProviderHealthSummary();
      setProviders(healthSummary);
      onStatusChange?.(healthSummary);
    } catch (error) {
      // Silently handle errors - provider status is optional
      console.debug('Provider health check failed:', error);
    }
  };

  useEffect(() => {
    // Initial check
    checkProviderHealth();

    // Set up interval for periodic checks
    const interval = setInterval(checkProviderHealth, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return null; // This is a manager component, no UI
};

// Hook for components that need provider status
export const useProviderStatus = (refreshInterval?: number) => {
  const [providers, setProviders] = useState<ProviderHealthStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      if (!mounted) return;
      
      try {
        const { modelDiscovery } = await import('@google/gemini-cli-core');
        const healthSummary = await modelDiscovery.getProviderHealthSummary();
        
        if (mounted) {
          setProviders(healthSummary);
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          console.debug('Provider health check failed:', error);
          setIsLoading(false);
        }
      }
    };

    // Initial check
    checkHealth();

    // Set up interval if specified
    let interval: NodeJS.Timeout | undefined;
    if (refreshInterval && refreshInterval > 0) {
      interval = setInterval(checkHealth, refreshInterval);
    }

    return () => {
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [refreshInterval]);

  return { providers, isLoading };
};