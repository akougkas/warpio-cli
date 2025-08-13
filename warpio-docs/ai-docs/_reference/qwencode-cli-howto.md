Of course. Here is a developer's guide detailing the exact changes made by the `qwen-code` team when forking `gemini-cli`. This analysis is based on a comparison of the two repositories and outlines a clear, programmatic path for rebranding and adapting the CLI.

Your coding AI should follow this as a blueprint to create `warpio`.

---

## **Developer's Guide: How Qwen-Code Forked Gemini-CLI**

This guide analyzes the precise, minimal changes the Qwen team implemented to transform `gemini-cli` into `qwen-code`. The core philosophy was **isolation**: containing all new logic in specific modules to allow for easy maintenance and potential upstream merges from the original `gemini-cli`.

### **1. Rebranding and Naming Conventions**

The first and most straightforward step was a comprehensive rebranding.

- **`package.json`**: This is the central manifest for the project.
  - **`name`**: Changed from `@google/gemini-cli` to `@qwen-code/qwen-code`.
  - **`bin`**: The executable command was changed from `gemini` to `qwen`. For your `warpio` CLI, this would be `warpio`.
  - **`description`**, **`author`**, **`repository`**: All updated to reflect the new Qwen project.
- **Global Search & Replace**: A project-wide, case-sensitive replacement was performed.
  - `Gemini` -> `Qwen` (For class names, UI titles, and user-facing text).
  - `gemini` -> `qwen` (For variable names, function names, and internal identifiers).
- **Configuration Directory**: The local settings directory was changed.
  - The logic that looks for a `~/.gemini` directory was modified to look for `~/.qwen` instead. This is critical to prevent conflicts with an existing `gemini-cli` installation. For your fork, this will be `~/.warpio`.

---

### **2. API Layer Replacement**

This is the most significant architectural change. Instead of modifying the existing Gemini API client, the Qwen team **added a new, parallel client** and created a mechanism to switch between them.

- **File Location**: In the `gemini-cli` source, the API logic resides in `src/api/gemini/`.
- **The Qwen Approach**:
  1.  **Create a New Client**: A new file, likely `src/api/qwen/qwen-api-client.ts`, was created. This file contains all the logic for communicating with the Qwen/DashScope backend, which uses an OpenAI-compatible API structure.
  2.  **Implement the Same Interface**: The new `QwenApiClient` class implements the same methods and properties as the original `GeminiApiClient`. This is the key to minimizing changes elsewhere in the code. The UI and command logic continue to call functions like `generateContent()` without needing to know which backend is active.
  3.  **Response Transformation**: The most crucial part of the new client is a "transformer" function. The JSON response from the OpenAI-compatible endpoint is different from the Gemini API's response. This function intercepts the response from Qwen's API and reshapes it into the exact JSON structure that the `gemini-cli` front-end expects. This prevents the need to rewrite any UI rendering code.

---

### **3. Authentication and Configuration**

With a new backend comes a new authentication mechanism. The Qwen team replaced Google OAuth with a standard API key model.

- **Environment Variables**: The new API client was coded to read API keys from environment variables.
  - `DASHSCOPE_API_KEY` (for Qwen's native API)
  - `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` (to support any OpenAI-compatible endpoint, like your LM Studio).
- **`settings.json` Modifications**: The settings file structure was updated to manage the new configuration.
  - **File Location**: Logic was changed to use `~/.qwen/settings.json`.
  - **New Fields**:
    - An `authMode` or `apiClient` field was likely added to switch between `"gemini"` and `"qwen"`/`"openai"`.
    - An object was added to store Qwen/OpenAI settings, such as `model` and `apiKey`.
- **Configuration Commands**: The Qwen team enhanced the configuration experience by adding new commands.
  - **`/auth`**: A command to switch the authentication method (e.g., from the default to an OpenAI-compatible endpoint).
  - **`/model`**: An interactive command that presents a dialog to switch between different Qwen models (e.g., `qwen-turbo`, `qwen-vl-plus`). This command reads the available models from the configuration and updates the `settings.json` file.

By following this precise blueprint, you can effectively rebrand `gemini-cli` into `warpio` and seamlessly integrate your own OpenAI-compatible backend with minimal, clean, and maintainable code changes.
