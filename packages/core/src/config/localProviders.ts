/**
 * @license
 * Copyright 2025 IOWarp Team
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LocalProviderSettings {
  ollama?: {
    host?: string;
    models?: Record<string, string>; // alias -> model mapping
    defaultModel?: string;
    timeout?: number;
  };
  lmstudio?: {
    host?: string;
    apiKey?: string;
    models?: Record<string, string>;
    defaultModel?: string;
    timeout?: number;
  };
}

export const DEFAULT_LOCAL_SETTINGS: LocalProviderSettings = {
  ollama: {
    host: 'http://localhost:11434',
    timeout: 30000,
    models: {
      small: 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest',
      medium: 'gpt-oss:20b',
      large: 'qwen3-coder:latest',
    },
  },
  lmstudio: {
    host: 'http://localhost:1234',
    apiKey: 'lm-studio',
    timeout: 30000,
    models: {
      default: 'gpt-oss',
    },
  },
};

// Load settings from environment or config file
export function loadLocalProviderSettings(): LocalProviderSettings {
  const settings: LocalProviderSettings = { ...DEFAULT_LOCAL_SETTINGS };

  // Override with environment variables
  if (process.env.OLLAMA_HOST) {
    settings.ollama!.host = process.env.OLLAMA_HOST;
  }

  if (process.env.LMSTUDIO_HOST) {
    settings.lmstudio!.host = process.env.LMSTUDIO_HOST;
  }

  if (process.env.LMSTUDIO_API_KEY) {
    settings.lmstudio!.apiKey = process.env.LMSTUDIO_API_KEY;
  }

  // TODO: Load from ~/.warpio/settings.json

  return settings;
}
