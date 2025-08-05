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

## Subagent Architecture

### Documentation Agent
- **Purpose**: Manage all files in `/docs` directory
- **Tools**: Context7 MCP for document context
- **Responsibilities**: 
  - Systematic documentation updates
  - Cross-reference management
  - Consistency enforcement

### Brand Master Agent  
- **Purpose**: Maintain IOWarp brand consistency
- **Context**: `/iowarp_context` materials
- **Responsibilities**:
  - Brand guideline enforcement
  - Terminology consistency
  - Visual identity alignment

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

---

*This document is maintained as a living record of the Warpio CLI rebranding journey. Updates reflect progress, decisions, and lessons learned throughout the process.*