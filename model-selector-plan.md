## Warpio CLI – Model Selector feature plan (LLM-agnostic)

### Goals

- Add CLI selection: `warpio --model <name>` (already exists) and `warpio --model list` to print models and exit.
- Add interactive command: `/model <name>` to switch models at runtime and `/model list` to list models.
- Make the selector LLM-agnostic to support future providers (Anthropic, OpenAI, Ollama, LM Studio), while defaulting to Gemini today.
- Keep upstream compatibility and preserve `GeminiClient` naming in core.

### LLM-agnostic direction (architecture)

- Introduce a provider-aware model discovery + selection layer that works now for Gemini and is extendable to others, without renaming `GeminiClient`:
  - Model discovery aggregator: `ModelDiscoveryService` with provider adapters (Gemini, OpenAI, Anthropic, Ollama, LM Studio).
  - Provider selection in config: add `provider` field (default: `gemini`) alongside `model`.
  - Alias resolution per provider (e.g., `pro`, `flash` for Gemini; allow provider-prefixed inputs like `openai:gpt-5`).
  - Keep `GeminiClient` as a facade that uses provider-specific content generators via `createContentGenerator(...)` based on `config.provider`. Today only the Gemini generator exists; future adapters can be added behind the same interface.

### Key integration points (with code refs)

- CLI arg parsing is already in place:

```1:20:packages/cli/src/config/config.ts
    .option('model', {
      alias: 'm',
      type: 'string',
      description: `Model`,
      default: process.env.GEMINI_MODEL,
    })
```

- CLI entrypoint (best place to handle `--model list` early, before UI):

```150:167:packages/cli/src/gemini.tsx
  const argv = await parseArguments();
  const extensions = loadExtensions(workspaceRoot);
  const config = await loadCliConfig(
    settings.merged,
    extensions,
    sessionId,
    argv,
  );
```

- Runtime model is fully dynamic via `Config.getModel()` and `Config.setModel()`; the `GeminiClient` reads the model from `Config` on each use:

```397:407:packages/core/src/config/config.ts
  getModel(): string {
    return this.contentGeneratorConfig?.model || this.model;
  }

  setModel(newModel: string): void {
    if (this.contentGeneratorConfig) {
      this.contentGeneratorConfig.model = newModel;
    }
  }
```

- `GeminiClient` uses the current model repeatedly (switches are honored):

```486:501:packages/core/src/core/client.ts
    // Use current model from config instead of hardcoded Flash model
    const modelToUse =
      model || this.config.getModel() || DEFAULT_GEMINI_FLASH_MODEL;
    try {
      const userMemory = this.config.getUserMemory();
```

- Slash commands loader (add a new built-in `/model` command here):

```51:69:packages/cli/src/services/BuiltinCommandLoader.ts
  async loadCommands(_signal: AbortSignal): Promise<SlashCommand[]> {
    const allDefinitions: Array<SlashCommand | null> = [
      aboutCommand,
      authCommand,
      ...
      mcpCommand,
      memoryCommand,
      ...
    ];
```

### Design

1. CLI: `--model list` (provider-aware)

- Add early handling in `packages/cli/src/gemini.tsx` right after parsing `argv` and before building/rendering the app:
  - If `argv.model === 'list'`, call a new core helper to fetch models and print a grouped list, then `process.exit(0)`.
- Core helper: create `packages/core/src/core/modelDiscovery.ts` with:
  - `listAvailableModels(provider?: string): Promise<ModelInfo[]>` for a single provider.
  - `listAllProvidersModels(config): Promise<Record<provider, ModelInfo[]>>` to aggregate across configured/known providers.
  - Gemini adapter initially implemented using the same proxy pattern as `getEffectiveModel` (others stubbed or added later).
  - Reuse `ProxyAgent` from `undici` like in:

```47:55:packages/core/src/core/modelCheck.ts
    if (proxy) {
      setGlobalDispatcher(new ProxyAgent(proxy));
    }
```

- Pull credentials from env per provider (today: `GEMINI_API_KEY`), respect proxy variables as in `loadCliConfig`.
- Sort and print model ids grouped by provider; annotate aliases (pro/flash/flash-lite) where applicable.
- If no API key: print guidance and exit non-zero.

2. CLI: `--model pro|flash|<fullId>` and provider selection

- Keep existing `--model` behavior, but add alias resolution before constructing `Config`:
  - Add alias maps per provider in `packages/core/src/config/models.ts` and a resolver `resolveModelAlias(input: string, provider: string): string`.
  - Accept provider-qualified syntax: `--model openai:gpt-5` or `--model ollama:llama3`. If no prefix is given, default `provider=gemini`.
  - Aliases (to be finalized against Google docs):
    - `pro` -> full "pro" model id
    - `flash` -> `DEFAULT_GEMINI_FLASH_MODEL`
    - `flash-lite` -> `DEFAULT_GEMINI_FLASH_LITE_MODEL`
  - Add optional `--provider <name>` flag. Precedence: provider prefix in `--model` > `--provider` > default `gemini`.
  - In `loadCliConfig`, compute `{provider, model}` then resolve aliases and pass both to `new Config`.

3. Interactive: `/model`

- Add new command `packages/cli/src/ui/commands/modelCommand.ts`:
  - Usage: `/model list` shows grouped models by provider; `/model <provider>:<name>` or `/model <name>` (defaults to current provider) resolves aliases and switches via `config.setModel(name)` + optionally `config.setProvider(provider)`; clears fallback flag via `config.setFallbackMode(false)`.
  - Provide completion suggestions by fetching/caching the list once per session.
  - Provide feedback message with the selected model and a quick validation call (optional: one-token `countTokens` to verify availability).
- Register in `BuiltinCommandLoader`.

### UX/behavior

- Listing
  - Prints model ids grouped by provider in a compact, colored list; adds a legend for aliases.
  - If rate limited or network error, print a short error and exit gracefully.
- Switching (interactive)
  - On success: info message "Model set to <provider>:<id>" appears in history; the footer already tracks current model via `config.getModel()`, and can optionally include provider if we add `config.getProvider()` to the footer display later.
  - On failure: print error and keep current model unchanged.

### Documentation strategy (upstream-safe)

- Do not change upstream-owned docs under `docs/cli/*` to minimize merge conflicts.
- Add Warpio-specific docs under a new subtree: `docs/warpio/`.
  - `docs/warpio/model-selector.md`: CLI `--model list`, `--provider`, provider-prefixed syntax, alias table per provider.
  - `docs/warpio/commands/model.md`: `/model` command usage, completion, examples.
  - `docs/warpio/providers.md`: provider overview (Gemini now; Anthropic/OpenAI/Ollama/LM Studio later), auth/env vars, endpoints.
  - `docs/warpio/migration.md`: differences from upstream Gemini CLI and how Warpio extends it.
- Optional: In `README.md`, add a short Warpio section linking to `docs/warpio/` (keep upstream sections intact).
- CLI help text and slash-command help may reference these Warpio docs by path, avoiding edits to upstream docs.

### Testing

- Core
  - `modelDiscovery.test.ts`: Gemini adapter mocked; validates parsing/sorting; proxy honored; missing API key path. Stubs for other providers.
  - `models.test.ts`: alias resolution per provider; provider-prefixed inputs.
- CLI
  - `config.test.ts`: when `argv.model==='list'`, ensure we exit after printing; when `--model pro`, ensure `Config.getModel()` equals resolved id and `Config.getProvider()` is correct.
- UI
  - `modelCommand.test.ts`: list output (grouped), switch success (with and without provider prefix), invalid inputs, completion list.

### Implementation steps

1. Core: add `modelDiscovery.ts` with aggregator and a Gemini adapter; export from `packages/core/index.ts`.
2. Core: extend `packages/core/src/config/models.ts` with per-provider alias maps and `resolveModelAlias(provider, input)`; export.
3. Core: extend `ConfigParameters` and `Config` with `provider` (default `gemini`) and accessors `getProvider()/setProvider()`; no breaking renames.
4. Core: update `createContentGenerator(...)` to branch by `config.getProvider()` (today: only Gemini path implemented; others TODO-safe return).
5. CLI: handle `--model list` in `packages/cli/src/gemini.tsx` (before `loadCliConfig`/UI). Add optional `--provider` and provider-prefixed parsing.
6. CLI: in `loadCliConfig`, resolve `{provider, model}` using alias resolver, pass both to `new Config`.
7. UI: create `modelCommand.ts` and register in `BuiltinCommandLoader`.
8. Docs: create `docs/warpio/` pages listed above; do not modify `docs/cli/*`.
9. Tests as above; run `npm run preflight`.

### Notes / Open items

- Confirm latest model ids for "pro" alias; keep constants centralized in `config/models.ts`.
- Vertex AI vs Developer API listing: start with Developer API. Detect auth type and note limitations in output.
- Respect existing fallback logic; switching model should reset `inFallbackMode`.
- Provider credential discovery: future work to read `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and local endpoints for Ollama/LM Studio.
