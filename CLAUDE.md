# Warpio CLI - Development Guide

IMPORTANT: This is the master instructions file for Claude Code. Read this file at the start of every session.

## Project Overview

**Product**: Warpio CLI - AI-powered scientific computing interface  
**Foundation**: Fork of google-gemini/gemini-cli with strategic enhancements  
**Core Value**: Scientific computing capabilities via IOWarp ecosystem integration  
**Model Support**: Gemini models + OpenAI-compatible endpoints (LM Studio, Ollama)

## 🎯 Subagent Architecture

You have access to specialized subagents for efficient task delegation. ALWAYS use subagents for searching and information gathering - they run on cheaper/faster models.

### Available Subagents

| Agent                | Purpose                    | When to Use                                        | Key Output                             |
| -------------------- | -------------------------- | -------------------------------------------------- | -------------------------------------- |
| **file-searcher**    | Lightning-fast code search | Finding definitions, usages, patterns              | File:line references                   |
| **docs-manager**     | Documentation retrieval    | /docs/, /warpio-docs/, external libraries          | Compact doc references                 |
| **warpio-architect** | High-intelligence planning | Major features, complex debugging (needs approval) | Written plans in /warpio-docs/ai-docs/ |

### 🚀 Efficient Workflow Pattern

```
1. PARALLEL SEARCH (always use subagents):
   - Task(file-searcher): "Find X implementation"
   - Task(file-searcher): "Locate Y patterns"
   - Task(docs-manager): "Get Z documentation"

2. TARGETED READING (only specific lines):
   - Subagent returns: "Found at file.ts:45-50"
   - You read: Read("file.ts", offset=45, limit=5)

3. DIRECT IMPLEMENTATION:
   - Use gathered context efficiently
   - Implement changes directly
   - Verify with tests
```

**CRITICAL RULES**:

- NEVER use Grep/Glob/LS directly - ALWAYS use file-searcher
- NEVER search docs yourself - ALWAYS use docs-manager
- ALWAYS launch multiple subagents in parallel for speed
- ONLY read specific line ranges provided by subagents

## ⚡ Parallel Subagent Execution Patterns

### 🎯 Golden Rule: BATCH ALL INDEPENDENT SUBAGENT CALLS

**❌ SERIAL (Slow - waits for each):**

```
Response 1: Task(file-searcher, "find X")
Response 2: Task(docs-manager, "get Y docs")
Response 3: Task(file-searcher, "find Z")
```

**✅ PARALLEL (Fast - all launch simultaneously):**

```
Single Response:
- Task(file-searcher, "find X")
- Task(docs-manager, "get Y docs")
- Task(file-searcher, "find Z")
```

### 🔄 Dependency Chain Patterns

**Pattern 1: Independent Parallel → Single Convergence**

```
BATCH 1 (parallel):
- Task(file-searcher, "find all providers")
- Task(file-searcher, "find config files")
- Task(docs-manager, "get setup docs")

BATCH 2 (after analysis):
- Task(warpio-architect, "design solution using gathered context")
```

**Pattern 2: Fan-Out → Fan-In → Continue**

```
BATCH 1 (parallel search):
- Task(file-searcher, "find API endpoints")
- Task(file-searcher, "find auth patterns")
- Task(docs-manager, "get API docs")

BATCH 2 (parallel analysis):
- Task(warpio-architect, "analyze security patterns")
- Task(file-searcher, "find test patterns")

BATCH 3 (implementation):
- Direct implementation with gathered context
```

**Pattern 3: Sequential When Dependencies Exist**

```
STEP 1: Task(file-searcher, "find main config loader")
STEP 2: [Read specific files found in step 1]
STEP 3: Task(file-searcher, "find all usages of ConfigLoader class")
STEP 4: [Implement changes based on usage patterns]
```

### 🧠 Warpio-Architect Subagent Orchestration

The warpio-architect can launch its own subagents for complex analysis:

```
ARCHITECT WORKFLOW:
1. Task(warpio-architect, "analyze provider architecture")

   INSIDE ARCHITECT:
   - Task(file-searcher, "find provider implementations")
   - Task(file-searcher, "find config handling")
   - Task(docs-manager, "get architecture docs")
   - [Extended thinking analysis with gathered context]
   - [Write comprehensive plan to /warpio-docs/ai-docs/]
```

### 🚀 Advanced Parallel Patterns

**Multi-Level Orchestration:**

```
LEVEL 1 (master → subagents):
- Task(file-searcher, "find build system")
- Task(docs-manager, "get build docs")
- Task(warpio-architect, "analyze build performance")

LEVEL 2 (architect → its subagents):
Inside warpio-architect:
- Task(file-searcher, "find webpack config")
- Task(file-searcher, "find bundling patterns")
- [Deep analysis with Opus model]
```

**Conditional Chaining:**

```python
# Pseudocode for complex workflows
batch1_results = parallel_launch([
    file_searcher("find error patterns"),
    docs_manager("get error handling docs")
])

if "complex_errors_found" in batch1_results:
    batch2 = parallel_launch([
        warpio_architect("debug complex errors"),
        file_searcher("find error recovery patterns")
    ])
else:
    # Simple path - direct implementation
    implement_simple_fix()
```

### ⚡ Performance Optimization Rules

1. **Always Default to Parallel**: Unless there's a clear dependency, launch all subagents in one batch

2. **Trust Subagent Results**: Never re-search what subagents already found

3. **Chain Only When Required**:
   - ✅ File must exist before reading it
   - ✅ Class definition needed before finding usages
   - ❌ Don't chain just for convenience

4. **Use Architect Wisely**: Reserve for complex analysis requiring extended thinking

5. **Minimize Master Agent Work**: Let subagents do searching, master agent does coordination

### 📊 Execution Time Examples

**Serial Approach (SLOW):**

```
Task 1: file-searcher (2s)
Task 2: docs-manager (1.5s)
Task 3: file-searcher (2s)
Total: 5.5 seconds
```

**Parallel Approach (FAST):**

```
All Tasks: launched simultaneously
Wait for slowest: 2 seconds
Total: 2 seconds (2.75x faster)
```

### 🎯 Common Workflow Templates

**Template 1: Feature Implementation**

```
BATCH 1 (parallel discovery):
- Task(file-searcher, "find similar features")
- Task(file-searcher, "find config patterns")
- Task(docs-manager, "get feature documentation")

ANALYZE: [Use gathered context for planning]

BATCH 2 (parallel implementation prep):
- Task(file-searcher, "find test patterns")
- Task(warpio-architect, "design architecture") [if complex]

IMPLEMENT: [Direct implementation with all context]
```

**Template 2: Bug Investigation**

```
BATCH 1 (parallel evidence gathering):
- Task(file-searcher, "find error locations")
- Task(file-searcher, "find similar bugs")
- Task(docs-manager, "get troubleshooting docs")

BATCH 2 (parallel analysis):
- Task(warpio-architect, "debug root cause analysis")
- Task(file-searcher, "find fix patterns")

FIX: [Implement solution]
```

**Template 3: Architecture Review**

```
BATCH 1 (parallel codebase analysis):
- Task(file-searcher, "find current implementation")
- Task(file-searcher, "find usage patterns")
- Task(docs-manager, "get external library docs")

BATCH 2 (comparison analysis):
- Task(warpio-architect, "competitive analysis with alternatives")

DECISION: [Based on comprehensive analysis]
```

### 🚨 Critical Performance Rules

- **NEVER use sequential Task calls unless dependencies require it**
- **BATCH everything possible in single responses**
- **Trust subagent expertise - don't double-check their work**
- **Use architect for high-intelligence analysis, not searching**
- **Read only specific line ranges returned by subagents**

## 🚫 Git Commit Attribution Policy

**IMPORTANT**: All git commits are automatically checked for AI attribution. Any commits containing references to Claude, Anthropic, AI, or similar terms will be BLOCKED. This ensures all code is properly attributed to the developer. The pre-commit hook in `.claude/settings.json` enforces this policy.

## 📋 Development Standards

### Commands

```bash
npm run preflight    # Build, test, typecheck, and lint
npm run build        # Build all packages
npm run typecheck    # Run TypeScript checks
npm run lint         # Run linting
npm run test:ci      # Run test suite
```

### Code Style

- Use ES modules (`import`/`export`) not CommonJS
- Prefer TypeScript interfaces over classes
- Avoid `any` types - use `unknown` with narrowing
- Follow existing patterns in neighboring files
- No comments unless explicitly requested

### Architecture Principles

- Immutable data patterns (React reconciliation)
- Pure functions without side effects
- One-way data flow
- Functional array operators (map, filter, reduce)

## 🔒 Compatibility Requirements

### MUST PRESERVE (Never Change)

- Package names: `@google/gemini-cli-core`, `@google/gemini-cli`
- Environment variables: `GEMINI_API_KEY`, `GEMINI_SANDBOX`
- API classes: `GeminiClient`, `geminiRequest`
- Internal file structure: `gemini.tsx`, `geminiChat.ts`

### Safe to Rebrand

- User-facing strings: "Gemini CLI" → "Warpio CLI"
- Command name: `gemini` → `warpio`
- Documentation and help text
- Config files: `.geminiignore` → `.warpioignore`

## 🚀 Warpio Personas (Killer Feature!)

### How It Works

```bash
# Your .env sets the PROVIDER (which AI to use)
WARPIO_PROVIDER=lmstudio  # or gemini, ollama

# Personas set the BEHAVIOR (how the AI acts)
npx warpio --persona data-expert -p "Convert NetCDF to HDF5"
# Uses YOUR configured provider with data-expert specialization
```

### Available Personas

| Persona         | MCPs Auto-Configured         | Use Case                      | Status         |
| --------------- | ---------------------------- | ----------------------------- | -------------- |
| warpio          | None                         | General purpose               | ✅ Implemented |
| data-expert     | adios, hdf5, compression     | Scientific data I/O           | 🚧 Need polish |
| analysis-expert | pandas, plot                 | Data analysis & visualization | 🚧 Need polish |
| hpc-expert      | darshan, lmod, node-hardware | HPC optimization              | 🚧 Need polish |
| research-expert | arxiv                        | Research & documentation      | 🚧 Need polish |
| workflow-expert | None                         | Workflow orchestration        | 🚧 Need polish |

- **Provider (ENV vars)**: Controls which AI inference to use (Gemini, LMStudio, Ollama)
- **Persona (CLI flag)**: Controls how the AI behaves (system prompts, custom models, tools, expertise)
- **These don't interfere**: Personas should work with any provider any model!

## 📝 Quick Reference

### Finding Information

- **Code search**: Use file-searcher subagent
- **Documentation**: Use docs-manager subagent
- **Architecture planning**: Use warpio-architect (with permission)
- **Development history**: See `.claude/devlog.md`

### Git Workflow

```bash
git checkout -b warpio/feature-name  # New feature branch
git fetch upstream                   # Sync with google-gemini/gemini-cli
git merge upstream/main              # Merge upstream changes
```

### Testing Changes

1. Run `npm run preflight` before committing
2. Test persona functionality if modified
3. Verify MCP integration works
4. Check upstream compatibility

### Provider Testing Commands

```bash
# Test simple chat (should work with all providers)
npx warpio -p "hi who are you and what can you do?"

# Test with specific provider
WARPIO_PROVIDER=gemini npx warpio -p "What is 2+2?"
WARPIO_PROVIDER=lmstudio npx warpio -p "What is 2+2?"

# Test tool usage (requires capable model)
npx warpio -p "list the files here and if there is a README.md read it and summarize it"

# Test with personas
npx warpio --persona data-expert -p "What tools do I have available?"
```

**Note**: Tool usage quality depends on model capabilities. Smaller local models may have limited tool-calling abilities compared to Gemini models. Don't assume it's the model that fails but actually debug to see what fails (low intelligence or bad warpio code?)

## ⚡ Performance Tips

- Launch multiple file-searcher queries in PARALLEL
- Read only specific line ranges (never entire files)
- Trust subagent results completely
- Use warpio-architect only for major features or reviews or quick brainstorming
- Batch tool calls when possible

## 🔧 Provider Configuration - Simple ENV-Only Approach

**CRITICAL**: Warpio uses a simple ENV-only configuration. No JSON files, no complex validators, just environment variables.

### Supported Providers

- **Gemini** (default): Original Google Gemini models
- **LM Studio**: Local models via OpenAI-compatible endpoint
- **Ollama**: Local models via OpenAI-compatible endpoint

### Configuration (Just ENV Variables!)

```bash
# .env file - that's ALL you need!

# To use Gemini (default)
GEMINI_API_KEY=your_key_here

# To use LMStudio
WARPIO_PROVIDER=lmstudio
LMSTUDIO_HOST=http://192.168.86.20:1234/v1
LMSTUDIO_MODEL=gpt-oss-20b
LMSTUDIO_API_KEY=optional

# To use Ollama
WARPIO_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3-4b
```

### How It Works

1. Set `WARPIO_PROVIDER` in your .env file
2. Run `npx warpio`
3. It uses your configured provider
4. That's it!

**NO configuration files, NO complex validation, NO provider registries**

### ✅ CURRENT STATUS: Configuration System COMPLETE

**Status**: Production-ready ENV-only configuration system implemented
**Implementation**: Clean, simple environment variable approach working perfectly
**Result**: Qwen model functioning correctly via LMStudio with zero configuration files

### ✅ Configuration Crisis RESOLVED

- **✅ ENV-Only Success**: Simple `WARPIO_PROVIDER=lmstudio` configuration working
- **✅ Clean Output**: No more IDE errors, deprecation warnings, or double responses  
- **✅ Streaming Fixed**: "What is 3+3?" correctly returns "6" instead of "66"
- **✅ Production Ready**: Zero configuration files, predictable behavior

### ✅ Architecture Cleanup Completed

**Removed**:
- Entire `/packages/core/src/warpio/config/` directory
- Complex configuration loaders and validators
- Hardcoded fallbacks and silent failures
- Deprecation warnings and console noise

**Simplified**:
- Provider registry to simple switch statements
- Content generator creation with caching
- Stream response handling (fixed duplication bug)
- CLI integration to basic ENV parsing

### Architecture Constraints

- **Maintain Isolation**: Warpio code stays in `/packages/core/src/warpio/`
- **Preserve Gemini Core**: Use existing infrastructure, add provider choice
- **Zero Breaking Changes**: Existing Gemini CLI must work unchanged
- **Full Vercel AI SDK Compliance**: No custom transformations, use SDK natively

See `/warpio-docs/ai-docs/plans/provider-abstraction-implementation.md` for original plan.

## 📚 Additional Resources

- **Provider Implementation Plan**: `/warpio-docs/ai-docs/plans/provider-abstraction-implementation.md`
- **SDK Documentation**: `/warpio-docs/warpio-sdk/` - Extension guides
- **Development History**: `.claude/devlog.md` - Implementation phases and decisions
- **Subagent Details**: `.claude/agents/*.md` - Detailed agent specifications
- **Warpio Features**: `/warpio-docs/` - Enhanced documentation
- **Original Docs**: `/docs/` - Gemini CLI documentation

## 🚫 Disabled Components

### VSCode Integration

**Status**: Permanently disabled  
**Location**: `packages/vscode-ide-companion.disabled/`  
**Reason**: Warpio focuses on terminal-based scientific computing workflows

VSCode integration is excluded from:

- Root workspace configuration
- Build scripts (`build:vscode` removed)
- Future upstream merges

## 📝 Session Updates

At the end of significant development sessions, update `.claude/devlog.md` with:

- Tasks completed
- Technical decisions made
- Important discoveries
- Next steps planned

Keep this CLAUDE.md file focused on instructions and guidelines only.

---

_This guide prioritizes clarity and efficiency. For historical context and implementation details, see `.claude/devlog.md`_
