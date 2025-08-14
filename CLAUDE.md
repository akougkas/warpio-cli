# Warpio CLI - Development Guide

IMPORTANT: This is the master instructions file for Claude Code. Read this file at the start of every session.

## 🎭 PERSONA SYSTEM ARCHITECTURE (Production Ready)

**Status**: Complete with true MCP isolation and simplified command interface

**CRITICAL CONSTRAINTS for Future Persona Development**:

1. **MCP Isolation**: Each persona MUST only load its configured MCPs - verified by testing tool lists
2. **Tool Registry**: Changes to MCP configuration require `toolRegistry.discoverMcpTools()` refresh
3. **Simplified Commands**: Only `/persona list`, `/persona <name>`, `/persona help` - NO complex subcommands
4. **CLI Interface**: Only `--persona <name>` option - removed all other persona CLI flags
5. **Identity Pattern**: All personas must clearly self-identify when asked "what can you do?"

**Key Architecture Files**:
- Persona definitions: `/packages/core/src/warpio/personas/*.ts`
- MCP isolation: `/packages/core/src/warpio/mcp-manager.ts`
- Command interface: `/packages/core/src/warpio/commands/persona.ts`
- CLI integration: `/packages/cli/src/gemini.tsx` (minimal changes only)

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

**CRITICAL RULES**:

- RARELY use Grep/Glob/LS directly - PREFER use file-searcher
- NEVER search docs yourself - ALWAYS use docs-manager
- ALWAYS launch multiple subagents in parallel (batch execution) for speed
- ONLY read specific line ranges provided by subagents

### **Architecture Principle**: Complete Isolation

- NO modifications to ANY Gemini CLI core files
- ALL personas in /packages/core/src/warpio/personas/
- Upstream syncs remain trivial - just merge, no conflicts
- Warpio layer acts as a plugin, not a typical fork

## 🚫 Git Commit Attribution Policy

**IMPORTANT**: All git commits MUST automatically be checked for AI attribution. Any commits containing references to Claude, Anthropic, AI, or similar terms MUST be BLOCKED. This ensures all code is properly attributed to the developer @akougkas who uses Claude. No advetisements for Anthropic or Claude Code.

## ⚠️ CRITICAL: Surgical Development Principles

**LEARNED FROM COSTLY MISTAKES**: These principles prevent wasting developer time and money by avoiding massive regressions.

### 🔬 When Working on Existing Warpio Code:

1. **STUDY THE WORKING VERSION FIRST**
   - Read and understand existing code BEFORE making changes
   - Analyze why current implementation works and is successful
   - Identify the specific problem scope - don't expand beyond user request
   - Never assume existing code is "wrong" without evidence

2. **MAKE SURGICAL CHANGES ONLY**
   - Fix exactly what user requested, nothing more
   - Preserve all working functionality and visual design
   - Avoid complete rewrites when targeted fixes will work
   - Respect successful architectural patterns already in place

3. **VALIDATE OUTPUT AGAINST ORIGINAL**
   - Does the result look/work BETTER than what existed?
   - Are we solving the actual problem user identified?
   - Does the change maintain the same quality bar?
   - Would a user prefer this over the original working version?

4. **RESPECT EXISTING QUALITY**
   - If current code works well, enhance don't replace
   - Don't break professional-looking UIs to add "improvements"
   - Preserve visual aesthetics and user experience quality
   - When in doubt, make smaller changes rather than larger ones

### 🚨 Red Flags That Lead to Disasters:

- Rebuilding working systems from scratch
- Adding complexity when user asked for simplification
- Changing successful visual designs without clear improvement
- Ignoring framework constraints (e.g., Ink component nesting rules)
- Creating new abstractions when existing patterns work fine

### ✅ Success Patterns:

- Read existing code thoroughly before changing
- Make incremental improvements to working systems
- Test changes against user's actual stated problems
- Preserve what works, fix only what's broken
- Choose simplicity over architectural "elegance"

**REMEMBER**: User time and money are precious. A working system enhanced is better than a broken system rebuilt.

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
- IMPORTANT: Avoid `any` types - proeprly type everything and if you must prefer use `unknown` with narrowing but not `any`
- Follow existing patterns in neighboring files
- No comments unless explicitly requested
- When finished debugging a file, upon completion, ALWAYS revisit one more time the code in the file to remove printouts, comments, or rendundant code

### Architecture Principles

- Mirroring exactly the original Gemini CLI we forked to create WarpIO
- State of the art practices for Typescript projects

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

# Interactive persona management (simplified)
/persona list            # List available experts
/persona data-expert     # Switch to expert directly
/persona help            # Explain system and usage
```

### Available Personas

| Persona         | MCPs Auto-Configured         | Use Case                      | Status              |
| --------------- | ---------------------------- | ----------------------------- | ------------------- |
| warpio          | None                         | General purpose               | ✅ Production Ready |
| data-expert     | adios, hdf5, compression     | Scientific data I/O           | ✅ Production Ready |
| analysis-expert | pandas, plot                 | Data analysis & visualization | ✅ Production Ready |
| hpc-expert      | darshan, lmod, node-hardware | HPC optimization              | ✅ Production Ready |
| research-expert | arxiv                        | Research & documentation      | ✅ Production Ready |
| workflow-expert | None                         | Workflow orchestration        | ✅ Production Ready |

- **Provider (ENV vars)**: Controls which AI inference to use (Gemini, LMStudio, Ollama)
- **Persona (CLI flag)**: Controls how the AI behaves (system prompts, custom models, tools, expertise)
- **These don't interfere**: Personas should work with any provider any model!

## 🔧 Model Management System

**CRITICAL**: Warpio now includes a comprehensive model management system with dynamic discovery, validation, and interactive control.

### Supported Providers

- **Gemini** (default): Google Gemini models (gemini-2.5-flash, gemini-1.5-pro-latest, etc.)
- **LM Studio**: Local models via OpenAI-compatible endpoint
- **Ollama**: Local models via OpenAI-compatible endpoint
- **OpenAI**: Cloud API models (gpt-4o, gpt-4o-mini, etc.)

### Configuration (.env File)

```bash
# Copy .env.example to .env and configure your providers

# Gemini (Default)
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# LM Studio (Local AI)
WARPIO_PROVIDER=lmstudio
LMSTUDIO_HOST=http://192.168.86.20:1234/v1
LMSTUDIO_MODEL=qwen3-4b-instruct-2507
LMSTUDIO_API_KEY=lm-studio

# Ollama (Local AI)
WARPIO_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b

# OpenAI (Cloud)
WARPIO_PROVIDER=openai
OPENAI_API_KEY=sk-your_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Model Selection Methods

**1. CLI Arguments (Temporary Override)**

```bash
npx warpio -m gemini::gemini-2.5-flash -p "hello"
npx warpio -m lmstudio::qwen3-4b-instruct-2507 -p "hello"
```

**2. Environment Variables (Persistent)**

```bash
WARPIO_PROVIDER=lmstudio npx warpio -p "hello"
```

**3. Interactive Slash Commands**

```bash
/model set lmstudio::qwen3-4b  # Switch models
```

### ✅ ARCHITECTURE HIGHLIGHTS

**Upstream Compatibility Maintained**

- **Minimal Core Changes**: Complex logic isolated in `/packages/core/src/warpio/`
- **Graceful Degradation**: Core CLI works if Warpio unavailable
- **Clean Integration**: Uses existing infrastructure with provider choice
- **Zero Breaking Changes**: Existing Gemini CLI functionality preserved

**Performance Optimized**

- **Singleton Pattern**: ModelManager instance reuse
- **Parallel Discovery**: Concurrent provider queries for speed
- **Smart Caching**: Avoids redundant API calls
- **Efficient Imports**: Dynamic imports prevent dependency issues

### Architecture Constraints

- **Maintain Isolation**: Warpio code stays in `/packages/core/src/warpio/`
- **Preserve Gemini Core**: Use existing infrastructure, add provider choice
- **Zero Breaking Changes**: Existing Gemini CLI must work unchanged
- **Full Vercel AI SDK Compliance**: No custom transformations, use SDK natively

## 🎨 UI Enhancement System - LOCKED DOWN ✅

**Status**: PRODUCTION READY - Locked down, minimal, clean implementation  
**Architecture**: True replacement pattern (NOT wrapper) for zero upstream conflicts  
**Location**: `/packages/cli/src/ui/warpio/` - Isolated Warpio UI components

### 🚨 CRITICAL UI GUIDELINES FOR FUTURE SESSIONS

**WHAT NOT TO TOUCH:**
- ❌ NEVER modify `/packages/cli/src/ui/components/` (original Gemini components)
- ❌ DO NOT recreate wrapper patterns (we chose true replacement for good reasons)
- ❌ DO NOT bring back WarpioHeader or WarpioTips (intentionally removed)
- ❌ DO NOT modify theme integration (uses native theme system)

**OUR LOCKED UI SYSTEM:**
- ✅ **WarpioFooter**: Complete footer replacement (not wrapper) 
- ✅ **Themes**: `warpio.ts` & `warpio-light.ts` integrated into native theme system
- ✅ **Integration**: Single import change in `App.tsx` only
- ✅ **Iowa Warp Branding**: `warpio (iowarp.ai)` and `active_persona(name) (iowarp.ai)` are intentional marketing
- ✅ **Clean Build**: Zero TypeScript/ESLint errors mandatory

### UI Architecture Decision: True Replacement

**Why NOT Wrapper Pattern:**
- Zero merge conflicts with upstream Footer changes
- Complete control over UX and functionality
- Simplified maintenance - no wrapper complexity
- Better performance - single component rendering

**Future UI Extensions:**
- Add new components ONLY in `/packages/cli/src/ui/warpio/`
- Use existing utilities: `providerDetection.ts`, `skillDetection.ts`, `warpioColors.ts`
- Maintain isolation principle - NO entanglement with Gemini core
- Preserve clean build status always

**For UI Details**: See `/warpio-docs/warpio-sdk/UI.md` and `.claude/devlog.md`

## 📚 Additional Resources

- **SDK Documentation**: `/warpio-docs/warpio-sdk/` - Extension guides
- **Subagent Details**: `.claude/agents/*.md` - Detailed agent specifications
- **Warpio Features**: `/warpio-docs/` - Warpio CLI documentation
- **Original Docs**: `/docs/` - Gemini CLI documentation

## 📝 Session Updates

At the end of significant development sessions, update `.claude/devlog.md` with:

- Tasks completed
- Technical decisions made
- Important discoveries
- Next steps planned

Keep this CLAUDE.md file focused on instructions and guidelines only.

---

_This guide prioritizes clarity and efficiency. For historical context and implementation details, see `.claude/devlog.md`_
