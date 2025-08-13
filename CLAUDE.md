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

## 🚀 Warpio Personas

Warpio supports specialized personas with automatic IOWarp MCP integration:

| Persona | MCPs Auto-Configured | Use Case |
|---------|---------------------|----------|
| warpio | None | Clean basic experience |
| data-expert | adios, hdf5, compression | Scientific data I/O |
| analysis-expert | pandas, plot | Data analysis & visualization |
| hpc-expert | darshan, lmod, node-hardware, parallel-sort | HPC optimization |
| research-expert | arxiv | Research & documentation |
| workflow-expert | None | Workflow orchestration |

Launch with: `warpio --persona data-expert`

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

## 🔧 Provider Abstraction (NEW) - Vercel AI SDK Integration

Warpio now supports multiple AI providers through Vercel AI SDK - a production-ready, battle-tested provider abstraction layer:

### Supported Providers
- **Gemini** (default): Original Google Gemini models via `@ai-sdk/google`
- **LM Studio**: Local models via `createOpenAICompatible` at `http://192.168.86.20:1234/v1`
- **Ollama**: Local models via `createOpenAICompatible` at `http://localhost:11434`
- **OpenAI**: Direct OpenAI integration via `@ai-sdk/openai`

### Provider Configuration
```bash
export WARPIO_PROVIDER=lmstudio  # or ollama, gemini, openai
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
export LMSTUDIO_MODEL=gpt-oss-20b
```

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

### IMMEDIATE PRIORITY: Fix Tool Schema for LMStudio
**Status**: ~95% Complete - All features implemented, one critical bug
**Working**: Gemini fully functional, LMStudio has tool schema error

### Critical Issue to Fix
**Tool Schema Error**: LMStudio rejects tool schemas - missing `type: 'object'` in parameters
**Location**: `/packages/core/src/providers/manager.ts` line ~250 in `jsonSchemaToZod()`
3. **Tool Conversion**: Convert Gemini tools to Vercel AI SDK format
4. **Compilation Fixes**: Resolve provider manager bridge TypeScript errors
5. **LLM Inference Testing**: Actual `gpt-oss-20b` generation (not just discovery)
6. **Remove All Mocks**: No skeleton/mock/TODO implementations remaining
7. **Production Validation**: Full CLI workflow using LMStudio

### Architecture Constraints
- **Maintain Isolation**: Warpio code stays in `/packages/core/src/warpio/`
- **Preserve Gemini Core**: Use existing infrastructure, add provider choice
- **Zero Breaking Changes**: Existing Gemini CLI must work unchanged
- **Full Vercel AI SDK Compliance**: No custom transformations, use SDK natively

See `/warpio-docs/ai-docs/plans/provider-abstraction-implementation.md` for original plan.
See devlog entries "August 13, 2025 - GAME CHANGER" and "MAJOR MILESTONE" for implementation progress.

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