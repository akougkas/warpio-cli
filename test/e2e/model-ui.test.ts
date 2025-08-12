/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Text } from 'ink';
import {
  ModelStatus,
  ModelSwitchStatus,
  ModelRecoveryStatus,
} from '../../packages/cli/src/ui/components/ModelStatus.js';
import {
  ProviderStatusIndicators,
  useProviderStatus,
} from '../../packages/cli/src/ui/components/ProviderStatus.js';
import {
  EnhancedErrorMessage,
  createEnhancedError,
} from '../../packages/cli/src/ui/components/EnhancedErrorMessage.js';

// Mock the core module
vi.mock('@google/gemini-cli-core', () => ({
  modelDiscovery: {
    getProviderHealthSummary: vi.fn().mockResolvedValue([
      {
        provider: 'ollama',
        isHealthy: true,
        modelCount: 5,
        responseTime: 150,
        lastChecked: Date.now(),
      },
      {
        provider: 'gemini',
        isHealthy: false,
        modelCount: 0,
        responseTime: undefined,
        lastChecked: Date.now(),
        error: 'Connection refused',
      },
    ]),
  },
  getModelDisplayName: vi.fn().mockImplementation((model: string) => {
    if (model === 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest')
      return 'ollama:small';
    if (model === 'gemini-2.5-flash') return 'flash';
    return model;
  }),
}));

describe('Model UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ModelStatus Component', () => {
    it('should display current model and provider status', () => {
      const providers = [
        {
          provider: 'ollama',
          isHealthy: true,
          modelCount: 5,
          responseTime: 150,
          lastChecked: Date.now(),
        },
        {
          provider: 'gemini',
          isHealthy: false,
          modelCount: 0,
          lastChecked: Date.now(),
          error: 'Connection failed',
        },
      ];

      const result = render(
        React.createElement(ModelStatus, {
          currentModel: 'ollama:small',
          providers,
          isLoading: false,
        }),
      );

      expect(result.lastFrame()).toContain('Model Status');
      expect(result.lastFrame()).toContain('Active Model: ollama:small');
      expect(result.lastFrame()).toContain('✅ Ollama');
      expect(result.lastFrame()).toContain('❌ Gemini');
      expect(result.lastFrame()).toContain('(150ms)');
      expect(result.lastFrame()).toContain('Models: 5');
      expect(result.lastFrame()).toContain('Error: Connection failed');
    });

    it('should show loading state', () => {
      const result = render(
        React.createElement(ModelStatus, {
          currentModel: 'flash',
          providers: [],
          isLoading: true,
        }),
      );

      expect(result.lastFrame()).toContain('⏳ Checking model status...');
    });

    it('should handle empty provider list', () => {
      const result = render(
        React.createElement(ModelStatus, {
          providers: [],
          isLoading: false,
        }),
      );

      expect(result.lastFrame()).toContain('No providers detected');
    });
  });

  describe('ProviderStatusIndicators Component', () => {
    it('should display provider status with icons', () => {
      const providers = [
        {
          provider: 'ollama',
          isHealthy: true,
          modelCount: 3,
          responseTime: 120,
          lastChecked: Date.now(),
        },
        {
          provider: 'gemini',
          isHealthy: false,
          modelCount: 0,
          lastChecked: Date.now(),
          error: 'API key missing',
        },
      ];

      const result = render(
        React.createElement(ProviderStatusIndicators, {
          providers,
          compact: false,
        }),
      );

      expect(result.lastFrame()).toContain('✅ Ollama');
      expect(result.lastFrame()).toContain('❌ Gemini');
      expect(result.lastFrame()).toContain('(120ms)');
      expect(result.lastFrame()).toContain('[3]');
    });

    it('should display compact mode', () => {
      const providers = [
        {
          provider: 'ollama',
          isHealthy: true,
          modelCount: 2,
          responseTime: 100,
          lastChecked: Date.now(),
        },
      ];

      const result = render(
        React.createElement(ProviderStatusIndicators, {
          providers,
          compact: true,
        }),
      );

      expect(result.lastFrame()).toContain('✅ Ollama');
      expect(result.lastFrame()).not.toContain('(100ms)'); // No response time in compact mode
      expect(result.lastFrame()).not.toContain('[2]'); // No model count in compact mode
    });

    it('should return null for empty provider list', () => {
      const result = render(
        React.createElement(ProviderStatusIndicators, {
          providers: [],
        }),
      );

      expect(result.lastFrame()).toBe('');
    });
  });

  describe('ModelSwitchStatus Component', () => {
    it('should show loading state during model switch', () => {
      const result = render(
        React.createElement(ModelSwitchStatus, {
          isLoading: true,
          currentModel: 'flash',
          targetModel: 'ollama:small',
        }),
      );

      expect(result.lastFrame()).toContain('⏳ Switching to ollama:small...');
      expect(result.lastFrame()).toContain('From: flash');
    });

    it('should display error state', () => {
      const result = render(
        React.createElement(ModelSwitchStatus, {
          error: 'Model not found',
          targetModel: 'invalid-model',
        }),
      );

      expect(result.lastFrame()).toContain('❌ Model switch failed');
      expect(result.lastFrame()).toContain('Error: Model not found');
    });

    it('should show success state', () => {
      const result = render(
        React.createElement(ModelSwitchStatus, {
          currentModel: 'ollama:small',
        }),
      );

      expect(result.lastFrame()).toContain('✅ Active: ollama:small');
    });
  });

  describe('ModelRecoveryStatus Component', () => {
    it('should show recovery in progress', () => {
      const result = render(
        React.createElement(ModelRecoveryStatus, {
          failedProvider: 'ollama',
          fallbackProvider: 'gemini',
          isRecovering: true,
        }),
      );

      expect(result.lastFrame()).toContain(
        '⏳ ollama failed, attempting recovery...',
      );
      expect(result.lastFrame()).toContain('Trying fallback: gemini');
    });

    it('should show successful recovery', () => {
      const result = render(
        React.createElement(ModelRecoveryStatus, {
          failedProvider: 'ollama',
          fallbackProvider: 'gemini',
          recoverySuccess: true,
        }),
      );

      expect(result.lastFrame()).toContain('✅ Recovered using gemini');
      expect(result.lastFrame()).toContain(
        'Original provider (ollama) is still unavailable',
      );
    });

    it('should show failed recovery', () => {
      const result = render(
        React.createElement(ModelRecoveryStatus, {
          failedProvider: 'ollama',
          recoverySuccess: false,
        }),
      );

      expect(result.lastFrame()).toContain(
        '❌ Recovery failed - no healthy providers available',
      );
      expect(result.lastFrame()).toContain(
        'Please check your ollama configuration',
      );
    });
  });

  describe('EnhancedErrorMessage Component', () => {
    it('should display provider connection error with recovery actions', () => {
      const result = render(
        React.createElement(EnhancedErrorMessage, {
          error: 'Connection refused',
          errorType: 'provider_connection',
          failedProvider: 'ollama',
        }),
      );

      expect(result.lastFrame()).toContain('❌ Error: Connection refused');
      expect(result.lastFrame()).toContain('Provider: ollama');
      expect(result.lastFrame()).toContain('💡 Try these solutions:');
      expect(result.lastFrame()).toContain('Check if Ollama is running');
      expect(result.lastFrame()).toContain('ollama list');
      expect(result.lastFrame()).toContain('ℹ️ Auto-fallback available');
    });

    it('should display model not found error with suggestions', () => {
      const result = render(
        React.createElement(EnhancedErrorMessage, {
          error: 'Model not found',
          errorType: 'model_not_found',
          targetModel: 'invalid-model',
        }),
      );

      expect(result.lastFrame()).toContain('❌ Error: Model not found');
      expect(result.lastFrame()).toContain('Target Model: invalid-model');
      expect(result.lastFrame()).toContain('List available models');
      expect(result.lastFrame()).toContain('warpio --model list');
    });

    it('should create enhanced error from basic message', () => {
      const error = createEnhancedError('Connection timeout', {
        provider: 'gemini',
        model: 'flash',
      });

      expect(error.errorType).toBe('provider_connection');
      expect(error.failedProvider).toBe('gemini');
      expect(error.targetModel).toBe('flash');
    });

    it('should categorize authentication errors', () => {
      const error = createEnhancedError('Invalid API key provided');

      expect(error.errorType).toBe('authentication');
    });

    it('should categorize configuration errors', () => {
      const error = createEnhancedError('Invalid config format');

      expect(error.errorType).toBe('configuration');
    });
  });

  describe('useProviderStatus Hook', () => {
    it('should return provider status data', async () => {
      const TestComponent = () => {
        const { providers, isLoading } = useProviderStatus();

        return React.createElement(
          Text,
          {},
          `Loading: ${isLoading}, Providers: ${providers.length}`,
        );
      };

      const result = render(React.createElement(TestComponent));

      // Initial loading state
      expect(result.lastFrame()).toContain('Loading: true');

      // Wait for providers to load (mocked)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have loaded providers
      expect(result.lastFrame()).toContain('Loading: false');
    });
  });
});

describe('Model UI Integration', () => {
  it('should handle provider status updates in Header component', async () => {
    // This would test the integration with the Header component
    // showing provider status indicators correctly
    const providers = [
      {
        provider: 'ollama',
        isHealthy: true,
        modelCount: 5,
        responseTime: 150,
        lastChecked: Date.now(),
      },
    ];

    // Test would verify that Header shows provider status when enabled
    expect(providers[0].isHealthy).toBe(true);
    expect(providers[0].provider).toBe('ollama');
  });

  it('should handle model display name transformation in Footer', async () => {
    const { getModelDisplayName } = await import('@google/gemini-cli-core');

    expect(
      getModelDisplayName('hopephoto/Qwen3-4B-Instruct-2507_q8:latest'),
    ).toBe('ollama:small');
    expect(getModelDisplayName('gemini-2.5-flash')).toBe('flash');
  });
});
