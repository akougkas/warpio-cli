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

| Agent | Purpose | When to Use | Key Output |
|-------|---------|------------|------------|
| **file-searcher** | Lightning-fast code search | Finding definitions, usages, patterns | File:line references |
| **docs-manager** | Documentation retrieval | /docs/, /warpio-docs/, external libraries | Compact doc references |
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

**IMPORTANT**: Personas are orthogonal to provider configuration. They enhance AI behavior regardless of which provider you use.

### How It Works
```bash
# Your .env sets the PROVIDER (which AI to use)
WARPIO_PROVIDER=lmstudio  # or gemini, ollama

# Personas set the BEHAVIOR (how the AI acts)
npx warpio --persona data-expert -p "Convert NetCDF to HDF5"
# Uses YOUR configured provider with data-expert specialization
```

### Available Personas

| Persona | MCPs Auto-Configured | Use Case | Status |
|---------|---------------------|----------|---------|
| warpio | None | General purpose | ✅ Implemented |
| data-expert | adios, hdf5, compression | Scientific data I/O | 🚧 Planned |
| analysis-expert | pandas, plot | Data analysis & visualization | 🚧 Planned |
| hpc-expert | darshan, lmod, node-hardware | HPC optimization | 🚧 Planned |
| research-expert | arxiv | Research & documentation | 🚧 Planned |
| workflow-expert | None | Workflow orchestration | 🚧 Planned |

### Clean Separation of Concerns
- **Provider (ENV vars)**: Controls which AI model to use (Gemini, LMStudio, Ollama)
- **Persona (CLI flag)**: Controls how the AI behaves (system prompts, tools, expertise)
- **These don't interfere**: Same persona works with any provider!

## 🧭 Project Structure

```
/warpio-cli/
├── packages/
│   ├── cli/           # Terminal UI (React/Ink)
│   └── core/          # Backend engine
├── docs/              # Original Gemini documentation
├── warpio-docs/       # Warpio enhancements & features
├── .claude/
│   ├── agents/        # Subagent definitions
│   └── devlog.md      # Development history
└── CLAUDE.md          # This file
```

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

**Note**: Tool usage quality depends on model capabilities. The `gpt-oss-20b` model may have limited tool-calling abilities compared to Gemini models.

## ⚡ Performance Tips

- Launch multiple file-searcher queries in parallel
- Read only specific line ranges (never entire files)
- Trust subagent results completely
- Use warpio-architect only for major features
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

### Implementation Strategy (REVISED)
- **Vercel AI SDK Foundation**: `createProviderRegistry`, `customProvider`, `createOpenAICompatible`
- **Built-in Format Conversion**: Automatic OpenAI ↔ Gemini ↔ provider transformations
- **Native Tool Integration**: Use AI SDK's `tools` parameter with `generateText`/`streamText`
- **Built-in MCP Support**: `experimental_createMCPClient` replaces custom MCP integration
- **Persona-Specific Providers**: `customProvider` with middleware for model aliases and configurations
- **Production Error Handling**: Built-in streaming, backpressure, fallbacks, usage tracking

### Technical Advantages
- **90% less custom code**: Leverage production-ready SDK vs. building our own
- **Battle-tested**: Used by Vercel and thousands of projects in production
- **Multi-provider ready**: Easy to add Ollama, OpenRouter, Anthropic, etc.
- **Tool schema validation**: Automatic tool conversion and validation
- **Advanced streaming**: Built-in backpressure and error handling

### Current Implementation Status (Updated: 2025-08-13)
- ✅ **Vercel AI SDK Foundation**: Provider registry with Gemini/LMStudio/Ollama support
- ✅ **Standalone Warpio System**: Complete persona system in `/packages/core/src/warpio/`
- ✅ **Zero Gemini Dependencies**: New architecture isolated from Gemini CLI core
- ✅ **Provider Integration**: AISDKProviderManager implements ContentGenerator interface
- ✅ **LMStudio Inference Working**: `gpt-oss-20b` model successfully generates text
- ✅ **CLI Integration**: Persona activation and environment variable support
- ✅ **TypeScript Compilation**: All errors resolved, build passes
- ✅ **Basic Inference**: Both Gemini and LMStudio providers working

### CURRENT STATUS: Configuration Architecture Crisis Identified
**Status**: Core provider system working, but configuration is completely broken
**Working**: Vercel AI SDK integration, model-specific settings, tool schema conversion
**Critical Issue**: Messy configuration priority, hardcoded fallbacks, persona interference

### Major Discovery: Architecture Design Flaws
- **Configuration Chaos**: Environment variables overridden by hardcoded persona preferences
- **Silent Fallbacks**: LMStudio configured correctly but silently falls back to Gemini
- **No Single Source**: .env, personas, and CLI args conflict with each other
- **Production Unready**: Hardcoded defaults make deployment unpredictable

### Next Session Priority: Complete Configuration Redesign
**Objective**: Implement production-ready configuration architecture
**Approach**: Environment-first, `--model provider::model` format, zero hardcoded defaults
**Resources**: Comprehensive redesign prompt in `/warpio-docs/ai-docs/prompts/warpio-config-redesign-session.md`

### Architecture Constraints
- **Maintain Isolation**: Warpio code stays in `/packages/core/src/warpio/`
- **Preserve Gemini Core**: Use existing infrastructure, add provider choice
- **Zero Breaking Changes**: Existing Gemini CLI must work unchanged
- **Full Vercel AI SDK Compliance**: No custom transformations, use SDK natively

See `/warpio-docs/ai-docs/plans/provider-abstraction-implementation.md` for original plan.
See devlog entries "August 13, 2025 - GAME CHANGER" and "MAJOR MILESTONE" for implementation progress.

## 🎯 Model Pivoting Philosophy

**CRITICAL PRINCIPLE**: Warpio is a thin extension layer that pivots model selection, not a rewrite of Gemini CLI.

### The Simple Approach
1. **Keep upstream code unchanged** - Gemini CLI core continues using DEFAULT_GEMINI_FLASH_MODEL everywhere
2. **Model pivoting at runtime** - When Warpio is active, these defaults automatically point to configured providers (LMStudio, Ollama, etc.)
3. **Minimal integration points** - Only intercept at ContentGenerator level, everything else "just works"
4. **Clean upstream merges** - Zero conflicts with Google's updates since we're not changing core logic

### What This Means
- **DO NOT** remove all hardcoded model references - that's overcomplication
- **DO NOT** rewrite core Gemini logic - leverage Google's work
- **DO** ensure Config.getModel() returns the Warpio model when active
- **DO** test thoroughly that LMStudio/Ollama work exactly like Gemini

### Testing Requirements
1. Start with `warpio --help` and `warpio --model list`
2. Test with Gemini models first (baseline)
3. Test with LMStudio starting with simple "hi" queries
4. Debug until local models work EXACTLY like Gemini
5. The user should not know or care which provider is active

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
*This guide prioritizes clarity and efficiency. For historical context and implementation details, see `.claude/devlog.md`*