/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CommandContext,
  SlashCommand,
  SlashCommandActionReturn,
  CommandKind,
} from './types.js';

export const initCommand: SlashCommand = {
  name: 'init',
  description: 'Analyzes the project and creates a tailored WARPIO.md file.',
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
    _args: string,
  ): Promise<SlashCommandActionReturn> => {
    if (!context.services.config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      };
    }
    const targetDir = context.services.config.getTargetDir();
    const warpioMdPath = path.join(targetDir, 'WARPIO.md');

    if (fs.existsSync(warpioMdPath)) {
      return {
        type: 'message',
        messageType: 'info',
        content:
          'A WARPIO.md file already exists in this directory. No changes were made.',
      };
    }

    // Create an empty WARPIO.md file
    fs.writeFileSync(warpioMdPath, '', 'utf8');

    context.ui.addItem(
      {
        type: 'info',
        text: 'Empty WARPIO.md created. Now analyzing the project to populate it.',
      },
      Date.now(),
    );

    return {
      type: 'submit_prompt',
      content: `
You are Warpio, developed by the IOWarp team, bringing AI-powered assistance to scientific computing and development workflows. Your task is to analyze the current directory and generate a comprehensive WARPIO.md file to be used as instructional context for future interactions.

**Analysis Process:**

1.  **Initial Exploration:**
    *   Start by listing the files and directories to get a high-level overview of the structure.
    *   Read the README file (e.g., \`README.md\`, \`README.txt\`) if it exists. This is often the best place to start.

2.  **Iterative Deep Dive (up to 10 files):**
    *   Based on your initial findings, select a few files that seem most important (e.g., configuration files, main source files, documentation).
    *   Read them. As you learn more, refine your understanding and decide which files to read next. You don't need to decide all 10 files at once. Let your discoveries guide your exploration.

3.  **Identify Project Type:**
    *   **Code Project:** Look for clues like \`package.json\`, \`requirements.txt\`, \`pom.xml\`, \`go.mod\`, \`Cargo.toml\`, \`build.gradle\`, or a \`src\` directory. If you find them, this is likely a software project.
    *   **Non-Code Project:** If you don't find code-related files, this might be a directory for documentation, research papers, notes, or something else.

**WARPIO.md Content Generation:**

**For a Scientific/Data Project:**

*   **Research Context:** Document the scientific domain, research questions, and data analysis goals.
*   **Data Assets:** List data files (HDF5, NetCDF, CSV, Parquet), their formats, and key variables.
*   **Computational Workflows:** Describe analysis pipelines, performance requirements, and HPC considerations.
*   **Dependencies:** Scientific libraries (numpy, scipy, pandas, xarray), visualization tools, and domain-specific packages.

**For a Code Project:**

*   **Project Overview:** Write a clear summary including any scientific computing or data processing focus.
*   **Building and Running:** Document commands, including any HPC job scripts or performance optimization flags.
*   **Development Conventions:** Include scientific coding practices, reproducibility requirements, and testing strategies.

**For a Non-Code Project:**

*   **Directory Overview:** Describe the purpose, focusing on research, data, or documentation aspects.
*   **Key Files:** List important files, especially data formats, analysis scripts, and documentation.
*   **Usage:** Explain workflows, including data processing and analysis patterns.

**Final Output:**

Write the complete content to the \`WARPIO.md\` file. The output must be well-formatted Markdown.
`,
    };
  },
};
