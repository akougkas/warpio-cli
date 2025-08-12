# Warpio CLI Model Selection System Enhancement

## Mission: Create a Robust, User-Friendly, Multi-Provider Model Selection Experience

### Current State Analysis

The Warpio CLI currently has basic model selection functionality but lacks:

- Robust error handling for edge cases
- Clear model status indication in UI
- Intelligent fallback strategies
- Proper health checking and recovery
- Seamless user experience across providers

### Core Requirements

#### 1. **UI Model Status & Display**

**Problem**: Footer/Header shows hardcoded model names instead of actual active model
**Solution**:

- Footer should display the CURRENTLY ACTIVE model (e.g., "qwen3-4b" or "gemini-2.5-flash")
- Show provider status: "Local: ✅" or "Gemini: ✅"
- Indicate when fallback occurs: "Local: ❌ → Gemini: ✅"
- Show model loading/switching states

#### 2. **Robust Ollama Error Handling**

**Edge Cases to Handle**:

- ✅ Ollama not installed on system
- ✅ Ollama installed but server not running
- ✅ Ollama running but zero models available
- ✅ Ollama has too many models (performance issues)
- ✅ Network connectivity issues
- ✅ Model pull/download failures
- ✅ Model inference failures (OOM, corrupted models)

**Required Behavior**:

```bash
# Scenario 1: Ollama not installed
$ warpio -m small -p "hello"
⚠️  Ollama not detected. Using Gemini fallback.
> [Gemini response]

# Scenario 2: Ollama installed, no models
$ warpio -m small -p "hello"
📥 Downloading default model (qwen3:4b)...
✅ Model ready. Switching to local inference.
> [Local model response]

# Scenario 3: Ollama server down
$ warpio -m small -p "hello"
❌ Local server unavailable. Using Gemini fallback.
💡 Run 'ollama serve' to enable local models.
> [Gemini response]
```

#### 3. **Smart Default Model Strategy**

**Default Model Hierarchy**:

1. **Primary**: `hopephoto/Qwen3-4B-Instruct-2507_q8:latest` (alias: "small")
2. **Fallback**: `gemini-2.5-flash`
3. **Auto-Pull**: If Ollama detected but no models, auto-pull default

**Implementation**:

- Check Ollama availability on startup
- Auto-pull default model if Ollama available but no models
- Show progress during model download
- Cache model availability for performance

#### 4. **Enhanced Model Discovery & Health**

**Model Status Tracking**:

```typescript
interface ModelStatus {
  provider: 'ollama' | 'gemini' | 'openai';
  modelId: string;
  alias?: string;
  status: 'available' | 'downloading' | 'error' | 'unknown';
  health: 'healthy' | 'slow' | 'failing' | 'untested';
  lastChecked: Date;
  errorMessage?: string;
}
```

**Health Check Strategy**:

- Async model health checks (don't block CLI)
- Cache results for 5-10 minutes
- Show health indicators in `--model list`
- Automatic health recovery attempts

#### 5. **Improved Model Selection UX**

**Current Command Enhancement**:

```bash
# Current (basic)
warpio --model small -p "hello"
warpio --model list

# Enhanced (comprehensive)
warpio --model small -p "hello" --show-model-info
warpio --model list --health-check
warpio --model status  # Show current active model + health
warpio --model switch flash  # Interactive model switching
warpio --model pull qwen3:4b  # Manual model management
warpio --model remove old-model  # Cleanup
```

**Interactive Model Status**:

```
$ warpio --model status
🤖 Active Model: qwen3:4b (local) ✅
📊 Performance: ~2.3s response time
🔄 Fallback: gemini-2.5-flash (available)
💾 Local Models: 3 available, 2.1GB total
🌐 Remote Models: 41 Gemini models available
```

#### 6. **Fallback & Recovery Logic**

**Smart Fallback Strategy**:

```
User selects "small" → Try Ollama qwen3:4b
├─ Success ✅ → Use local model
├─ Server down ❌ → Fallback to Gemini flash
├─ Model missing ❌ → Auto-pull if possible, else Gemini fallback
└─ Inference error ❌ → Retry once, then Gemini fallback
```

**Recovery Mechanisms**:

- Automatic retry with exponential backoff
- Provider switching mid-conversation if needed
- Model health monitoring and proactive switching
- User notification of fallback events

#### 7. **Performance & Resource Management**

**Optimization Requirements**:

- Model discovery should be < 500ms
- Cache model availability locally
- Lazy-load model information
- Handle 50+ models efficiently in `--model list`
- Memory-efficient model status tracking

### Implementation Areas

#### A. Core Architecture

- `ModelManager` class for centralized model state
- `ProviderHealthService` for monitoring provider status
- `ModelFallbackService` for intelligent fallback logic
- Enhanced `ModelDiscoveryService` with caching

#### B. UI Components

- Real-time model status in Footer/Header
- Loading states during model operations
- Error state indicators and recovery suggestions
- Model switching progress indicators

#### C. CLI Commands

- Enhanced `--model` flag with better error messages
- New model management subcommands
- Interactive model selection mode
- Health check and status reporting

#### D. Error Handling

- Comprehensive error classification system
- User-friendly error messages with actionable suggestions
- Graceful degradation strategies
- Logging for debugging model issues

### Success Criteria

#### User Experience

- ✅ User always knows which model is active
- ✅ Clear feedback on model availability and health
- ✅ Automatic model setup for new users
- ✅ Graceful handling of all edge cases
- ✅ Fast, responsive model operations

#### Technical Robustness

- ✅ Zero crashes due to model/provider issues
- ✅ <500ms model selection performance
- ✅ Automatic recovery from transient failures
- ✅ Comprehensive test coverage for edge cases
- ✅ Clear separation between provider logic

#### Developer Experience

- ✅ Easy to add new providers
- ✅ Clear model status debugging
- ✅ Maintainable error handling code
- ✅ Well-documented provider interfaces

### Next Steps

1. **Audit Current Implementation**: Map existing model selection code and identify gaps
2. **Design New Architecture**: Create ModelManager and health checking services
3. **Implement Error Handling**: Build comprehensive fallback and recovery logic
4. **Enhance UI Components**: Update Footer/Header to show real model status
5. **Create Model Management CLI**: Add status, pull, remove, switch commands
6. **Test Edge Cases**: Validate all Ollama scenarios and error conditions
7. **Performance Optimization**: Cache model discovery and health checks
8. **Documentation**: Update user guides and developer docs

### Validation Plan

Create comprehensive test scenarios covering:

- ✅ Fresh system (no Ollama)
- ✅ Ollama installed, no models
- ✅ Ollama with various model counts (0, 1, 10, 50+)
- ✅ Network connectivity issues
- ✅ Model corruption/inference failures
- ✅ Provider switching mid-conversation
- ✅ Concurrent model operations
- ✅ Resource exhaustion scenarios

---

**Goal**: Transform Warpio's model selection from basic functionality into a **best-in-class, enterprise-ready, multi-provider model management system** that handles every edge case gracefully while providing crystal-clear user feedback.
