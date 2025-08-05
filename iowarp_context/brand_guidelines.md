# IOWarp Brand Guidelines

## Brand Identity

### IOWarp Ecosystem

- **IOWarp**: The parent brand representing next-generation development tools and AI-powered workflows
- **Warpio CLI**: Terminal-based AI agent for development tasks, part of the IOWarp family

### Brand Positioning

- **Innovation**: Cutting-edge AI integration for developers
- **Efficiency**: Streamlined workflows and intelligent automation
- **Community**: Open-source foundation with enterprise-grade capabilities

## Naming Conventions

### Product Names

- **IOWarp**: Main brand (capitalize both I and O, no spaces)
- **Warpio CLI**: Terminal product (capitalize both words)
- **warpio**: Command name (lowercase, as used in terminal)

### File Naming

- Configuration files: `.warpio` instead of `.gemini`
- Ignore files: `.warpioignore` instead of `.geminiignore`
- Documentation: `warpio-*` instead of `gemini-*`

## Terminology Replacements

### User-Facing Terms

| From          | To            | Context             |
| ------------- | ------------- | ------------------- |
| Gemini CLI    | Warpio CLI    | Product references  |
| gemini        | warpio        | Command examples    |
| .geminiignore | .warpioignore | Configuration files |

### Preserve (Internal/API)

- Package names: `@google/gemini-cli-core`
- Environment variables: `GEMINI_API_KEY`, `GEMINI_SANDBOX`
- API functions: `GeminiClient`, `geminiRequest`
- Internal file names: `gemini.tsx`, `geminiChat.ts`

## Messaging Framework

### Value Propositions

1. **Intelligent Development**: AI-powered assistance for complex development tasks
2. **Seamless Integration**: Works within existing development workflows
3. **Upstream Compatible**: Maintains compatibility with original Gemini CLI

### Tone of Voice

- **Professional yet approachable**
- **Technically accurate**
- **Community-focused**
- **Innovation-forward**

## Visual Identity Considerations

### Assets to Update

- Screenshots: Replace Gemini CLI references with Warpio CLI
- Diagrams: Update product name references
- Terminal examples: Show `warpio` command instead of `gemini`

### Asset Naming

- `warpio-screenshot.png` instead of `gemini-screenshot.png`
- Theme assets can remain as-is (generic)

## Integration Strategy

### Documentation Structure

- Maintain original documentation organization
- Update content to reflect Warpio CLI branding
- Preserve technical accuracy and completeness

### Command Line Experience

- `warpio` command as primary interface
- Help text and error messages use "Warpio CLI"
- Maintain all original functionality

## Compliance and Legal

### Attribution

- Maintain reference to original Gemini CLI project
- Include appropriate licensing and attribution
- Preserve Google's intellectual property in internal APIs

### Repository Management

- Fork relationship clearly documented
- Upstream compatibility maintained
- Contribution pathway preserved

---

_These guidelines ensure consistent IOWarp branding while maintaining technical integrity and upstream compatibility._
