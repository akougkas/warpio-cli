# Warpio CLI Development Guide

This document defines the development workflow and agent architecture for Warpio CLI, part of the IOWarp ecosystem.

## CRITICAL: Start Every Session By Reading This File

When starting any Claude Code session:
1. Select Sonnet 4 as your main model
2. Your FIRST action must be: `Read("/mnt/nfs/dev/warpio-cli/CLAUDE.md")`
3. Follow the mandatory workflow defined below

## Project Overview

**Product**: Warpio CLI - Conversational AI interface to the IOWarp ecosystem  
**Base**: Fork of [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)  
**Strategy**: Strategic enhancements while maintaining upstream compatibility

## Rebranding Philosophy

### What We Change (User-Facing Only)
- Documentation references: "Gemini CLI" → "Warpio CLI"
- Command examples: `gemini` → `warpio` 
- Help text and error messages
- File names: `gemini-ignore.md` → `warpio-ignore.md`
- Screenshots and assets
- User-visible strings in UI components

### What We Preserve (Internal/API)
- Package names: `@google/gemini-cli-core` (for NPM compatibility)
- Internal file structure: `gemini.tsx`, `geminiChat.ts`, etc.
- Environment variables: `GEMINI_API_KEY`, `GEMINI_SANDBOX`
- API client code: `GeminiClient`, `geminiRequest` functions
- Build configuration internals
- Git history and commit structure

## Implementation Strategy

### Phase 1: Infrastructure Setup
- [x] Basic CLI rebranding (warpio command functional)
- [x] Core documentation updates
- [x] Specialized subagent architecture
- [x] Brand context management system

### Phase 2: Systematic Rebranding
- [ ] Documentation sweep (docs/ directory)
- [ ] User interface strings
- [ ] Command examples and help text
- [ ] Asset and screenshot updates

### Phase 3: Quality Assurance  
- [ ] Upstream compatibility verification
- [ ] Functional testing
- [ ] Documentation completeness review

## Advanced Subagent Architecture

### Multi-Model AI Hierarchy

Our subagent system uses specialized Claude models for different task types:

#### Main Agent (Sonnet 4)
- **Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Role**: Orchestration, decision making, task delegation
- **Capabilities**: Complex reasoning, multi-step planning, coordination
- **Responsibilities**: Overall project management, quality assurance, strategic oversight

#### warpio-architect (Opus 4) - Extended Thinking
- **Model**: Claude Opus 4 (claude-opus-4-20250514)
- **Thinking**: Enabled with 50,000 token budget
- **Role**: Critical architectural decisions requiring deep analysis
- **When to use**: 
  - Major breaking changes affecting multiple systems
  - New system architecture design
  - Technology stack overhauls
  - Strategic roadmap planning
- **When NOT to use**: Routine development, simple refactoring, documentation

#### brand-master (Sonnet 4) - Instant Execution
- **Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Thinking**: Disabled for instant responses
- **Role**: IOWarp brand standards and messaging guidelines
- **Tools**: Read-only (Read, Glob, Grep)
- **Outputs**:
  - Pre-defined brand terminology
  - Messaging matrix (approved/forbidden language)
  - Brand pillars and positioning
  - ON-BRAND/OFF-BRAND validation

#### docs-manager (Sonnet 4) - Ultra-Fast Retrieval
- **Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Thinking**: Disabled for immediate execution
- **Role**: Read-only information retrieval
- **Tools**: Read, Glob, Grep, Context7 MCP tools
- **Capabilities**:
  - Instant file discovery in /docs directory
  - Rapid pattern matching across documentation
  - Context7 external library documentation retrieval
  - Raw data output without analysis


### Model Usage Optimization Strategy

#### Cost and Rate Limit Management
- **Sonnet 4 for Most Tasks**: Main agent, docs-manager, and brand-master
- **Opus 4 ONLY for Critical Architecture**: Reserve exclusively for major system decisions
- **Task Distribution**: 
  - 95% Sonnet (coordination, information retrieval, brand guidance)
  - 5% Opus (critical architectural decisions with extended thinking)

#### Efficiency Guidelines
1. **Instant Delegation**: Use docs-manager and brand-master for immediate responses
2. **No Analysis Paralysis**: Fast agents execute without thinking
3. **Opus Conservation**: Only invoke warpio-architect for breaking changes
4. **Trust Agent Outputs**: Each agent is optimized for its specific domain

## Sub-Agent Workflow - INTELLIGENT DELEGATION

### Critical: Assess Query Complexity First

When you receive a request, FIRST determine its complexity level:

#### Simple Tasks (Handle Directly)
- Documentation searches or queries
- Small bug fixes (< 5 files)
- Configuration updates
- Adding simple tests
- Updating strings or messages
- File renaming or moving
- Small refactors in single components

**For Simple Tasks**: Use docs-manager and brand-master for context, then implement directly

#### Complex Tasks (Require Architect)
- New features or components
- System-wide refactoring
- Architecture changes
- Breaking changes
- Multi-file coordinated updates (> 5 files)
- Performance optimizations
- Integration with new services
- Database schema changes

**For Complex Tasks**: Follow the full 3-step workflow with architect

### Workflow Decision Tree

```
User Request
    ↓
Is it complex? (new feature, major refactor, architecture)
    ↓
┌─── YES ───┐                    ┌─── NO ───┐
↓            ↓                    ↓           ↓
Full Workflow:                    Simple Workflow:
1. Context (both managers)        1. Context (relevant manager)
2. Architect planning            2. Direct implementation
3. Execute plan                  
```

### Full Workflow (Complex Tasks Only)

#### Step 1: Context Collection
1. **Use docs-manager** to gather:
   - Current documentation in /docs
   - Existing patterns and examples
   - External library documentation via Context7
   
2. **Use brand-master** to gather:
   - IOWarp strategic direction from /iowarp_context
   - Brand guidelines and positioning
   - NSF objectives and alignment

#### Step 2: Architect Planning
3. **Use warpio-architect** with ALL gathered context:
   - Pass all information from both managers
   - Request specific implementation plan
   - Plans will be written to /planning folder

#### Step 3: Implementation
4. **Execute the plan** from /planning folder:
   - Follow the architect's instructions
   - Implement code changes as specified
   - Create/modify files per the plan

### Example: Simple Task

**User Request**: "Fix the typo in the error message"

**Your Response**:
```
This is a simple task. I'll gather context and fix it directly.

1. Using docs-manager to find the error message location...
2. Using brand-master to verify correct messaging...
3. Making the fix directly...
```

### Example: Complex Task

**User Request**: "Add a new feature for file synchronization"

**Your Response**:
```
This is a complex new feature. I'll use the full workflow with architect.

1. Gathering context from both managers...
   - docs-manager: existing file patterns, Node.js fs docs
   - brand-master: IOWarp integration approach, strategic alignment
   
2. Having architect create a comprehensive plan...
   - warpio-architect: creating plan at /planning/file-sync-feature.md
   
3. Implementing the architect's plan...
   - Following steps from the plan document
```

### Quick Decision Guide

**Use Architect When**:
- "Add a new feature..."
- "Refactor the entire..."
- "Integrate with..."
- "Redesign the..."
- "Implement support for..."
- "Optimize performance of..."

**Skip Architect When**:
- "Fix typo in..."
- "Update the config..."
- "Add a test for..."
- "Move file from..."
- "Update documentation..."
- "Change message to..."

### Efficiency Guidelines

1. **Assess First**: Take 2 seconds to determine complexity
2. **Use Managers Wisely**: 
   - Simple tasks: Only relevant manager
   - Complex tasks: Both managers for full context
3. **Architect Sparingly**: Only for genuinely complex work
4. **Document Decisions**: Note why you chose direct vs architect path

### Planning Folder (Complex Tasks Only)

For complex tasks, the warpio-architect writes to `/planning/`:
- `/planning/feature-name.md`
- `/planning/major-refactor.md`
- `/planning/architecture-change.md`


### Context7 MCP Integration Strategy
Enhanced documentation intelligence through external context retrieval:

#### **Real-time Documentation Access**
- **TypeScript v5.3.3**: Language features, compiler options, best practices
- **React v19.1.0 + Ink v6.0.1**: Terminal UI patterns and optimization
- **Vitest v3.2.4**: Testing framework specifics and mocking strategies
- **Node.js >=20**: Runtime environment and built-in modules

#### **Dependency Intelligence**
- **@google/genai v1.9.0**: Google AI SDK patterns and authentication
- **@modelcontextprotocol/sdk v1.11.0**: MCP protocol implementation
- **Build Tools**: esbuild, ESLint, Docker configuration patterns

#### **Quality Metrics**
- **Retrieval Speed**: <2 seconds for context queries
- **Cache Hit Rate**: >80% for frequently accessed documentation
- **Accuracy**: Version-aware context matching project dependencies
- **Security**: No proprietary code exposure to external services

## Technical Preservation Checkpoints

### API Compatibility
- [ ] Gemini API integration unchanged
- [ ] Authentication mechanisms preserved  
- [ ] Token caching functionality intact
- [ ] MCP server compatibility maintained

### Build System
- [ ] NPM package structure preserved
- [ ] TypeScript compilation unchanged
- [ ] Docker container builds functional
- [ ] CI/CD pipeline compatibility

### Environment Integration
- [ ] Environment variable handling unchanged
- [ ] Configuration file formats preserved
- [ ] IDE integration compatibility maintained

## Upstream Merge Strategy

The lightweight rebranding approach ensures:

1. **Minimal Diff Surface**: Changes limited to user-facing strings and documentation
2. **Preserved Git History**: No file moves or structural changes to core codebase  
3. **Clean Separation**: Brand-specific changes clearly identifiable
4. **Easy Cherry-Picking**: Individual improvements can be contributed upstream

## Comprehensive Codebase Analysis

### Architecture Overview
**Monorepo Structure**: TypeScript-based with 3 core packages:
- **Root**: `@warpio/warpio-cli` - Orchestration, bundling, CLI entry point
- **CLI**: `@google/gemini-cli` - Terminal UI (React/Ink), user experience  
- **Core**: `@google/gemini-cli-core` - Backend engine, API integration, tools
- **VS Code**: `gemini-cli-vscode-ide-companion` - IDE integration extension

### Critical Compatibility Requirements

#### MUST PRESERVE (Internal/API)
```yaml
Package Names:
  - "@google/gemini-cli-core" # NPM compatibility
  - "@google/gemini-cli" # CLI package internal name
  
Environment Variables:
  - GEMINI_API_KEY # Google API authentication
  - GEMINI_SANDBOX # Sandbox execution mode
  
API Functions:
  - GeminiClient # Core API client class
  - geminiRequest # API request functions
  - All @google/genai SDK integration
  
Configuration:
  - sandboxImageUri: "us-docker.pkg.dev/gemini-code-dev/gemini-cli/sandbox:0.1.17"
  - Docker registry paths and service endpoints
  - Build artifact structure and naming
```

#### SAFE TO REBRAND (User-Facing)
```yaml
User Interface:
  - Command name: "gemini" → "warpio" 
  - Product references: "Gemini CLI" → "Warpio CLI"
  - Help text, error messages, CLI banners
  - ASCII art and terminal branding
  
Documentation:
  - All .md files (except upstream attribution)
  - Screenshots and visual assets
  - Configuration examples in docs
  
File Conventions:
  - .geminiignore → .warpioignore
  - User configuration directory names
  - Asset file naming (screenshots, etc.)
```

### Git Repository Status
- **Origin**: `git@github.com:akougkas/warpio-cli.git` (our fork)  
- **Upstream**: `git@github.com:google-gemini/gemini-cli.git` (Google's repo)
- **Current**: Up-to-date with upstream v0.1.17
- **Branches**: 140+ active upstream branches, weekly releases
- **Development Velocity**: Daily commits, highly active upstream

### Rebranding Status Assessment
- **Completed (30%)**: Root package name, main README, basic CLI command
- **Partial**: Some documentation references, command examples  
- **Critical Gaps**: 
  - CLI package bin name still "gemini"
  - VS Code extension completely unbranded
  - Core documentation sweep needed
  - Bundle output path needs update

## Progress Tracking

### Phase 1: Foundation & Analysis ✅
- [x] Comprehensive codebase structure analysis
- [x] Upstream compatibility requirements mapped
- [x] Internal vs external component classification
- [x] Git workflow and branching strategy established
- [x] Subagent architecture implementation

### Phase 2: Systematic Rebranding (Ready to Start)
- [ ] Update CLI package binary name and user-facing strings
- [ ] Complete documentation sweep (docs/ directory)  
- [ ] VS Code extension rebranding
- [ ] Bundle and build artifact updates
- [ ] Asset and screenshot replacement

### Phase 3: Quality Assurance & Integration
- [ ] Upstream compatibility verification
- [ ] Functional testing across all platforms
- [ ] Documentation completeness review
- [ ] Brand consistency validation

## IOWarp Integration

This rebranding positions Warpio CLI as a core component of the IOWarp ecosystem:

- **IOWarp**: Next-generation development tools and AI-powered workflows
- **Warpio CLI**: Terminal-based AI agent for development tasks
- **Brand Synergy**: Consistent naming and experience across IOWarp products

## Contributing to Upstream

Our rebranding strategy enables continued contribution to the original Gemini CLI project:

1. **Feature Development**: New features developed in isolation can be contributed back
2. **Bug Fixes**: Fixes to core functionality easily cherry-picked upstream
3. **Documentation Improvements**: Non-brand-specific documentation can be shared
4. **Testing Enhancements**: Test improvements and coverage expansions

## Git Workflow Strategy

### Branching Strategy
```bash
# Main branches
main                    # Our stable fork with rebranding
upstream/main          # Google's original repository

# Work branches (use warpio/ prefixes)
warpio/rebranding      # Systematic rebranding work
warpio/feature/*       # New IOWarp-specific features  
warpio/upstream-sync   # Upstream integration work
warpio/hpc-enhancements # HPC-friendly enhancements
```

### Upstream Integration Workflow
```bash
# Regular upstream sync
git fetch upstream
git checkout -b warpio/upstream-sync-$(date +%Y%m%d)
git merge upstream/main
# Resolve branding conflicts preserving our changes
git push origin warpio/upstream-sync-$(date +%Y%m%d)

# Cherry-pick specific features
git cherry-pick <upstream-commit-hash>
# Resolve any branding conflicts
```

### Best Practices for Claude Code
1. **Always branch before major edits**: `git checkout -b warpio/task-name`
2. **Atomic commits**: One logical change per commit
3. **Descriptive messages**: Clear intent and scope
4. **Branch per task**: Separate branches for each major Claude Code task
5. **Test before merge**: Verify functionality after each major change

### Merge Strategy
- **Preserve rebranding**: Always maintain Warpio CLI user-facing changes
- **Accept upstream features**: New functionality and bug fixes  
- **Manual conflict resolution**: Review each conflict for brand vs technical content
- **Squash feature branches**: Clean history for feature additions

## Notes and Decisions

### 2025-08-05: Foundation Complete
- ✅ Comprehensive codebase analysis completed
- ✅ Upstream compatibility requirements documented  
- ✅ Internal vs user-facing component mapping established
- ✅ Git workflow and branching strategy defined
- ✅ Subagent architecture implemented and optimized
- ✅ IOWarp brand guidelines established
- ✅ Multi-model agent hierarchy operational (Sonnet 4 + Opus 4)
- **Status**: Infrastructure phase complete, ready for systematic rebranding
- **Current Branch**: `warpio/rebranding` - ready for Phase 2 implementation
- **Next**: Begin systematic user-facing rebranding with surgical precision

## Development Guidelines for Claude Code

### Building and Testing
Before submitting changes, validate with the full preflight check:
```bash
npm run preflight  # Builds, tests, typechecks, and lints
```

### Testing Framework (Vitest)
- **Framework**: Vitest with `describe`, `it`, `expect`, `vi`
- **File Location**: `*.test.ts` co-located with source files
- **Setup**: Use `vi.resetAllMocks()` in `beforeEach`, `vi.restoreAllMocks()` in `afterEach`
- **Mocking**: `vi.mock()` for ES modules, `vi.spyOn()` for objects
- **React Testing**: Use `ink-testing-library` for terminal UI components

### Code Standards
- **Prefer plain objects + TypeScript interfaces** over classes
- **Use ES module syntax** for encapsulation (`import`/`export`)
- **Avoid `any` types** - prefer `unknown` with type narrowing
- **Embrace functional array operators** (`.map()`, `.filter()`, `.reduce()`)
- **Follow React Hooks rules** strictly
- **No manual memoization** - React Compiler handles optimization

### Architecture Principles
- **Immutable data patterns** aligned with React reconciliation
- **Pure component functions** without render side effects
- **One-way data flow** through props and context
- **ES modules for clear public/private API boundaries**

---

*This document is maintained as a living record of the Warpio CLI rebranding journey and development standards. Updates reflect progress, decisions, and lessons learned throughout the process.*
