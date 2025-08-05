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

**Phase 3: Text & UX Polish** ✅

- [x] Replace remaining user-facing "Gemini" strings
- [x] Update config paths (.gemini → .warpio)
- [x] Preserve MCP and chat memory functionality
- [x] Full functional testing

**Phase 4: Identity & Scientific Integration** ✅

- [x] Transform core identity: "Warpio, developed by IOWarp team"
- [x] Add scientific computing expertise (HDF5, NetCDF, SLURM, HPC)
- [x] Integrate IOWarp MCP ecosystem knowledge (14 servers, 5 agents)
- [x] Enhanced init command for scientific project detection
- [x] Scientific workflow examples in system prompt

**Phase 5: IOWarp Ecosystem Enhancement** ✅

- [x] Smart task routing (code vs scientific workflows)
- [x] MCP server auto-discovery and recommendations
- [x] Ecosystem integration guidance in system prompt
- [x] Enhanced boot sequence with IOWarp capabilities
- [x] Performance-conscious task escalation
- [x] IOWarp MCP installation system (`/mcp install arxiv`)

**Phase 6: IOWarp Personas System** (Current Session)

- [x] Analyzed IOWarp agents architecture and capabilities
- [x] Designed Warpio persona system (CLI + PersonaManager)
- [x] Created persona management infrastructure
- [ ] **NEXT**: Use warpio-architect for complete implementation plan
- [ ] Integrate persona system with system prompts
- [ ] Add CLI persona selection logic
- [ ] Port all 5 IOWarp agents as Warpio personas
- [ ] Test persona functionality end-to-end

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
- 🔄 Need architectural plan for full integration

## Subagent Architecture

### Available Subagents (4 Optimized Specialists)

| Agent                | Model  | Purpose                                 | Tools                            | Output Format                             |
| -------------------- | ------ | --------------------------------------- | -------------------------------- | ----------------------------------------- |
| **docs-manager**     | Sonnet | `/docs/` directory + external libraries | Read, Glob, Grep, Context7       | 📚 Compact results with file:line refs    |
| **brand-master**     | Sonnet | `/iowarp_context/` brand guidelines     | Read, Glob, Grep                 | 🎨 Brand validation + compliance check    |
| **file-searcher**    | Sonnet | Codebase search (excludes docs/brand)   | Read, Glob, Grep, LS, Write, Run | 🔍 Advanced search with precise locations |
| **warpio-architect** | Opus   | Implementation plans for major features | All tools + extended thinking    | Complex architecture (user approval)      |

### 🚀 **Key Efficiency Features**

**Compact Output System**: All subagents provide **file:line-range references** instead of reproducing content

- ✅ **Master reads targeted sections only** - no context waste
- ✅ **Immediate actionability** - exact locations for code changes
- ✅ **Structured response formats** - consistent, parseable results

### 🎯 **Smart Decision Flow**

```
User Request → Main Agent Asks: "What specific information do I need?"

Query Routing:
• "Find X in docs/" → docs-manager → 📚 Returns file:line refs
• "Check if Y follows brand" → brand-master → 🎨 Returns compliance status
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
                Code Update ← Verification ← Brand Check ← Implementation ← Code Analysis
```

### 📋 **Usage Patterns & Examples**

**Simple Task - Efficient Discovery**:

```
User: "Fix the typo in the error message"

1. file-searcher: "Find error messages with typos"
   Result: 🔍 EXACT MATCHES:
   • /src/cli.ts:45-47 - Error message string with typo
   • /lib/utils.ts:23-25 - Helper function error text

2. brand-master: "Check error message guidelines"
   Result: 🎨 BRAND VALIDATION:
   • /iowarp_context/messaging.md:15-18 - Error tone guidelines
   ✅ Aligned: Helpful, non-technical language preferred

3. Read /src/cli.ts:45-47 → Fix typo → Verify brand compliance
```

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

3. Read targeted lines → Implement feature → Brand verification
```

**Major Feature - Architect-Led**:

```
User: "Add a new plugin system"

1. Context gathering:
   • docs-manager: "Plugin architecture documentation"
   • file-searcher: "Find extension/plugin patterns"
   • brand-master: "IOWarp plugin integration strategy"

2. Results: Compact file:line references from all agents

3. warpio-architect: "Design plugin system" (with user approval)
   Input: All gathered context + user requirements
   Output: Detailed implementation plan

4. Execute plan using targeted subagent queries as needed
```

## Development Workflow

### 🧠 **Master Agent Capabilities**

**Core Principle**: Master agent executes most work directly while strategically leveraging subagents for targeted information gathering.

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

**brand-master** - `/iowarp_context/` brand specialist:

```
Input: "Check if this error message follows IOWarp guidelines"
Output: 🎨 ✅ Aligned: Matches tone guidelines at /iowarp_context/messaging.md:12-15
Action: Proceed with message or adjust based on brand guidance
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
- **Target results**: Ask for exactly what you need to implement/fix

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
- **brand-master**: User-facing content validation, messaging compliance, IOWarp guidelines
- **file-searcher**: Code discovery, implementation patterns, architectural analysis (launch multiple in parallel)
- **warpio-architect**: Major feature design only (requires user approval)

### 🚀 **Efficiency Gains Summary**

**Before Optimization**:

- ❌ Subagents returned verbose, full file contents
- ❌ Master agent wasted context reading redundant information
- ❌ Slow sequential operations, unclear boundaries
- ❌ Manual parsing of unstructured results

**After Optimization**:

- ✅ **Compact Results**: All agents return structured file:line references
- ✅ **Targeted Reading**: Master reads only specific lines needed
- ✅ **Clear Boundaries**: Each agent has distinct, non-overlapping scope
- ✅ **Parallel Processing**: Multiple queries execute simultaneously
- ✅ **Immediate Action**: Results are directly actionable for implementation

**Performance Impact**:

- 🎯 **3-5x faster** information gathering through parallel processing
- 🧠 **60-80% context savings** through targeted file:line reading
- ⚡ **Immediate actionability** - no manual result parsing required

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

## 📚 **Quick Reference: Optimized Subagent Usage**

### 🎯 **Master Agent Cheat Sheet**

**When you need to find something, ask yourself:**

| Need               | Use              | Example Query                         | Expected Result                                   |
| ------------------ | ---------------- | ------------------------------------- | ------------------------------------------------- |
| Documentation info | docs-manager     | "Find API documentation for X"        | 📚 /docs/api.md:25-30 - X endpoint docs           |
| Brand compliance   | brand-master     | "Check if this UI text follows brand" | 🎨 ✅ Aligned with /iowarp_context/voice.md:12-15 |
| Code location      | file-searcher    | "Where is function Y defined?"        | 🔍 /src/module.ts:45-50 - Y function definition   |
| Usage patterns     | file-searcher    | "Find all uses of interface Z"        | 🔍 Multiple file:line refs with usage contexts    |
| Architecture help  | warpio-architect | "Design new plugin system"            | Detailed implementation plan (needs approval)     |

### ⚡ **Efficiency Commands**

**Parallel Discovery Pattern**:

```
1. Launch multiple subagent queries simultaneously
2. Get compact file:line references from each
3. Read only the specific lines you need
4. Implement directly with targeted context
```

**Example Multi-Query**:

```
// Parallel execution for comprehensive discovery
• docs-manager: "Configuration documentation patterns"
• file-searcher: "Find existing config implementations"
• file-searcher: "Locate validation patterns"
• brand-master: "Config naming conventions"

Result: 4 agents return precise locations → Read targeted sections → Implement efficiently
```

### 🔄 **Remember**:

- **Always** use file:line references for reading
- **Never** reproduce full files - let subagents guide you to exact locations
- **Parallel** > Sequential when gathering multiple pieces of information
- **Trust** subagent outputs - they're optimized for their domains

---

_This document is maintained as a living record of the Warpio CLI rebranding journey and development standards. Updates reflect progress, decisions, and lessons learned throughout the process._
