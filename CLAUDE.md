# Warpio CLI Development Guide

This document defines the development workflow and agent architecture for Warpio CLI, part of the IOWarp ecosystem.

## CRITICAL: Start Every Session By Reading This File

When starting any Claude Code session:

1. Select Sonnet 4 as your main model
2. Your FIRST action must be: `Read("/mnt/nfs/dev/warpio-cli/CLAUDE.md")`
3. Follow the workflow defined below

## Project Overview

**Product**: Warpio CLI - Conversational AI interface to the IOWarp ecosystem  
**Base**: Fork of [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)  
**Strategy**: Strategic enhancements while maintaining upstream compatibility

## Rebranding Philosophy

### User-Facing Changes (Safe to Rebrand)

- Documentation references: "Gemini CLI" → "Warpio CLI"
- Command examples: `gemini` → `warpio`
- Help text, error messages, CLI banners
- File names: `.geminiignore` → `.warpioignore`
- Screenshots, assets, user-visible strings

### Internal/API Preservation (NEVER Change)

- Package names: `@google/gemini-cli-core` (NPM compatibility)
- Environment variables: `GEMINI_API_KEY`, `GEMINI_SANDBOX`
- API client code: `GeminiClient`, `geminiRequest` functions
- Internal file structure: `gemini.tsx`, `geminiChat.ts`
- Build configuration internals

## Current Implementation Status

**Phase 1: Infrastructure Setup** ✅

- [x] Basic CLI rebranding (warpio command functional)
- [x] Subagent architecture optimized
- [x] Brand context management system

**Phase 2: Brand Theme & CLI Visuals** ✅

- [x] Warpio dark theme (Blue → Green → Orange gradient)
- [x] CLI banner, prompt colours, tips updated
- [ ] Documentation sweep (docs/ directory)
- [ ] Asset and screenshot updates
- [ ] VS Code extension rebranding (deferred)

**Phase 3: Text & UX Polish** (In Progress)

- [ ] Replace remaining user-facing "Gemini" strings
- [ ] Update config paths (.gemini → .warpio)
- [ ] Preserve MCP and chat memory functionality
- [ ] Full functional testing

## Subagent Architecture

### Available Subagents (4 Specialized Agents)

| Agent                | Model  | Purpose                                     | Tools                         | Usage                                 |
| -------------------- | ------ | ------------------------------------------- | ----------------------------- | ------------------------------------- |
| **docs-manager**     | Sonnet | Technical documentation, external libraries | Read, Glob, Grep, Context7    | Get facts, patterns, library info     |
| **brand-master**     | Sonnet | IOWarp brand guidelines, messaging          | Read, Glob, Grep              | Verify user-facing content            |
| **file-searcher**    | Haiku  | Universal codebase search                   | Read, Glob, Grep, LS, Write   | Find code patterns (parallel capable) |
| **warpio-architect** | Opus   | Implementation plans for major features     | All tools + extended thinking | Complex architecture (user approval)  |

### Organic Decision Flow

```
User Request → Main Agent Asks: "What do I need?"

Available Actions:
• Need facts? → docs-manager
• Need brand check? → brand-master
• Need to find code? → file-searcher
• Need multiple searches? → parallel file-searcher queries
• Major architecture? → warpio-architect (with approval)

Then: Code → Search → Verify → Code (as needed)
```

### Usage Patterns & Examples

**Simple Task - Organic Flow**:

```
User: "Fix the typo in the error message"
→ file-searcher: "Find error message with typo"
→ brand-master: "Get IOWarp messaging guidelines"
→ Fix typo with proper branding
```

**Regular Feature - Flexible Discovery**:

```
User: "Add a config option for API timeout"
→ docs-manager: "Get configuration documentation"
→ file-searcher: "Find existing timeout implementations"
→ file-searcher: "Locate package.json config patterns"
→ Implement timeout option
→ brand-master: "Verify naming follows Warpio standards"
```

**Major Feature - Architect-Driven**:

```
User: "Add a new plugin system"
→ docs-manager: "Get current architecture patterns"
→ brand-master: "Get IOWarp integration strategy"
→ file-searcher: "Find existing extension/plugin code"
→ warpio-architect: "Create plugin system architecture plan" (with user approval)
→ Execute plan using subagents as needed
```

## Development Workflow

### Main Agent Capabilities

**Core Principle**: Main agent executes most work directly while organically using subagents when they add value.

**Smart Decision Making**:

- Execute coding, fixes, and features directly
- Use subagents when you need specific information or capabilities
- Cycle between coding → searching → verifying → planning as needed
- Launch parallel file-searcher queries for comprehensive discovery

### Architect Usage Protocol

**When to use warpio-architect**:

- Major new features requiring system design
- Breaking changes affecting multiple components
- Complex refactoring with architectural implications

**Process**:

1. Gather context with other subagents as needed
2. **Ask user permission**: "This requires the warpio-architect. Shall I proceed with architectural planning?"
3. Only proceed with user approval
4. Pass context to architect for implementation plan
5. Execute plan, using subagents as needed during implementation

### Best Practices

**Organic Decision Making**:

- Think "What do I need to know?" → Use appropriate subagent
- Use multiple file-searcher instances for different search queries
- Get user approval before using warpio-architect
- Trust subagent outputs - each is optimized for its domain

**Subagent Usage Guidelines**:

- **docs-manager**: Technical facts, patterns, external library context
- **brand-master**: User-facing content, messaging guidelines
- **file-searcher**: Code discovery, pattern matching (launch multiple in parallel)
- **warpio-architect**: Implementation plans for major features only

### Search Index System

File-searcher creates persistent indexes: `/search_index/search-[query-hash]-[timestamp].md`

### Planning Folder

Warpio-architect writes implementation plans to: `/planning/[feature-name].md`

## Development Standards

### Building and Testing

```bash
npm run preflight  # Builds, tests, typechecks, and lints
```

### Code Standards

- Prefer plain objects + TypeScript interfaces over classes
- Use ES module syntax (`import`/`export`)
- Avoid `any` types - prefer `unknown` with type narrowing
- Follow React Hooks rules strictly
- Use functional array operators (`.map()`, `.filter()`, `.reduce()`)

### Architecture Principles

- Immutable data patterns aligned with React reconciliation
- Pure component functions without render side effects
- One-way data flow through props and context
- ES modules for clear public/private API boundaries

---

# Technical Appendix

## Compatibility Requirements

### MUST PRESERVE (Internal/API)

```yaml
Package Names:
  - '@google/gemini-cli-core' # NPM compatibility
  - '@google/gemini-cli' # CLI package internal name

Environment Variables:
  - GEMINI_API_KEY # Google API authentication
  - GEMINI_SANDBOX # Sandbox execution mode

API Functions:
  - GeminiClient # Core API client class
  - geminiRequest # API request functions
  - All @google/genai SDK integration
```

### SAFE TO REBRAND (User-Facing)

```yaml
User Interface:
  - Command name: "gemini" → "warpio"
  - Product references: "Gemini CLI" → "Warpio CLI"
  - Help text, error messages, CLI banners

Documentation:
  - All .md files (except upstream attribution)
  - Screenshots and visual assets
  - Configuration examples in docs

File Conventions:
  - .geminiignore → .warpioignore
  - User configuration directory names
```

## Architecture Overview

**Monorepo Structure**: TypeScript-based with 3 core packages:

- **Root**: `@warpio/warpio-cli` - Orchestration, CLI entry point
- **CLI**: `@google/gemini-cli` - Terminal UI (React/Ink)
- **Core**: `@google/gemini-cli-core` - Backend engine, API integration
- **VS Code**: `gemini-cli-vscode-ide-companion` - IDE integration

## Git Workflow Strategy

### Repository Status

- **Origin**: `git@github.com:akougkas/warpio-cli.git` (our fork)
- **Upstream**: `git@github.com:google-gemini/gemini-cli.git` (Google's repo)
- **Current**: Up-to-date with upstream v0.1.17

### Branching Strategy

```bash
main                    # Our stable fork with rebranding
upstream/main          # Google's original repository
warpio/rebranding      # Systematic rebranding work
warpio/feature/*       # New IOWarp-specific features
```

### Upstream Integration

```bash
# Regular upstream sync
git fetch upstream
git checkout -b warpio/upstream-sync-$(date +%Y%m%d)
git merge upstream/main
# Resolve branding conflicts preserving our changes
```

### Best Practices for Claude Code

1. **Always branch before major edits**: `git checkout -b warpio/task-name`
2. **Atomic commits**: One logical change per commit
3. **Descriptive messages**: Clear intent and scope
4. **Test before merge**: Verify functionality after changes

## Upstream Merge Strategy

The lightweight rebranding approach ensures:

1. **Minimal Diff Surface**: Changes limited to user-facing strings
2. **Preserved Git History**: No structural changes to core codebase
3. **Clean Separation**: Brand-specific changes clearly identifiable
4. **Easy Cherry-Picking**: Individual improvements can be contributed upstream

## Context7 MCP Integration

Enhanced documentation intelligence through external context retrieval:

**Real-time Documentation Access**:

- **TypeScript v5.3.3**: Language features, compiler options
- **React v19.1.0 + Ink v6.0.1**: Terminal UI patterns
- **Vitest v3.2.4**: Testing framework specifics
- **Node.js >=20**: Runtime environment and built-in modules

**Dependency Intelligence**:

- **@google/genai v1.9.0**: Google AI SDK patterns
- **@modelcontextprotocol/sdk v1.11.0**: MCP protocol implementation
- **Build Tools**: esbuild, ESLint, Docker configuration patterns

## Testing Framework (Vitest)

- **Framework**: Vitest with `describe`, `it`, `expect`, `vi`
- **File Location**: `*.test.ts` co-located with source files
- **Setup**: Use `vi.resetAllMocks()` in `beforeEach`, `vi.restoreAllMocks()` in `afterEach`
- **Mocking**: `vi.mock()` for ES modules, `vi.spyOn()` for objects
- **React Testing**: Use `ink-testing-library` for terminal UI components

---

_This document is maintained as a living record of the Warpio CLI rebranding journey and development standards. Updates reflect progress, decisions, and lessons learned throughout the process._
