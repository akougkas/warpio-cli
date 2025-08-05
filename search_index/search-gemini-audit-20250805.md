# Gemini References Audit – 2025-08-05

This file captures all **user-facing** occurrences of the words “Gemini CLI”, “gemini”, `.geminiignore`, etc. It is the source-of-truth for what must be rebranded to “Warpio CLI / warpio / .warpioignore”. Internal/API identifiers intentionally kept are marked **KEEP**.

> NOTE: Matches come from automated grep searches and may include some false positives. Each change item below should be verified during the re-branding phases.

---

## 1. Documentation (`*.md`)

| File                                      | Line                | Snippet                                            |
| ----------------------------------------- | ------------------- | -------------------------------------------------- |
| `ROADMAP.md`                              | 1,2,4,6,21,46,55,62 | "Gemini CLI ..."                                   |
| `docs/**` (12 files)                      | multiple            | Headings & prose use “Gemini CLI”, `.geminiignore` |
| `packages/vscode-ide-companion/README.md` | 1-15                | Extension docs mention Gemini CLI                  |
| `iowarp_context/brand_guidelines.md`      | line 30,45,56,79    | Comparison table                                   |

## 2. VS Code Extension (`packages/vscode-ide-companion/src`)

| File                    | Lines             | Action                                                                                               |
| ----------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `extension.ts`          | 12,36,56,65-89,93 | Command IDs `gemini.*`, output channel “Gemini CLI IDE Companion”, default terminal command `gemini` |
| `open-files-manager.ts` | 7                 | Import path (KEEP)                                                                                   |
| `diff-manager.ts`       | 81,204            | Command IDs `gemini.diff.*`                                                                          |
| `ide-server.ts`         | 228               | Server name `gemini-cli-companion-mcp-server`                                                        |

## 3. CLI Package (`packages/cli`)

| File                | Lines | Notes                                                     |
| ------------------- | ----- | --------------------------------------------------------- |
| `index.ts`          | 8-9   | Imports `./src/gemini.js` (KEEP internal file)            |
| `src/utils` & tests | many  | Update user-visible messages – keep internal package refs |

## 4. Core Package (`packages/core`)

Numerous occurrences of `GEMINI_DIR`, `.gemini`, `Gemini CLI` in log/error strings. Internal enums & constants starting with `GEMINI_` **KEEP**.

## 5. Config / Ignore Files

- `.geminiignore` documentation & tooling.
- Path constant `paths.ts → GEMINI_DIR = '.gemini'` (KEEP, but add `.warpio` alias).

## 6. Misc Assets & Scripts

- Dockerfile labels contain "Gemini CLI".
- GitService default user/email strings use "Gemini CLI" (user-visible in repo configs).

---

### Totals

- Documentation matches: 100+ lines across 15 files.
- TypeScript user-facing string matches: ~80 lines across 40 files.
- Command IDs / aliases to update: >20.
- Internal identifiers to **KEEP** (package names, env vars, constants): verified list in `CLAUDE.md`.

---

Follow-up: Each affected file will be updated during the relevant Phase (see `planning/rebranding.md`). This audit will be kept up-to-date as changes are made.
