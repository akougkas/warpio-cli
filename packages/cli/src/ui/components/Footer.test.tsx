/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { Footer } from './Footer.js';
import * as useTerminalSize from '../hooks/useTerminalSize.js';
import { tildeifyPath } from '@google/gemini-cli-core';
import path from 'node:path';

vi.mock('../hooks/useTerminalSize.js');
const useTerminalSizeMock = vi.mocked(useTerminalSize.useTerminalSize);

vi.mock('@google/gemini-cli-core', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@google/gemini-cli-core')>();
  return {
    ...original,
    shortenPath: (p: string, len: number) => {
      if (p.length > len) {
        return '...' + p.slice(p.length - len + 3);
      }
      return p;
    },
    // Mock the getModelDisplayName function for testing
    getModelDisplayName: (model: string) => {
      // Test mapping to verify the function is being called
      if (model === 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest')
        return 'ollama:small';
      if (model === 'gpt-oss:20b') return 'ollama:medium';
      if (model === 'qwen3-coder:latest') return 'ollama:large';
      if (model === 'gemini-2.5-flash') return 'flash';
      if (model === 'gemini-2.5-pro') return 'pro';
      return model; // Return as-is for unknown models
    },
  };
});

const defaultProps = {
  model: 'gemini-2.5-flash', // Use the current default but allow override in tests
  targetDir:
    '/Users/test/project/foo/bar/and/some/more/directories/to/make/it/long',
  branchName: 'main',
  debugMode: false,
  debugMessage: '',
  corgiMode: false,
  errorCount: 0,
  showErrorDetails: false,
  showMemoryUsage: false,
  promptTokenCount: 100,
  nightly: false,
};

const renderWithWidth = (width: number, props = defaultProps) => {
  useTerminalSizeMock.mockReturnValue({ columns: width, rows: 24 });
  return render(<Footer {...props} />);
};

describe('<Footer />', () => {
  it('renders the component', () => {
    const { lastFrame } = renderWithWidth(120);
    expect(lastFrame()).toBeDefined();
  });

  describe('path display', () => {
    it('should display shortened path on a wide terminal', () => {
      const { lastFrame } = renderWithWidth(120);
      const frame = lastFrame();
      // The footer should contain the directory name somewhere in the output
      expect(frame).toContain('/it/long');
      expect(frame).toContain('(main*)');
    });

    it('should display only the base directory name on a narrow terminal', () => {
      const { lastFrame } = renderWithWidth(79);
      const expectedPath = path.basename(defaultProps.targetDir);
      expect(lastFrame()).toContain(expectedPath);
    });

    it('should use wide layout at 80 columns', () => {
      const { lastFrame } = renderWithWidth(80);
      const frame = lastFrame();
      // The footer should contain the directory name somewhere in the output
      expect(frame).toContain('/it/long');
      expect(frame).toContain('(main*)');
    });

    it('should use narrow layout at 79 columns', () => {
      const { lastFrame } = renderWithWidth(79);
      const expectedPath = path.basename(defaultProps.targetDir);
      expect(lastFrame()).toContain(expectedPath);
      const tildePath = tildeifyPath(defaultProps.targetDir);
      const unexpectedPath = '...' + tildePath.slice(tildePath.length - 31 + 3);
      expect(lastFrame()).not.toContain(unexpectedPath);
    });
  });

  it('displays the branch name when provided', () => {
    const { lastFrame } = renderWithWidth(120);
    expect(lastFrame()).toContain(`(${defaultProps.branchName}*)`);
  });

  it('does not display the branch name when not provided', () => {
    const { lastFrame } = renderWithWidth(120, {
      ...defaultProps,
      branchName: undefined,
    });
    expect(lastFrame()).not.toContain(`(${defaultProps.branchName}*)`);
  });

  it('displays the model display name and context percentage', () => {
    const { lastFrame } = renderWithWidth(120);
    // Should show the display name (flash) instead of the full model name
    expect(lastFrame()).toContain('flash');
    expect(lastFrame()).toMatch(/\(\d+% context[\s\S]*left\)/);
  });

  it('displays friendly names for local models', () => {
    const { lastFrame } = renderWithWidth(120, {
      ...defaultProps,
      model: 'hopephoto/Qwen3-4B-Instruct-2507_q8:latest',
    });
    // Should show ollama:small instead of the full model name
    expect(lastFrame()).toContain('ollama:small');
  });

  it('displays friendly names for other local models', () => {
    const { lastFrame } = renderWithWidth(120, {
      ...defaultProps,
      model: 'gpt-oss:20b',
    });
    // Should show ollama:medium instead of the full model name
    expect(lastFrame()).toContain('ollama:medium');
  });
});
