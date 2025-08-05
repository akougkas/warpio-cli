# Warpio CLI Systematic Re-branding Plan

_Generated 2025-08-05_

## 1 Objectives

1. Replace every **user-facing** occurrence of “Gemini CLI / gemini” with “Warpio CLI / warpio”.
2. Preserve **all internal & API facing identifiers** (package names, env variables, class names) listed in CLAUDE.md §Technical Appendix.
3. Keep the fork fully **upstream-mergeable** by limiting the diff to string/asset changes only.
4. Maintain existing functionality & test coverage.

## 2 Non-Goals

• Refactoring business logic.  
• Changing public NPM package names (`@google/gemini-cli`, `@google/gemini-cli-core`).  
• Modifying environment variable names.

## 3 Constraints & Guidelines

| Area         | KEEP                                           | CHANGE                                                                     |
| ------------ | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Packages     | `@google/gemini-cli` `@google/gemini-cli-core` | Add `warpio` aliases only if non-breaking                                  |
| Env Vars     | `GEMINI_API_KEY` `GEMINI_SANDBOX`              | Provide docs alias env vars (`WARPIO_API_KEY`) but don’t reference in code |
| Code Symbols | `GeminiClient`, `geminiRequest`                | Wrap with façade if branding visible                                       |
| Files        | Internal filenames (e.g. `gemini.tsx`)         | User files (`.geminiignore`) → `.warpioignore` + backward compat           |

## 4 Work-Breakdown Structure

### Phase 0 — Audit (in progress)

1. Exhaustive search for user-visible strings: README, docs, `packages/**/src`, help/usage, errors, logs.
2. Catalogue each item with file/line ref → `search_index/…` for traceability.

### Phase 1 — Core CLI

1. `packages/cli`
   • Update command alias default from `gemini` → `warpio` while keeping `gemini` as hidden alias.  
   • Update help banners, error strings.
2. Update bin entry in `packages/cli/package.json` to export both commands.

### Phase 2 — README & Messaging

1. Update root `README.md` product references to **Warpio CLI**.
2. Prepend header disclaimer: _Formerly Gemini CLI – forked & rebranded by IOWarp; upstream compatibility preserved_.

### Phase 3 — Testing & QA

1. Run `npm run preflight` after CLI changes.
2. Update snapshot tests that include command name.
3. Manual smoke test of both `warpio` and legacy `gemini` commands.

### Phase 4 — Release

1. Tag `v0.1.17-warpio-beta` branch for internal distribution.
2. Prepare upstream PR summarising minimal branding diff.

## 5 Risks & Mitigations

| Risk                                   | Impact | Mitigation                                                              |
| -------------------------------------- | ------ | ----------------------------------------------------------------------- |
| Upstream changes overwrite branding    | Medium | Keep rebranding diff small & automate merge conflict resolution scripts |
| Tests break due to hard-coded "gemini" | High   | Parameterise product name constant; create dual-mode tests              |

## 6 Tooling

• Prefer semantic code searches via Context7 indexes under `search_index/`.  
• Use batch `grep` for quick string replacements.  
• Write todos via Cursor todo list to track progress.

---

_End of plan – see `/planning/rebranding.md` for updates._
