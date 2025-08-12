# Warpio CLI Development Guide

This document defines the development workflow and agent architecture for Warpio CLI, part of the IOWarp ecosystem.

## CRITICAL: Start Every Session By Reading This File

When starting any Claude Code session:

1. Select Sonnet 4 as your main model
2. Your FIRST action must be: `Read("warpio-cli/CLAUDE.md")`
3. Check for `NEXT.md` file for specific session objectives
4. Follow the workflow defined below

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

## Implementation Status

**✅ ALL PHASES COMPLETE** - Warpio CLI is production-ready with:

- **Core System**: Complete CLI rebranding, themes, scientific identity
- **Multi-Agent Personas**: 5 IOWarp expert personas with automatic MCP provisioning
- **Context Handover**: MessagePack-optimized multi-agent workflows (3-5x faster)
- **LLM-Agnostic**: Model selector supporting Gemini + local models (LMStudio and Ollama)
- **Scientific Integration**: Zero-config access to HDF5, NetCDF, SLURM, ArXiv tools
- **Production Quality**: Comprehensive testing, upstream compatibility, docs

## Strategic Vision: Warpio Personas

**Competitive Advantage**: While Gemini CLI lacks subagent support, Warpio can leapfrog competitors by integrating IOWarp's mature 5-agent ecosystem as **personas**.

**Core Concept**: `warpio --persona data-expert` launches Warpio with IOWarp data-io-expert capabilities, system prompt, and specialized knowledge.

**IOWarp Agents to Port**:

1. `data-expert` (data-io-expert) - Scientific data formats & I/O
2. `analysis-expert` (analysis-viz-expert) - Data analysis & visualization
3. `hpc-expert` (hpc-performance-expert) - HPC optimization
4. `research-expert` (research-doc-expert) - Research documentation
5. `workflow-expert` (workflow-orchestrator) - Workflow management

**Implementation Status**:

- ✅ CLI args added (`--persona`, `--list-personas`, `--persona-help`)
- ✅ PersonaManager class created with IOWarp agent templates
- ✅ Complete persona context handover system implemented
- ✅ **Revolutionary Multi-Agent Workflows**: `handover_to_persona` tool enables seamless coordination
- ✅ **Performance Optimized**: MessagePack serialization provides 3-5x speed improvement
- ✅ **Production Ready**: Full integration with CLI, tools, and scientific contexts
- ✅ **Automatic IOWarp MCP Integration**: Each persona gets its required MCPs without user configuration

### Persona-MCP Mapping (Automatic)

| Persona             | Auto-Configured MCPs                                                | Purpose                       |
| ------------------- | ------------------------------------------------------------------- | ----------------------------- |
| **warpio**          | _None_                                                              | Clean basic experience        |
| **data-expert**     | `adios-mcp`, `hdf5-mcp`, `compression-mcp`                          | Scientific data I/O           |
| **analysis-expert** | `pandas-mcp`, `plot-mcp`                                            | Data analysis & visualization |
| **hpc-expert**      | `darshan-mcp`, `lmod-mcp`, `node-hardware-mcp`, `parallel-sort-mcp` | HPC optimization              |
| **research-expert** | `arxiv-mcp`                                                         | Research & documentation      |
| **workflow-expert** | _None_                                                              | Workflow orchestration        |

## Subagent Architecture

### Available Subagents (For Claude Code Sessions)

| Agent                | Model  | Purpose                                 | Tools                            | Output Format                             |
| -------------------- | ------ | --------------------------------------- | -------------------------------- | ----------------------------------------- |
| **docs-manager**     | Sonnet | `/docs/` directory + external libraries | Read, Glob, Grep, Context7       | 📚 Compact results with file:line refs    |
| **file-searcher**    | Sonnet | Codebase search (excludes docs/)        | Read, Glob, Grep, LS, Write, Run | 🔍 Advanced search with precise locations |
| **warpio-architect** | Opus   | Implementation plans for major features | All tools + extended thinking    | Complex architecture (user approval)      |

### 🚀 **Subagent Efficiency Features**

**Compact Output System**: All subagents provide **file:line-range references** instead of reproducing content

- ✅ **Master reads targeted sections only** - no context waste
- ✅ **Immediate actionability** - exact locations for code changes
- ✅ **Structured response formats** - consistent, parseable results

### 🎯 **Smart Decision Flow**

```
User Request → Main Agent Asks: "What specific information do I need?"

Query Routing:
• "Find X in docs/" → docs-manager → 📚 Returns file:line refs
• "Where is Z defined?" → file-searcher → 🔍 Returns exact locations
• "Find patterns like A" → file-searcher → 🔍 Advanced bash search
• "Multiple code searches" → parallel file-searcher instances
• "Major feature design" → warpio-architect (with user approval)

Result: Master agent gets precise file:line references → reads targeted sections → executes efficiently
```

### 🔄 **Efficient Workflow Cycle**

```mermaid
User Request → Query Analysis → Subagent(s) → Compact Results → Targeted Reading → Action
                     ↑                                                                    ↓
                Code Update ← Verification ← Implementation ← Code Analysis
```

### 📋 **Usage Patterns & Examples**

**Regular Feature - Parallel Discovery**:

```
User: "Add a config option for API timeout"

1. Parallel subagent queries:
   • docs-manager: "Configuration patterns in docs"
   • file-searcher: "Find existing timeout implementations"
   • file-searcher: "Locate config option patterns"

2. Results compilation:
   📚 /docs/config.md:12-20 - Config option documentation format
   🔍 /src/config.ts:34-38 - Existing timeout handling
   🔍 /src/api.ts:67-70 - API client timeout usage

3. Read targeted lines → Implement feature → Test validation
```

**Major Feature - Architect-Led**:

```
User: "Add a new plugin system"

1. Context gathering:
   • docs-manager: "Plugin architecture documentation"
   • file-searcher: "Find extension/plugin patterns"
   • file-searcher: "IOWarp integration patterns"

2. Results: Compact file:line references from all agents

3. warpio-architect: "Design plugin system" (with user approval)
   Input: All gathered context + user requirements
   Output: Detailed implementation plan

4. Execute plan using targeted subagent queries as needed
```

## 🔥 Core Development Philosophy

### **VIGILANCE PRINCIPLE**
> "DO NOT give up. Be vigilant and think hard to ensure we have the end result: a new enhanced fork of Gemini CLI that is upstream compatible and has all the original functionality. We built and extended it to add Warpio unique capabilities WITHOUT reimplementing core functionality OR overengineering. Simple additive coding."

### **Development DOS and DON'TS**

**✅ DO:**
- **Fix root causes** - Never add TODOs, mocks, or "temporary" fixes
- **Simple additive coding** - Wrap, don't rewrite. Use adapter patterns
- **Maintain upstream compatibility** - 100% original functionality preserved
- **Atomic commits** - Clear, descriptive messages for excellent git history
- **Test everything** - Run `npm run preflight` before claiming completion
- **Read efficiently** - Use file:line references to minimize context usage

**❌ DON'T:**
- **Never mock in production** - Implement real interfaces or eliminate
- **Never break Gemini** - All original commands must work unchanged
- **Never overengineer** - If solution is complex, rethink approach
- **Never leave slop code** - No unused imports, dead functions, duplicate logic
- **Never commit without testing** - Build, test, typecheck must pass
- **Never attribute AI** - Clean professional commits only

## Development Workflow

### 🧠 **Master Agent Capabilities**

**Core Principle**: Master agent executes most work directly ony after strategically leveraging subagents for targeted information gathering.

**Optimized Decision Making**:

- **Execute directly**: Most coding, fixes, and features
- **Query strategically**: Use subagents for specific information needs with precise questions
- **Read efficiently**: Use file:line references from subagents to read only relevant code sections
- **Cycle intelligently**: Query → targeted reading → implementation → verification
- **Parallel processing**: Launch multiple subagent queries simultaneously for comprehensive discovery

### 🎯 **When to Use Each Subagent**

**docs-manager** - `/docs/` directory specialist:

```
Input: "Find documentation for X feature"
Output: 📚 /docs/features.md:25-30 - X feature configuration examples
Action: Read specific lines, understand feature, implement accordingly
```

**file-searcher** - Advanced codebase analyst:

```
Input: "Find where authentication is implemented"
Output: 🔍 /src/auth.ts:45-52 - AuthManager class definition
        🔍 /src/api.ts:23-28 - Authentication middleware usage
Action: Read specific implementations, understand patterns, extend functionality
```

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

### ⚡ **Best Practices for Maximum Efficiency**

**Strategic Query Formation**:

- **Be specific**: "Find timeout configuration in API client" vs "Find timeout stuff"
- **Define scope**: "Search for error handling patterns" vs "Find errors"
- **Target results**: Ask for exactly what you need to find/implement/fix

**Optimal Subagent Usage**:

- **Parallel queries**: Launch multiple file-searcher instances for comprehensive discovery
- **Sequential refinement**: Use results from one agent to inform queries to others
- **Context preservation**: Use file:line references to read only what's needed
- **Trust outputs**: Each agent is optimized - use their structured results directly

**Efficient Reading Pattern**:

```
Subagent provides: /src/module.ts:45-50 - Function definition
Master action: Read /src/module.ts lines 45-50 only
Result: Targeted context without wasting token budget
```

**Updated Subagent Guidelines**:

- **docs-manager**: Documentation discovery, external library context, API references
- **file-searcher**: Code discovery, implementation patterns, architectural analysis (launch multiple in parallel)
- **warpio-architect**: Major feature design only (requires user approval)

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

### License Header Policy

**CRITICAL**: Warpio-specific files use IOWarp Team copyright, NOT Google LLC.

- **New IOWarp files**: Use `Copyright 2025 IOWarp Team` in license header
- **ESLint exceptions**: Add IOWarp files to license header exceptions in `eslint.config.js`
- **Never change**: IOWarp copyrights to Google LLC - this violates our licensing strategy
- **Process**: Add new IOWarp files to the exclusion list in ESLint config under the "Warpio files as needed" comment

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
  - Warpio .md files docs/warpio (except upstream attribution)
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
- **Current**: Up-to-date with upstream v0.1.18 + 140+ commits ahead
- **Branch**: `warpio/clean-local-ai-architecture` (active development)
- **Last Commit**: `a743f263` - Unified ModelManager architecture complete

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

### Git History Excellence

1. **Always branch strategically**: `git checkout -b warpio/[architecture|feature|fix]/description`
2. **Commit message structure**:
   ```
   feat|fix|refactor: concise summary (50 chars)
   
   WHAT changed:
   • Bullet points of specific changes
   
   WHY it matters:
   • Business/architecture impact
   
   VALIDATION:
   • Tests passing: X/X
   • Build status: clean
   ```
3. **Never commit incomplete work** - Each commit should be deployable
4. **Test comprehensively**: `npm run preflight` must pass 100%

## Upstream Merge Strategy

**✅ VALIDATED STRATEGY** - Successfully tested with upstream sync (August 2025)

The lightweight rebranding approach ensures seamless upstream compatibility:

1. **Minimal Diff Surface**: Changes limited to user-facing strings
2. **Preserved Git History**: No structural changes to core codebase
3. **Clean Separation**: Brand-specific changes clearly identifiable
4. **Easy Cherry-Picking**: Individual improvements can be contributed upstream

**Key Architecture Lessons**:

- **ModelManager Pattern**: Single entry point vastly simplifies multi-provider support
- **Interface Naming**: Avoid conflicts (e.g., ToolCall vs ModelManagerToolCall)
- **Systematic Elimination**: Remove ALL references when deprecating code
- **Provider Abstraction**: Clean adapters prevent provider logic bleeding into core
- **Test-Driven Fixes**: Let failing tests guide implementation, not assumptions

**Current Status**: All build errors resolved, system fully operational with three providers

### Tested Sync Process

```bash
# 1. Fetch latest upstream changes
git fetch upstream

# 2. Create test branch from current main
git checkout -b warpio/upstream-sync-$(date +%Y%m%d)

# 3. Merge upstream changes
git merge upstream/main
# Expected: Clean merge with minimal conflicts (docs only)

# 4. Test compatibility
npm run build && npm run typecheck && npm run test:ci

# 5. If successful, apply to main
git checkout main
git merge upstream/main
git push origin main
```

### Conflict Resolution Strategy

**Most Common Conflicts**: Documentation updates, minor feature additions
**Resolution**: Accept upstream changes, then re-apply our branding where needed, be methodical
**Protected Elements**: All Internal/API preservation rules (see Technical Appendix)

## Context7 MCP Integration

Enhanced documentation intelligence through external context retrieval.
Always prefer to use this to retrieve fresh docs from the web.

**Usage Pattern**:
```
1. Call resolve-library-id to get Context7-compatible ID
2. Use get-library-docs with the resolved ID
3. Provides up-to-date documentation for any library
```

## Testing Framework (Vitest)

- **Framework**: Vitest with `describe`, `it`, `expect`, `vi`
- **File Location**: `*.test.ts` co-located with source files
- **Setup**: Use `vi.resetAllMocks()` in `beforeEach`, `vi.restoreAllMocks()` in `afterEach`
- **Mocking**: `vi.mock()` for ES modules, `vi.spyOn()` for objects
- **React Testing**: Use `ink-testing-library` for terminal UI components

### Warpio Testing Strategy

**Minimal & Upstream-Safe Approach**:

- **Location**: `/test/` directory (separate from upstream tests)
- **Scripts**: `npm run test:warpio`, `npm run test:warpio:watch`, `npm run test:full`
- **Coverage**: 1416+ total tests, with Warpio-specific tests in `/test/` directory
- **Philosophy**: Test Warpio-specific functionality without duplicating upstream tests

**Test Structure**:

```
test/
├── e2e/
│   ├── model-switching.test.ts  # Provider routing & model discovery (5 tests)
│   ├── personas.test.ts         # Persona management (6 tests)
│   └── local-models.test.ts     # Integration testing (existing)
└── unit/
    ├── modelManager.test.ts     # ModelManager implementation (18 tests)
    └── adapters.test.ts         # Adapter implementations (tests)
```

---

## Latest Updates

### Model Selector Complete (August 2025)

- ✅ **LLM-Agnostic Model Selection**: `warpio -m flash -p "query"` works with 41+ models
- ✅ **Provider-Ready Architecture**: Extensible for OpenAI, Anthropic, local models
- ✅ **Complete Documentation**: README + docs/warpio/ coverage
- 🎯 **Strategic Focus**: API key authentication for multi-provider compatibility

**Supported Providers**:

- **Ollama**: Full native SDK integration with automatic model discovery
- **LMStudio**: Based on OpenAI SDK integration with automatic model discovery
- **Gemini**: Original functionality preserved (API key + OAuth)

**Working Commands**:

```bash
# Current provider syntax (DOUBLE COLON)
npx warpio -m lmstudio::qwen3-4b-instruct-2507@q4_k_m -p "Hello, who are you?"
npx warpio -m ollama::llama3:8b -p "Test local model"
npx warpio -m flash -p "Test Gemini"  # No prefix = Gemini

# Model discovery
npx warpio --model list  # Shows all 55+ models from all providers
```

### ModelManager Architecture (CRITICAL)

**Core Components**:
```typescript
// Singleton pattern - single source of truth
ModelManager.getInstance()
  .parseModel(input)     // Returns: {provider, modelName}
  .createClient(config)  // Returns: BaseClient (Gemini or OpenAI)
  .listModels()         // Returns: All available models
```

**Provider Routing**:
- **Gemini**: Direct passthrough to GeminiClient (preserves 100% functionality)
- **Local (Ollama/LMStudio)**: OpenAIAdapter wraps OpenAI SDK
- **Parsing**: `provider::model` format, `::` as separator
- **Fallback**: No `::` = Gemini provider assumed

**Key Features**:

- **Zero-Config Setup**: Works out-of-box with running Ollama server
- **Universal Syntax**: `provider::model` format (double colon separator)
- **Smart Provider Detection**: Discovers provider even without explicit prefixes
- **Production Ready**: Clean error handling and robust fallback systems
- **Code Quality**: Optimized TypeScript, removed debug artifacts, improved architecture
- **Upstream Safe**: Changes designed for seamless future upstream merges

## Current Status (January 2025)

**✅ UNIFIED MODELMANAGER ARCHITECTURE COMPLETE**: Production-ready unified model system with systematic deprecated code elimination.

**Architecture Achievement**:
- **ModelManager**: Single entry point for ALL model operations (parse, create, list)
- **Clean Adapter Pattern**: GeminiAdapter + OpenAIAdapter for provider separation
- **Systematic Cleanup**: Eliminated parseProviderModel, provider classes, duplicate code
- **Interface Resolution**: Fixed ToolCall conflicts, streamlined exports
- **Production Quality**: 1416/1416 tests passing, TypeScript builds clean

**Model Support**:
- **55+ Models**: Gemini (41), Ollama (5), LMStudio (9) 
- **Universal Format**: `provider::model_name` (e.g., `ollama::llama3`)
- **Backward Compatible**: Original `warpio -m flash` still works
- **Smart Detection**: Automatic provider discovery and health checking

**Production Features**:

- ✅ **Persona Management**: 5 IOWarp expert personas with automatic MCP provisioning
- ✅ **Model Selector**: 55+ models across Gemini, Ollama, LMStudio providers  
- ✅ **Local AI Support**: Full OpenAI SDK integration with tool calling
- ✅ **Universal Format**: `warpio -m provider::model` works for all providers
- ✅ **Backward Compatible**: Original `warpio -m flash` commands preserved

**Session Start Checklist**:

1. ✅ Read CLAUDE.md first (this file)
2. ✅ Check NEXT.md for session objectives
3. ✅ Review recent git history: `git log --oneline -10`
4. ✅ Verify clean working tree: `git status`
5. ✅ Run quick health check: `npx warpio --model list`

**Architecture Reminders**:

- **ModelManager is truth**: All model operations flow through ModelManager
- **Adapters isolate SDKs**: Gemini uses GenAI, Local uses OpenAI - never mix
- **Upstream first**: Every change must preserve original Gemini functionality
- **Clean > Clever**: Simple, obvious code beats clever abstractions
- **Test reality**: `npm run preflight` is final arbiter of success

---

## Quick Command Reference

```bash
# Development
npm run preflight              # Must pass before ANY commit
npm test                       # Run all 1416+ tests
npm run build                  # TypeScript compilation

# CLI Usage  
npx warpio --model list        # Show all 55+ models
npx warpio -m flash -p "test"  # Gemini (original)
npx warpio -m ollama::llama3   # Local model (new)

# Git Workflow
git checkout -b warpio/feature/description
git add -A && git commit       # With descriptive message
git log --oneline -10          # Review recent history
```

_This document captures the essence of Warpio CLI development: vigilant quality, simple additive coding, and unwavering upstream compatibility. Every session should strengthen these principles._
