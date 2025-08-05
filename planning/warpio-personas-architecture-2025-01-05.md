# Warpio Personas Architecture Implementation Plan

## Current Status

- [x] PersonaManager class created
- [x] Basic persona file parsing
- [x] Built-in IOWarp persona templates
- [x] Directory structure for personas
- [x] CLI argument handling for personas

## Next Implementation Steps

### 1. System Prompt Integration

- Modify `getCoreSystemPrompt()` to:
  - Accept optional `activePersona` parameter
  - Prepend persona system prompt to core system prompt
- Update all calls to `getCoreSystemPrompt()` to pass persona context

### 2. Persona-Specific Tool Selection

- Enhance `PersonaManager` to:
  - Filter available tools based on persona definition
  - Dynamically adjust tool registry for active persona
- Create method `getPersonaTools(personaName: string): string[]`

### 3. Enhanced Persona Metadata

```typescript
interface PersonaDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  recommendedModels?: string[]; // Suggest best models for persona
  expertiseDomains: string[]; // Searchable expertise tags
  examples?: string[]; // Usage examples
}
```

### 4. Persona Discovery and Management

- Implement `warpio --list-personas`
  - Show built-in and user-created personas
- Add `warpio --persona-help <name>`
  - Display detailed persona information
- Create user-friendly persona creation wizard

### 5. Persistent Persona Selection

- Store last used persona in user config
- Add option to set default persona
- Support project-level persona preferences

### 6. Performance Optimizations

- Implement persona caching
- Lazy-load persona definitions
- Validate persona files on startup

### 7. Security Enhancements

- Sanitize persona system prompts
- Restrict persona file locations
- Add signature/hash verification for built-in personas

### Testing Strategy

- Unit tests for `PersonaManager`
- Integration tests for persona system prompt injection
- CLI argument parsing tests
- Tool selection and filtering tests

### Documentation Requirements

- Update CLI help text
- Create comprehensive persona usage guide
- Document persona file format
- Provide examples of custom persona creation

## Proof of Concept Milestones

1. ✅ Basic persona infrastructure
2. 🔄 System prompt integration
3. 🔲 Tool selection mechanism
4. 🔲 User persona creation workflow
5. 🔲 Comprehensive testing

## Open Questions

- How to handle conflicts between persona tools and user-specified tools?
- What's the most intuitive way to create and share personas?
