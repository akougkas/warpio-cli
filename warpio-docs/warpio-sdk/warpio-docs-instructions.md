# 📚 Warpio SDK Documentation Guide

## Overview

This guide outlines the structure and purpose of the Warpio SDK documentation, helping developers and AI assistants understand how to extend and maintain Warpio CLI.

## Documentation Structure

The Warpio SDK documentation is organized into three core documents that work together to provide comprehensive guidance for extending the system.

### 1. **DEVELOPERS.md** - Quick Start Guide

**Purpose**: Help developers quickly understand and extend Warpio

**Key Sections**:
- **How Things Work**
  - Fork strategy maintaining Gemini compatibility
  - Persona system architecture
  - MCP server integration patterns
  
- **Adding Features**
  - Provider implementation (LM Studio, Ollama)
  - Custom persona creation
  - Safe extension points that preserve upstream compatibility

- **Code Examples**
  - Working provider implementations
  - Persona configurations with MCP tools
  - Testing procedures

### 2. **ARCHITECTURE.md** - System Design

**Purpose**: Explain the technical architecture and design decisions

**Key Sections**:
- **Fork Strategy**
  - Preserved Gemini package names for upstream merges
  - Sacred files (gemini.tsx, geminiChat.ts) never touched
  - Isolation of new code in dedicated directories
  
- **Provider Abstraction**
  - ContentGenerator interface as foundation
  - Transform-at-boundaries pattern (Gemini format internally)
  - Automatic fallback mechanisms
  
- **Directory Structure**
  ```
  packages/core/src/
  ├── providers/     # AI provider implementations
  ├── personas/      # Research personas
  └── services/      # Shared services
  ```

### 3. **EXTENDING.md** - Copy-Paste Examples

**Purpose**: Provide ready-to-use code examples for common extensions

**Key Examples**:
- **LM Studio Provider**: Complete OpenAI-compatible implementation
- **Ollama Provider**: Local model integration
- **Research Personas**: Bioinformatics, climate modeling examples
- **Configuration Patterns**: Environment variables, settings files
- **Fallback Strategies**: Error handling and provider switching

## Implementation Status

### ✅ Completed (January 2025)
- Comprehensive planning documentation
- Provider abstraction design following Qwen's isolation philosophy
- SDK documentation with practical examples
- Implementation plan with timeline and testing strategy

### 🚧 Next Steps
- Implement OpenAICompatibleProvider base class
- Add LMStudioProvider as first concrete implementation
- Create OpenAIToGeminiTransformer for format conversion
- Test with local LM Studio instance

## Key Design Principles

1. **100% Backward Compatibility**: Never break existing Gemini functionality
2. **Isolation Philosophy**: All new code in separate modules
3. **Transform at Boundaries**: Maintain Gemini format internally
4. **Explicit Configuration**: User controls provider selection
5. **Graceful Fallback**: Always fall back to gemini-2.0-flash

## File Locations

- **SDK Documentation**: `/warpio-docs/warpio-sdk/`
  - DEVELOPERS.md - Quick start guide
  - ARCHITECTURE.md - System design
  - EXTENDING.md - Code examples
  
- **Implementation Plans**: `/warpio-docs/ai-docs/plans/`
  - provider-abstraction-implementation.md - Detailed roadmap
  
- **Reference Materials**: `/warpio-docs/ai-docs/_reference/`
  - OpenAI-compatible endpoint documentation
  - Industry patterns and standards

## Success Metrics

After using this documentation, developers should be able to:
- ✅ Add a new AI provider in 30 minutes
- ✅ Create a custom persona with MCP tools
- ✅ Understand what code to never modify
- ✅ Know exactly where to place new features

## Development Workflow

1. **Read CLAUDE.md**: Understand overall project guidelines
2. **Review SDK docs**: Familiarize with extension patterns
3. **Check implementation plan**: Follow the detailed roadmap
4. **Test locally**: Verify with LM Studio/Ollama
5. **Maintain compatibility**: Run upstream merge tests

## Notes for AI Assistants

When working with Warpio SDK:
- Always prioritize backward compatibility
- Use subagents for code search (file-searcher) and documentation (docs-manager)
- Follow the isolation philosophy - never modify core Gemini files
- Test provider implementations with actual endpoints before committing
- Keep documentation minimal and practical

## Contact & Support

- **Primary Maintainer**: @akougkas
- **Documentation**: This guide and `/warpio-docs/warpio-sdk/`
- **Development Guide**: CLAUDE.md
- **Implementation Details**: `.claude/devlog.md`

---

*Last Updated: January 2025 - Provider abstraction planning complete*