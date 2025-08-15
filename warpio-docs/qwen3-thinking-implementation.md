# Qwen3 Thinking Models - Implementation Guide

## Key Findings

Based on official Qwen3 documentation and LM Studio integration:

1. **Thinking Mode Control**: Qwen3 uses `enable_thinking=True` parameter, not stop tokens
2. **Dynamic Switching**: Users can use `/think` and `/no_think` commands to control reasoning
3. **Template Handling**: The Jinja2 chat template automatically filters thinking content from history
4. **LM Studio Support**: LM Studio has official presets for Qwen3 thinking models

## Correct Configuration for LM Studio

### Sampling Parameters (Thinking Mode)
- **Temperature**: 0.6
- **Top P**: 0.95
- **Top K**: 20
- **Min P**: 0
- **Important**: Avoid greedy decoding (temp=0) to prevent infinite loops

### Sampling Parameters (Non-Thinking Mode)
- **Temperature**: 0.7
- **Top P**: 0.8
- **Top K**: 20
- **Min P**: 0

## Implementation Requirements

### 1. Model Detection
Models with "thinking" in the name should be detected as thinking-capable.

### 2. Output Processing
- In multi-turn conversations, thinking content (`<think>...</think>`) should be stripped from history
- Only the final output (after `</think>`) should be retained in conversation history
- This is handled by the Jinja2 chat template automatically

### 3. User Control
Users should be able to:
- Enable thinking with prompts like "Think step by step"
- Use `/think` to enable reasoning for complex tasks
- Use `/no_think` for quick responses

## Current Warpio CLI Status

### What Works:
- ✅ Detection of thinking models by name
- ✅ Capability detection shows reasoning icon
- ✅ Model configuration for LM Studio

### What Needs Implementation:
- ⚠️ Post-processing to filter `<think>` tags from display
- ⚠️ Support for `/think` and `/no_think` commands
- ⚠️ Proper handling of thinking content in conversation history

## Technical Notes

- Qwen3 thinking tokens are part of the vocabulary (IDs 151667-151668)
- The model generates thinking content naturally when prompted
- OpenAI-compatible endpoints (LM Studio) return full output including thinking tags
- Client-side filtering is needed for clean display