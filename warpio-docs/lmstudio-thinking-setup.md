# LM Studio Thinking Model Configuration Guide

## ✅ Required LM Studio Settings

### Developer Settings (CRITICAL)
☑️ **Enable "When applicable, separate reasoning_content and content in API responses"**
- This separates thinking into `reasoning_content` field
- Matches OpenAI o1 model behavior
- Required for proper thinking display in Warpio CLI

### Model Settings for Qwen Thinking Models

#### Temperature & Sampling
```
Temperature: 0.6
Top P: 0.95
Top K: 20
Min P: 0.05
Repeat Penalty: 1.0
```

#### Stop Strings
```
<|im_end|>
<|endoftext|>
```

**DO NOT add `<think>` or `</think>` as stop strings!** The model needs to generate these naturally.

#### Context Settings
```
Context Length: 8192 (or higher)
Context Overflow: Truncate Middle
```

## How It Works

### With "separate reasoning_content" Enabled (Recommended)

1. Model generates: `<think>reasoning steps...</think>actual response`
2. LM Studio API separates this into:
   ```json
   {
     "choices": [{
       "message": {
         "content": "actual response",
         "reasoning_content": "reasoning steps..."
       }
     }]
   }
   ```
3. Warpio CLI can access both fields separately
4. Only the `content` field is displayed to users
5. Reasoning can be optionally shown or logged

### Without Separation (Fallback)

If the experimental feature is disabled:
1. Full output including `<think>` tags is returned
2. Warpio CLI parses and filters tags client-side
3. Less efficient but still functional

## Testing Your Configuration

### 1. Test in LM Studio Chat
```
User: What is 25 * 37? Think step by step.
```

Expected: You should see reasoning in a separate section if the feature is enabled.

### 2. Test via API
```bash
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-4b-thinking-2507",
    "messages": [
      {"role": "user", "content": "What is 25 * 37? Think step by step."}
    ],
    "temperature": 0.6
  }'
```

Check if response has `reasoning_content` field.

### 3. Test in Warpio CLI
```bash
npx warpio -p "What is 25 * 37? Think step by step."
```

Expected: Clean output without thinking tags visible.

## Model-Specific Notes

### Qwen3 Thinking Models
- Have `<think>` and `</think>` tokens (IDs 151667-151668)
- Generate thinking naturally when prompted
- Support `/think` and `/no_think` commands (in prompts)

### GPT-OSS Models
- Use harmony format with channels (analysis, commentary, final)
- Require specific system message for reasoning levels
- Best with `reasoning_effort: "medium"`

## Troubleshooting

### Thinking tags visible in output?
1. ✅ Enable "separate reasoning_content" in LM Studio Developer settings
2. ✅ Restart LM Studio server after changing settings
3. ✅ Ensure you're using a thinking-capable model

### No thinking generated?
1. Add "Think step by step" to your prompt
2. Use a model with "thinking" in the name
3. Check temperature isn't too low (0.6 recommended)

### API not returning reasoning_content?
1. Verify LM Studio version is recent (feature is experimental)
2. Check Developer settings checkbox is enabled
3. Test with curl to confirm API behavior

## Warpio CLI Integration Status

- ✅ Detects thinking models by name
- ✅ Shows 🧠 icon for reasoning capability
- ✅ Supports reasoning_content field extraction
- ⚠️ Full filtering implementation pending
- ⚠️ Interactive thinking display options pending