# Warpio CLI Rebranding Journey

This document chronicles the strategic rebranding of the Google Gemini CLI fork to "Warpio CLI" while maintaining upstream compatibility and operational integrity.

## Project Overview

**Objective**: Complete surgical rebranding from "Gemini CLI" to "Warpio CLI" focusing exclusively on user-facing elements while preserving all internal code structure for seamless upstream merges.

**Repository**: Fork of [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)  
**New Identity**: Warpio CLI - Part of the IOWarp ecosystem  
**Compatibility Strategy**: Lightweight rebranding that enables easy upstream integration

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
- [ ] Specialized subagent architecture
- [ ] Brand context management system

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
Our sophisticated subagent system leverages different Claude models for optimal performance and cost efficiency:

#### **Main Agent (Sonnet 4)**
- **Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Role**: Orchestration, decision making, task delegation
- **Capabilities**: Complex reasoning, multi-step planning, coordination
- **Responsibilities**: Overall project management, quality assurance, strategic oversight

#### **warpio-architect (Opus 4)** 🏗️ [USE SPARINGLY]
- **Model**: Claude Opus 4 (claude-opus-4-20250514) - Premium model
- **Role**: CRITICAL architectural decisions only
- **Authority**: Highest-level architectural decisions
- **When to use**: 
  - Major breaking changes affecting multiple systems
  - New system architecture design
  - Technology stack overhauls
  - Strategic roadmap planning
- **When NOT to use**: Routine development, simple refactoring, documentation

#### **brand-master (Sonnet 4)** 🎨
- **Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Role**: IOWarp brand consistency and strategic messaging
- **Authority**: Brand compliance and consistency enforcement
- **Context**: Access to `/iowarp_context` brand materials
- **Responsibilities**:
  - Brand guideline enforcement across all materials
  - Strategic messaging and positioning
  - Visual identity consistency
  - Upstream compatibility vs brand balance

#### **docs-manager (Haiku 3.5)** ⚡
- **Model**: Claude 3.5 Haiku (claude-3-5-haiku-20241022) - High-speed
- **Role**: Rapid documentation processing and updates
- **Optimization**: Bulk text processing, pattern recognition
- **Context Sources**:
  - **WebFetch**: Real-time access to TypeScript, React, Node.js documentation
  - **Context7 MCP**: Enhanced context about project dependencies
  - **Local**: Complete `/docs` directory knowledge
- **Responsibilities**:
  - High-volume documentation rebranding
  - Cross-reference validation and link checking
  - Technical accuracy preservation
  - Rapid batch operations across multiple files

#### **file-searcher (Haiku 3.5)** 🔍
- **Model**: Claude 3.5 Haiku (claude-3-5-haiku-20241022) - High-speed
- **Role**: Fast file and pattern searching across codebase
- **Optimization**: Parallel search, regex expertise
- **Responsibilities**:
  - File discovery by name or pattern
  - Code pattern matching and location
  - Implementation tracking
  - Import and dependency analysis

#### **config-updater (Haiku 3.5)** ⚙️
- **Model**: Claude 3.5 Haiku (claude-3-5-haiku-20241022) - High-speed
- **Role**: Configuration file updates and management
- **Expertise**: JSON, YAML, package.json, tsconfig
- **Responsibilities**:
  - Package dependency management
  - Build configuration updates
  - Settings file modifications
  - Cross-file configuration consistency

#### **test-runner (Haiku 3.5)** 🧪
- **Model**: Claude 3.5 Haiku (claude-3-5-haiku-20241022) - High-speed
- **Role**: Test execution and failure fixing
- **Framework**: Vitest expertise
- **Responsibilities**:
  - Running test suites
  - Analyzing test failures
  - Implementing test fixes
  - Maintaining test coverage

### Model Usage Optimization Strategy

#### Cost and Rate Limit Management
- **Haiku First**: Use Haiku agents for all high-frequency tasks (searching, config updates, testing)
- **Sonnet 4 for Coordination**: Main agent and brand-master for complex reasoning and coordination
- **Opus Sparingly**: Reserve for critical architectural decisions only to avoid rate limits
- **Task Distribution**: 
  - 70% Haiku (high-volume, repetitive tasks)
  - 25% Sonnet (coordination, complex edits)
  - 5% Opus (strategic decisions only)

#### Efficiency Guidelines
1. **Batch Operations**: Group similar tasks for Haiku agents
2. **Caching Results**: Reuse search results and file reads
3. **Parallel Execution**: Run multiple Haiku agents concurrently
4. **Smart Delegation**: Route tasks to appropriate models based on complexity

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

### Phase 2: Systematic Rebranding (In Progress)
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
- ✅ Subagent architecture implemented
- ✅ IOWarp brand guidelines established
- **Decision**: Ready to begin systematic rebranding in dedicated branches
- **Next**: Create `warpio/rebranding` branch for systematic user-facing updates

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