# 🛠️ Warpio Developer Guide

## Quick Start for Extending Warpio

This guide helps developers understand how to build on top of Warpio's infrastructure.

### 🏗️ Architecture Overview

Warpio extends Gemini CLI with:
- **Local Models Support**: Native Ollama integration + provider abstraction
- **Multi-Agent Personas**: 5 specialized AI experts with auto-MCP provisioning
- **Upstream Compatibility**: Clean fork strategy for easy Google CLI updates

### 🎯 Two Types of Documentation

**📖 Usage Docs** (for end users):
- `local-models.md` - How to use local models
- `model-selector.md` - Model switching guide
- `PERSONAS.md` - Persona usage examples
- `commands/` - CLI command reference

**🔧 Developer Docs** (for contributors):
- `DEVELOPERS.md` - This file
- `/CLAUDE.md` - Complete development context
- `/planning/` - Implementation plans and session prompts

### 🚀 Quick Extension Points

#### Adding New Providers
1. Create adapter in `packages/core/src/adapters/your-provider.ts`
2. Extend `SupportedProvider` type in `models.ts`
3. Add provider config in `getProviderConfig()`
4. Add health checking in `ProviderHealthMonitor`

#### Adding New Personas
1. Add persona definition in `PersonaManager.loadPersona()`
2. Define MCP servers in persona config
3. Add persona-specific system prompt
4. Update `PERSONAS.md` documentation

#### Adding New Tests
```bash
# Warpio-specific tests (use this for new features)
test/e2e/your-feature.test.ts
test/unit/your-module.test.ts

# Run tests
npm run test:warpio
```

### 🔍 Key Files to Understand

**Core Architecture**:
- `packages/core/src/config/config.ts` - Main configuration & routing
- `packages/core/src/core/clientFactory.ts` - Provider selection logic
- `packages/core/src/core/localClient.ts` - Local model client implementation

**Provider System**:
- `packages/core/src/adapters/` - Provider implementations
- `packages/core/src/services/providerHealth.ts` - Health monitoring

### ⚡ Development Workflow

```bash
# Setup
npm install
npm run build

# Development
npm run test:warpio:watch  # Test-driven development
npm run lint:fix          # Code quality

# Validation  
npm run preflight         # Full validation suite
```

### 📋 Best Practices

1. **Upstream Safety**: Keep changes in Warpio-specific files when possible
2. **Test Coverage**: Add tests for new providers/personas in `/test/`
3. **License Headers**: Use IOWarp Team copyright for new Warpio files
4. **Code Style**: Follow existing patterns (TypeScript, functional style)

### 🆘 Need More Detail?

For comprehensive development context, read:
- `/CLAUDE.md` - Complete development guide
- `/planning/` - Implementation plans and architecture decisions

---

*This is a quick reference. For complete developer documentation, see the planning folder for detailed session prompts.*