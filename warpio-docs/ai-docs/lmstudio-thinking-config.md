# LM Studio Configuration for Thinking Models

## Qwen Thinking Models Setup

Qwen models (including `qwen3-4b-thinking-2507`) have built-in thinking support using `<think>` and `</think>` tags (token IDs 151667 and 151668).

### 1. Stop Tokens Configuration

**IMPORTANT**: For thinking models to work properly in LM Studio, you should NOT add thinking tags as stop tokens. Instead, the model should generate thinking content naturally.

Recommended stop tokens for Qwen models:
- `<|im_end|>` (standard message end)
- `<|endoftext|>` (end of text)

### 2. Chat Template

Qwen models come with a built-in chat template that handles thinking tags automatically. The template:
- Extracts content between `<think>` and `</think>` tags as reasoning_content
- Separates thinking from the actual response
- Adds `<think>\n` at the start when generation begins (for thinking models)

The default Qwen chat template in LM Studio should handle this correctly.

### 3. Model Parameters

Recommended settings for thinking models:
- **Temperature**: 0.7-0.9 (allows for creative reasoning)
- **Max Tokens**: 8192+ (thinking requires more tokens)
- **Top P**: 0.95
- **Repeat Penalty**: 1.0-1.1

### 4. How It Works

1. When prompted, Qwen thinking models generate: `<think>reasoning steps...</think>actual response`
2. Warpio CLI detects thinking models by name pattern (containing "think" or "thinking")
3. For display purposes:
   - With OpenAI-compatible endpoints (LM Studio), the full output including thinking tags is shown
   - This is because OpenAI API doesn't have native thinking support like Gemini's `thinkingConfig`
4. To hide thinking content, you would need to post-process the response in the client

### 5. Testing

Test with a prompt that requires reasoning:
```bash
npx warpio -p "What is 25 * 37? Think step by step."
```

The model will think internally but only show the final answer.

## Supported Thinking Models

Models automatically detected as thinking-enabled:
- Any model with "thinking" or "think" in the name
- Gemini 2.5 models
- GPT-OSS 20B models

## Troubleshooting

### If thinking tags appear in output:
This is expected behavior for OpenAI-compatible endpoints. Unlike Gemini's native thinking support, LM Studio returns the full model output including thinking tags.

### To enable thinking:
1. Use a model with "thinking" in the name (e.g., `qwen3-4b-thinking-2507`)
2. Prompt the model to think: "Think step by step before answering"
3. The model will generate `<think>` tags naturally

### Token IDs Reference:
- `<think>`: Token ID 151667
- `</think>`: Token ID 151668
- These are registered in the tokenizer but marked as `special: false`