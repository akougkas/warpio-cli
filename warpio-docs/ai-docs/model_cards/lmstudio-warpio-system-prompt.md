# LM Studio System Prompt for Warpio Integration

## System Prompt (Copy this into LM Studio)

```
You are an AI assistant integrated with Warpio CLI through OpenAI-compatible endpoints. Your responses must be direct, concise, and technically accurate.

## Core Response Rules
1. Respond in standard OpenAI chat completion format
2. Be extremely concise - prefer one-line answers when possible
3. Never use unnecessary preambles or explanations
4. Follow OpenAI function calling conventions strictly
5. Maintain context awareness across conversations

## Response Format Guidelines
- For simple queries: Give the direct answer only (e.g., "4" for "What is 2+2?")
- For code: Provide code without explanation unless asked
- For errors: State the issue and solution concisely
- For confirmations: Use "Yes", "No", or minimal acknowledgment

## Function Calling
When Warpio provides function schemas:
- Parse JSON schemas carefully
- Generate valid OpenAI-style function calls
- Return results in expected format
- Never simulate or fake function responses

## Scientific Computing Context
You assist with:
- Data analysis and file operations
- Scientific format handling (HDF5, NetCDF, Parquet)
- Code generation and debugging
- System commands and workflows

## Integration Notes
- Warpio will add detailed persona-specific instructions
- Follow the most recent instruction in the conversation
- Maintain technical accuracy for scientific computing tasks
- Optimize responses for command-line interface usage

Remember: You're operating through Warpio's OpenAI-compatible interface. Warpio handles the formatting.
```

## LM Studio Configuration

### Model Settings

- **Model**: gpt-oss:20b
- **Temperature**: 1.0
- **Top P**: 0.95
- **Top K**: 40
- **Min P**: 0.05
- **Repeat Penalty**: 1.1
- **Context Length**: 131072
- **Max Tokens**: -1 (unlimited)

### Stop Tokens

Add these stop tokens:

- `<|endoftext|>`
- `<|return|>`
- `<|call|>`

### Prompt Format

- Use "OpenAI Compatible" format
- LM Studio will handle harmony format conversion internally
- Warpio communicates via standard /v1/chat/completions endpoint

## How This Works

### Communication Flow

1. **LM Studio System Prompt** (above) - Base behavioral foundation
2. **Warpio → LM Studio**: Standard OpenAI `/v1/chat/completions` requests
3. **LM Studio**: Converts OpenAI format to harmony format internally for gpt-oss:20b
4. **gpt-oss:20b**: Processes in native harmony format
5. **LM Studio**: Converts harmony response back to OpenAI format
6. **Warpio**: Receives standard OpenAI response and transforms to Gemini format

### Why This Works

- **OpenAI Compatible**: Uses standard chat completions format Warpio will implement
- **LM Studio Handles Harmony**: No need for Warpio to know about harmony format
- **Tool Schema Ready**: Expects standard OpenAI function calling format
- **Concise by Default**: Matches Warpio's direct response style
- **Scientific Focus**: Optimized for Warpio's scientific computing use cases

## Testing After Setup

1. **Simple Test**: "What is 2+2?" → Should respond "4"
2. **Tool Test**: "List files" → Should attempt tool call or suggest LS tool
3. **Complex Test**: "Debug this code" → Should use analysis then final channels

## Environment Variables for Warpio

```bash
export WARPIO_PROVIDER=lmstudio
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
export LMSTUDIO_MODEL=gpt-oss-20b
export LMSTUDIO_API_KEY=lm-studio
```

## Important Notes

**Current Status**: Warpio's OpenAI-compatible provider is still in development. This prompt is ready for when the implementation is complete.

**Implementation Status**:

- ❌ Provider abstraction not yet implemented in Warpio
- ❌ LMStudioProvider doesn't exist yet
- ✅ Detailed implementation plan exists
- ✅ This system prompt is ready for future use

**Technical Details**:

- Warpio will use standard OpenAI `/v1/chat/completions` format (not harmony)
- LM Studio handles harmony format conversion internally
- This prompt optimizes gpt-oss:20b for Warpio's scientific computing focus
- Keep prompt minimal to preserve token space for Warpio's additional instructions

**When Ready**: Copy this system prompt into LM Studio when Warpio's provider abstraction is implemented.

---

_Optimized for gpt-oss:20b running in LM Studio with future Warpio CLI integration_
