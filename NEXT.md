# Next Session: Implement Unified Local AI Architecture

## 🎯 PRIMARY OBJECTIVE
Implement the unified OpenAI-compatible local AI architecture designed in `/planning/local-ai-architecture-redesign.md`.

## 📋 ARCHITECTURE PLAN STATUS
✅ **COMPLETE**: Comprehensive architecture planning finished (commit 7c092e0c)
- **Design Decision**: Unified OpenAI-compatible approach for both Ollama and LMStudio
- **Key Innovation**: Single `UnifiedLocalClient` using OpenAI SDK instead of separate native implementations
- **Benefits**: 50% code reduction, full tool calling, native thinking token support
- **Plan Location**: `/planning/local-ai-architecture-redesign.md` (688 lines)

## 🏗️ IMPLEMENTATION TASKS

### ✅ Phase 1: Core Implementation (COMPLETE)
- ✅ **UnifiedLocalClient**: Core client using OpenAI SDK implementing GeminiClient interface
- ✅ **Provider Strategy**: Implement `LocalProvider` interface with `OllamaProvider` and `LMStudioProvider`
- ✅ **LocalToolManager**: Robust tool calling system converting between Gemini and OpenAI formats
- ✅ **Stream Processing**: Clean event system with thinking token support

### ✅ Phase 2: Integration & Advanced Features (COMPLETE)
- ✅ **Thinking Token Integration**: Connected `WarpioThinkingProcessor` to unified client
- ✅ **Unified Model Discovery**: Enhanced service for provider-agnostic model discovery  
- ✅ **ClientFactory**: Wire everything together with smart provider selection
- ✅ **Old File Cleanup**: Remove LocalModelClient, LMStudioModelClient, related wrappers

### Phase 3: Testing & Validation
- **Unit Tests**: Test each component independently with mocks
- **Integration Tests**: Local model parity with Gemini Flash across all features
- **E2E Tests**: Tool calling, thinking tokens, streaming, multi-turn conversations
- **Performance Tests**: Validate <100ms overhead vs direct API calls

## 🔧 KEY IMPLEMENTATION PRIORITIES

1. **Tool Calling Parity**: Fix `gpt-oss:20b` reliability to match Gemini Flash
2. **Thinking Token Support**: Seamless integration with existing UI components  
3. **Clean Architecture**: Eliminate 4-layer wrapper system complexity
4. **Upstream Safety**: All changes additive, zero Gemini CLI core impact

## 📂 IMPLEMENTATION FILES (from plan)

### Core Classes
- `/packages/core/src/core/unifiedLocalClient.ts` - Main unified client
- `/packages/core/src/core/providers/index.ts` - Provider strategy pattern
- `/packages/core/src/core/localToolManager.ts` - Tool calling system
- `/packages/core/src/core/streamProcessors.ts` - Stream processing with thinking

### Integration Points  
- `/packages/core/src/core/localGeminiChat.ts` - Chat integration
- `/packages/core/src/services/modelDiscoveryService.ts` - Enhanced discovery
- `/packages/core/src/core/clientFactory.ts` - Factory with provider selection

### Testing
- `/test/unit/unifiedLocalClient.test.ts` - Core client tests
- `/test/e2e/local-parity.test.ts` - Gemini parity validation
- `/test/providers/` - Provider-specific tests

## 🚀 SESSION START PROTOCOL

1. **Read CLAUDE.md** for context and development rules
2. **Review architecture plan** at `/planning/local-ai-architecture-redesign.md`
3. **Start with UnifiedLocalClient** core implementation following the detailed plan
4. **Implement step-by-step** per the 7-step implementation guide
5. **Test thoroughly** at each phase for reliability

## 📊 SUCCESS METRICS

- **Tool Calling**: Local models match Gemini Flash reliability (0 failures in standard test suite)
- **Thinking Tokens**: Seamless UI integration with <100ms processing overhead  
- **Code Quality**: 50% reduction in local AI codebase complexity
- **Test Coverage**: >90% coverage on critical paths
- **Upstream Safety**: Zero impact on existing Gemini CLI functionality

## ⚡ CURRENT BRANCH
`warpio/clean-local-ai-architecture` - Ready for implementation

## 💡 CONTEXT SUMMARY
The architecture research revealed that both Ollama (`/v1` endpoint) and LMStudio are OpenAI-compatible, enabling a unified approach instead of separate native implementations. This architectural insight allows for massive simplification while gaining full tool calling support and native thinking token integration.