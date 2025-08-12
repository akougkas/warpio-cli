# Next Session: Clean Slate Local AI Optimization

## 🎯 PRIMARY OBJECTIVE
Design minimal, production-ready local AI support that mirrors Gemini CLI's approach with clean architecture.

## 🏗️ Architecture Redesign (From Scratch)

### 1. LocalLLMClient Base Class
- Clean abstraction implementing GeminiClient interface
- Minimal, focused on parity with Gemini CLI functionality  
- No legacy code - fresh implementation

### 2. Provider-Specific Implementations
- **OllamaClient**: Native SDK integration extending LocalLLMClient
- **LMStudioClient**: OpenAI-compatible implementation extending LocalLLMClient
- Each focused on their provider's strengths, clean separation

### 3. Thinking Token Support
- **IGNORE PREVIOUS ARCHITECTURE** - Design fresh approach
- Mirror Gemini CLI's thinking model handling exactly
- Study how Gemini CLI detects, processes, and displays thinking tokens
- Implement equivalent for local models with same UI/UX patterns

## 🔧 Optimization Session Goals

- **Production Parity**: Local models work as reliably as `gemini:flash`
- **Minimal Footprint**: Clean, focused code - no over-engineering  
- **Upstream Safe**: All changes additive, zero impact on Gemini CLI core
- **Tool Calling**: Debug and fix `gpt-oss:20b` reliability to match Gemini

## 📋 Session Deliverables

- New LocalLLMClient architecture diagram
- Clean OllamaClient and LMStudioClient implementations
- Thinking token support mirroring Gemini CLI patterns
- Comprehensive testing ensuring local model parity

## 🚀 Session Start Protocol

1. Read CLAUDE.md first for context and rules
2. Review this NEXT.md for specific session objectives
3. Use file-searcher agent to analyze current local model implementations
4. Design clean architecture from scratch based on findings
5. Implement with focus on minimal, production-ready code