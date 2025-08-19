# Warpio Implementation Debugging Plan

Generated: 2025-08-15-13-58-46
Type: Comprehensive Issue Investigation
Severity: High Priority

## Executive Summary

Based on demo test results and codebase analysis, Warpio has multiple critical bugs that prevent effective operation across different providers and personas. The main issues are **tool compatibility failures with Ollama models**, **incomplete responses and stream interruptions**, **thinking tag filtering not working**, and **model management inconsistencies**.

## Critical Issues Identified

### 1. 🚨 CRITICAL: Ollama Tool Support Failures

**Symptom**: All Ollama models report "does not support tools" error
**Impact**: Complete failure of persona system and MCP servers with Ollama
**Lines affected**: 
- `demo-results.md:662-722` - Repeated tool support errors
- `model-manager.ts:559-560` - Heuristic tool detection logic

**Root Cause Analysis**:
1. **Heuristic Tool Detection Bug**: `model-manager.ts` lines 559-560 use overly simplistic heuristics
2. **No Model Capability Validation**: System assumes tools work without API verification
3. **Provider-Specific Tool Handling Missing**: Ollama has different tool support patterns

### 2. 🚨 CRITICAL: Stream Interruption and SIGINT Issues

**Symptom**: Responses cut off mid-stream with SIGINT signals
**Impact**: Incomplete responses, poor user experience
**Lines affected**:
- `demo-results.md:200-203, 524-526` - SIGINT interruptions
- `demo-results.md:1298-1300` - Multiple stream failures

**Root Cause Analysis**:
1. **Buffer Management Issues**: Streaming responses not properly handled
2. **Thinking Filter Interference**: Thinking tag processing may interrupt streams
3. **Provider Connection Instability**: Timeouts or connection drops

### 3. 🔧 MAJOR: Thinking Tag Filtering Not Working

**Symptom**: `<think>` tags appearing in output despite filtering implementation
**Impact**: Thinking content visible to users, poor response quality
**Lines affected**:
- `thinking-filter.ts:54-75` - Tag parsing logic
- `thinking-filter.ts:116-142` - Streaming chunk processing

**Root Cause Analysis**:
1. **Filter Not Integrated**: Thinking filter exists but not connected to streaming pipeline
2. **Streaming Processing Gap**: Real-time filtering not implemented
3. **Provider-Specific Differences**: Different thinking formats not handled

### 4. 🔧 MAJOR: Model Management and Discovery Issues

**Symptom**: Inconsistent model availability and switching
**Impact**: Poor model discovery and switching experience
**Lines affected**:
- `model-manager.ts:459-532` - LM Studio discovery logic
- `model-manager.ts:534-590` - Ollama discovery logic

**Root Cause Analysis**:
1. **Default Host Handling**: Incorrect localhost fallback logic
2. **Model Validation Missing**: No real-time model availability checks
3. **Cache Invalidation Issues**: Stale model information

### 5. 🔧 MODERATE: MCP Server Loading and Activation

**Symptom**: Persona MCPs load but tools may not be available
**Impact**: Reduced functionality for personas
**Lines affected**:
- `mcp-manager.ts:99-129` - MCP server loading
- `demo-results.md:392-394` - Tool call errors

**Root Cause Analysis**:
1. **Tool Discovery Timing**: MCPs loaded but tools not immediately available
2. **Provider Tool Compatibility**: Tool calls fail on certain providers
3. **Error Handling Incomplete**: Silent failures in tool loading

## Issue Priority Matrix

| Issue | Severity | Impact | Effort | Priority |
|-------|----------|--------|--------|----------|
| Ollama Tool Support | Critical | High | Medium | P0 |
| Stream Interruptions | Critical | High | High | P0 |
| Thinking Filter | Major | Medium | Low | P1 |
| Model Management | Major | Medium | Medium | P1 |
| MCP Integration | Moderate | Medium | Low | P2 |

## Step-by-Step Fix Implementation Plan

### Phase 1: Critical Fixes (P0 Issues) - Week 1

#### Fix 1.1: Ollama Tool Support Detection

**Problem**: Heuristic tool detection fails for Ollama models

**Files to modify**:
- `packages/core/src/warpio/model-manager.ts:559-560`
- `packages/core/src/warpio/provider-registry.ts:67-85`

**Implementation**:
1. **API-Based Tool Detection**: Query Ollama API for actual tool support
2. **Model-Specific Overrides**: Maintain known tool compatibility matrix
3. **Graceful Degradation**: Disable tools instead of failing completely

```typescript
// In model-manager.ts:559-560
supportsTools: await this.validateToolSupport(model.name, 'ollama'),

// New method to add:
private async validateToolSupport(modelName: string, provider: string): Promise<boolean> {
  if (provider === 'ollama') {
    // Test tool call capability with simple function
    try {
      const testResponse = await this.testToolCall(modelName);
      return testResponse.success;
    } catch {
      return false; // Graceful fallback
    }
  }
  return true; // Default for other providers
}
```

#### Fix 1.2: Stream Interruption Resolution

**Problem**: Responses cut off with SIGINT signals

**Files to modify**:
- `packages/core/src/warpio/provider-integration.ts:66-73`
- `packages/core/src/warpio/thinking-filter.ts:116-142`

**Implementation**:
1. **Buffer Management**: Implement proper stream buffering
2. **Error Recovery**: Add retry logic for interrupted streams
3. **Timeout Handling**: Increase timeouts for local models

```typescript
// In provider-integration.ts
const config = {
  // ... existing config
  timeout: provider === 'ollama' ? 60000 : 30000, // Increase timeout
  retries: 3,
  bufferSize: 8192, // Larger buffer for streaming
};
```

### Phase 2: Major Improvements (P1 Issues) - Week 2

#### Fix 2.1: Thinking Tag Filter Integration

**Problem**: Thinking filter exists but not connected to streaming

**Files to modify**:
- `packages/core/src/warpio/provider-integration.ts`
- `packages/core/src/providers/manager.ts` (if exists)

**Implementation**:
1. **Stream Processing Pipeline**: Integrate thinking filter into response stream
2. **Real-time Filtering**: Process chunks as they arrive
3. **Provider-Specific Handling**: Different thinking formats per provider

```typescript
// In provider integration
import { processStreamingChunk, isThinkingModel } from './thinking-filter.js';

// During streaming response processing
if (isThinkingModel(modelName)) {
  const processed = processStreamingChunk(chunk);
  if (!processed.isThinking) {
    yield processed.content; // Only output non-thinking content
  }
}
```

#### Fix 2.2: Model Management Improvements

**Problem**: Inconsistent model discovery and switching

**Files to modify**:
- `packages/core/src/warpio/model-manager.ts:459-474`
- `packages/core/src/warpio/model-manager.ts:761-834`

**Implementation**:
1. **Robust Discovery**: Better error handling and fallbacks
2. **Real-time Validation**: Verify model availability before switching
3. **Connection Testing**: Test actual connectivity during discovery

### Phase 3: System Integration (P2 Issues) - Week 3

#### Fix 3.1: MCP Tool Compatibility Matrix

**Problem**: Tools fail on certain providers without clear feedback

**Files to modify**:
- `packages/core/src/warpio/mcp-manager.ts:99-129`
- `packages/core/src/warpio/personas/*.ts`

**Implementation**:
1. **Provider Compatibility Checks**: Validate tool support per provider
2. **Graceful Degradation**: Disable incompatible tools instead of failing
3. **User Feedback**: Clear messages about tool availability

## Testing Strategy

### Unit Tests Required
1. **Tool Support Detection**: Test against known Ollama models
2. **Stream Processing**: Verify thinking tag filtering works
3. **Model Switching**: Test provider transitions
4. **MCP Integration**: Verify tool loading and unloading

### Integration Tests Required
1. **End-to-End Persona Workflows**: Test complete persona scenarios
2. **Provider Switching**: Test model changes in active sessions
3. **Error Recovery**: Test stream interruption recovery
4. **Tool Compatibility**: Test tools across all providers

### Performance Validation
1. **Stream Latency**: Measure response time improvements
2. **Memory Usage**: Monitor memory during long sessions
3. **Model Switch Speed**: Time provider transitions
4. **Tool Loading Time**: Measure MCP server startup

## System Architecture Improvements

### 1. Provider Capability Discovery
Implement dynamic capability detection for each provider:
- Tool support matrix
- Context length limits
- Special features (thinking, streaming, etc.)

### 2. Resilient Streaming Pipeline
Build robust streaming with:
- Automatic retry on interruption
- Buffer management for partial responses
- Graceful error recovery

### 3. Tool Compatibility Layer
Create abstraction for tool compatibility:
- Provider-specific tool filtering
- Capability-based tool selection
- Graceful degradation patterns

## Prompt Engineering Recommendations

### 1. System Prompt Optimization
Current system prompts are effective but could be enhanced:

**Scientific Focus**: Current prompts correctly emphasize scientific computing
**Identity Clarity**: Warpio identity is well-established
**Tool Integration**: Could better explain when tools are unavailable

### 2. Persona Prompt Refinement
**data-expert**: Excellent technical depth
**hpc-expert**: Good scaling analysis
**analysis-expert**: Strong workflow focus

**Recommendations**:
- Add fallback behaviors when tools are unavailable
- Include provider-specific optimization hints
- Better error handling instructions

### 3. Error Handling Prompts
Add system prompts for error scenarios:
- Tool unavailability graceful degradation
- Streaming interruption recovery
- Provider connection issues

## Prevention Strategies

### 1. Comprehensive Testing
- Automated testing across all provider/model combinations
- Stream interruption simulation
- Tool compatibility validation

### 2. Monitoring and Alerting
- Track tool success rates by provider
- Monitor stream completion rates
- Alert on model discovery failures

### 3. Documentation and Guidelines
- Provider-specific setup guides
- Tool compatibility matrix
- Troubleshooting playbooks

## Success Metrics

### Technical Metrics
- [ ] Ollama tool success rate > 90%
- [ ] Stream completion rate > 95%
- [ ] Model switch success rate > 98%
- [ ] Thinking tag filter effectiveness > 99%

### User Experience Metrics
- [ ] Zero "does not support tools" errors for compatible models
- [ ] No visible thinking tags in output
- [ ] Consistent persona behavior across providers
- [ ] Fast model switching (< 3 seconds)

## Implementation Timeline

**Week 1**: Critical fixes (Ollama tools, stream interruptions)
**Week 2**: Major improvements (thinking filter, model management)
**Week 3**: Integration and polish (MCP improvements, testing)
**Week 4**: Performance optimization and documentation

## Risk Assessment

**High Risk**: 
- Stream processing changes could introduce new bugs
- Provider-specific code may break existing functionality

**Medium Risk**:
- Tool compatibility matrix maintenance overhead
- Performance impact of additional validation

**Low Risk**:
- Thinking filter integration is isolated
- Model management improvements are additive

## Next Steps

1. **Immediate Action**: Implement Ollama tool support fix (highest impact)
2. **Parallel Development**: Start stream interruption analysis
3. **Testing Setup**: Create comprehensive test suite for providers
4. **Documentation**: Document known issues and workarounds

**This debugging plan provides a systematic approach to resolving all identified issues while maintaining system stability and improving user experience across all providers and personas.**