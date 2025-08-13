# 🎨 Warpio UI Enhancement Developer Guide

Welcome to the Warpio UI Enhancement system! This guide covers how to develop, debug, and extend Warpio's UI components while maintaining upstream compatibility with the Gemini CLI.

## 📚 Overview

Warpio enhances the Gemini CLI with provider-aware UI components that showcase multi-provider capabilities and scientific computing focus. All enhancements use a **wrapper pattern** to preserve 100% upstream compatibility.

## 🏗️ Architecture

### Core Design Philosophy

```typescript
// ✅ CORRECT: Wrapper pattern preserves original components
export const WarpioFooter = (props) => (
  <Box flexDirection="column">
    <Footer {...props} />           // Original component untouched
    <WarpioStatusBar {...props} />  // Our enhancement below
  </Box>
);

// ❌ WRONG: Never modify original components directly
// Footer.tsx - DO NOT TOUCH
```

### Directory Structure

```
packages/cli/src/ui/
├── components/              # Original Gemini components (NEVER MODIFY)
│   ├── Footer.tsx
│   ├── Header.tsx
│   └── Tips.tsx
├── warpio/                  # Warpio UI enhancements
│   ├── WarpioFooter.tsx     # Enhanced footer wrapper
│   ├── WarpioHeader.tsx     # Welcome header component
│   ├── WarpioTips.tsx       # Scientific mission tips
│   └── utils/
│       ├── providerDetection.ts  # Provider intelligence
│       └── skillDetection.ts     # Model capability detection
└── App.tsx                  # Minimal integration point
```

## 🔧 Component System

### 1. WarpioFooter - Provider Status Line

**Purpose**: Add provider awareness below the original footer

```typescript
// Enhanced footer shows:
// ┌─────────────────────────────────────────────┐
// │ ~/project (main)    no sandbox    gemini-2.0│ ← Original Footer
// ├─────────────────────────────────────────────┤
// │ Inference: Google │ Skills: 📝👁️🔧 │ Persona: data-expert │ ← Warpio Line
// └─────────────────────────────────────────────┘

interface WarpioFooterProps extends FooterProps {
  // Inherits all original Footer props
}

export const WarpioFooter: React.FC<WarpioFooterProps> = (props) => {
  const providerInfo = getProviderInfo();
  const skillsDisplay = getSkillsDisplay(props.model);
  const activePersona = getActivePersona();

  return (
    <Box flexDirection="column">
      <Footer {...props} />  {/* Original footer unchanged */}
      <ProviderStatusBar 
        provider={providerInfo}
        skills={skillsDisplay}
        persona={activePersona}
      />
    </Box>
  );
};
```

### 2. WarpioHeader - Scientific Welcome

**Purpose**: Show scientific branding and provider info on startup

```typescript
export const WarpioHeader: React.FC<WarpioHeaderProps> = ({
  showWelcome = false,  // Only show on startup
  ...props
}) => (
  <Box flexDirection="column">
    <Header {...props} />  {/* Original header unchanged */}
    {showWelcome && <ScientificWelcomeBanner />}
  </Box>
);
```

### 3. WarpioTips - Mission-Focused Guidance

**Purpose**: Replace generic tips with scientific computing workflows

```typescript
export const WarpioTips: React.FC<WarpioTipsProps> = ({ config }) => {
  const activePersona = config.getActivePersona();
  const provider = getProviderInfo();
  
  return (
    <Box flexDirection="column">
      <ScientificBranding />
      {activePersona ? (
        <PersonaSpecificTips persona={activePersona} />
      ) : (
        <GeneralScientificTips />
      )}
      <ProviderSpecificHints provider={provider} />
      <ModelManagementTips />
    </Box>
  );
};
```

## 🔍 Provider Detection System

### Smart Provider Intelligence

```typescript
// Auto-detect provider from environment
export function getProviderInfo(): ProviderInfo {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  
  const providerMap: Record<string, ProviderInfo> = {
    gemini: { name: 'Google', color: '#0D83C9', isLocal: false },
    lmstudio: { name: 'LMStudio', color: '#9333EA', isLocal: true },
    ollama: { name: 'Ollama', color: '#475569', isLocal: true },
    openai: { name: 'OpenAI', color: '#10A37F', isLocal: false },
  };
  
  return providerMap[provider] || defaultProvider;
}

// Detect model capabilities from patterns
export function detectModelSkills(model: string): ModelSkills {
  return {
    text: true,  // All models support text
    vision: model.includes('vision') || model.includes('gemini'),
    tools: model.includes('gemini') || model.includes('gpt-4'),
    reasoning: model.includes('o1') || model.includes('gemini-2.0'),
  };
}

// Get context limits per provider/model
export function getContextInfo(model: string): ContextInfo {
  // Smart detection based on model patterns
  // Returns { current: 0, max: contextLimit }
}
```

## 🎯 Integration Pattern

### Minimal App.tsx Changes

```typescript
// Only 3 lines changed in App.tsx:

// 1. Import Warpio components
import { WarpioFooter } from './warpio/WarpioFooter.js';
import { WarpioHeader } from './warpio/WarpioHeader.js';
import { WarpioTips } from './warpio/WarpioTips.js';

// 2. Replace in header static area
- <Header version={version} nightly={nightly} />
+ <WarpioHeader version={version} nightly={nightly} showWelcome={showWelcome} />

- <Tips config={config} />
+ <WarpioTips config={config} />

// 3. Replace in footer area
- <Footer {...footerProps} />
+ <WarpioFooter {...footerProps} />
```

### State Management

```typescript
// Welcome banner state
const [showWelcome, setShowWelcome] = useState(true);

// Hide welcome after first interaction
const handleFinalSubmit = useCallback((submittedValue: string) => {
  if (submittedValue.trim().length > 0) {
    submitQuery(submittedValue);
    setShowWelcome(false);  // Hide welcome banner
  }
}, [submitQuery]);
```

## 🚀 Extending the UI System

### Adding New Provider Support

1. **Update Provider Detection**:
```typescript
// In providerDetection.ts
const providerMap = {
  // Add new provider
  anthropic: {
    name: 'Anthropic',
    color: '#FF6B35',  // Brand color
    isLocal: false,
    supportsStreaming: true,
  },
};
```

2. **Update Skill Detection**:
```typescript
// In skillDetection.ts
export function detectModelSkills(model: string): ModelSkills {
  // Add detection patterns for new provider
  if (modelLower.includes('claude')) {
    skills.vision = true;
    skills.tools = true;
    skills.reasoning = true;
  }
}
```

3. **Update Context Limits**:
```typescript
// Provider-specific context sizes
const contextSizes = {
  'claude-3-sonnet': { current: 0, max: 200000 },
  'claude-3-haiku': { current: 0, max: 200000 },
};
```

### Adding New Model Capabilities

```typescript
// Extend ModelSkills interface
export interface ModelSkills {
  text: boolean;
  vision: boolean;
  tools: boolean;
  reasoning: boolean;
  multimodal?: boolean;    // New capability
  codeGeneration?: boolean; // New capability
}

// Update skill icons
export function getSkillIcons(skills: ModelSkills): string[] {
  const icons: string[] = [];
  if (skills.text) icons.push('📝');
  if (skills.vision) icons.push('👁️');
  if (skills.tools) icons.push('🔧');
  if (skills.reasoning) icons.push('🧠');
  if (skills.multimodal) icons.push('🎭');      // New icon
  if (skills.codeGeneration) icons.push('💻'); // New icon
  return icons;
}
```

### Creating Custom UI Components

```typescript
// Follow wrapper pattern for new components
export const WarpioCustomComponent: React.FC<Props> = (props) => {
  const providerInfo = useProviderInfo();
  const themeColors = useTheme();
  
  return (
    <Box borderColor={themeColors.border.default}>
      <OriginalComponent {...props} />
      <EnhancedFeatures provider={providerInfo} />
    </Box>
  );
};
```

## 🐛 Debugging Guide

### Common Issues and Solutions

1. **TypeScript Compilation Errors**:
```bash
# Common fixes:
# 1. Missing type definitions
interface ProviderInfo {
  name: string;
  color: string;
  isLocal: boolean;
}

# 2. Index signature issues
const providerMap: Record<string, ProviderInfo> = { ... };

# 3. Theme property access
theme.border.default  // Not theme.ui.border
```

2. **Component Not Rendering**:
```typescript
// Debug checklist:
console.log('Provider:', process.env.WARPIO_PROVIDER);
console.log('Model:', config.getModel());
console.log('Persona:', config.getActivePersona());

// Verify imports in App.tsx
import { WarpioFooter } from './warpio/WarpioFooter.js';  // .js extension required
```

3. **Provider Detection Issues**:
```typescript
// Test provider detection
export function debugProviderInfo() {
  const provider = process.env.WARPIO_PROVIDER || 'gemini';
  const model = getModelName();
  const skills = detectModelSkills(model);
  
  console.log({
    provider,
    model,
    skills,
    context: getContextInfo(model)
  });
}
```

### Development Tools

```bash
# Build and test
npm run build          # Check TypeScript compilation
npm run typecheck      # Isolated TypeScript check
npm run lint           # Code style validation

# Test with different providers
WARPIO_PROVIDER=gemini npx warpio -p "test"
WARPIO_PROVIDER=lmstudio npx warpio -p "test"
WARPIO_PROVIDER=ollama npx warpio -p "test"

# Debug mode
DEBUG=warpio:* npx warpio -p "test"
```

## 🧪 Testing Strategy

### Manual Testing Checklist

```typescript
// Test all provider combinations:
const testMatrix = [
  { provider: 'gemini', model: 'gemini-2.5-flash' },
  { provider: 'lmstudio', model: 'qwen-32b' },
  { provider: 'ollama', model: 'llama3.2:3b' },
  { provider: 'openai', model: 'gpt-4o-mini' },
];

// For each combination, verify:
// ✅ Footer shows correct provider name and color
// ✅ Skills display appropriate icons
// ✅ Context limits are accurate
// ✅ Welcome banner appears on startup
// ✅ Tips are provider-appropriate
// ✅ Persona information displays correctly
```

### Automated Testing

```typescript
// Unit tests for provider detection
describe('Provider Detection', () => {
  test('detects Gemini provider correctly', () => {
    process.env.WARPIO_PROVIDER = 'gemini';
    const info = getProviderInfo();
    expect(info.name).toBe('Google');
    expect(info.color).toBe('#0D83C9');
  });
  
  test('detects model skills correctly', () => {
    const skills = detectModelSkills('gemini-2.5-flash');
    expect(skills.vision).toBe(true);
    expect(skills.tools).toBe(true);
  });
});
```

## 📋 Best Practices

### UI Component Development

1. **Always Use Wrapper Pattern**:
```typescript
// ✅ GOOD: Preserve original component
<Box>
  <OriginalComponent {...props} />
  <WarpioEnhancement />
</Box>

// ❌ BAD: Modify original component
// Don't touch packages/cli/src/ui/components/
```

2. **Provider-Aware Design**:
```typescript
// Make UI adapt to provider capabilities
const skills = detectModelSkills(model);
return skills.vision ? <VisionIndicator /> : null;
```

3. **Responsive Design**:
```typescript
const { columns } = useTerminalSize();
const isNarrow = isNarrowWidth(columns);

return (
  <Box flexDirection={isNarrow ? 'column' : 'row'}>
    {/* Responsive layout */}
  </Box>
);
```

4. **Graceful Degradation**:
```typescript
// Always provide fallbacks
const providerInfo = getProviderInfo() || defaultProvider;
const skills = getSkillsDisplay(model) || '📝';
```

### Performance Considerations

```typescript
// Memoize expensive operations
const providerInfo = useMemo(() => getProviderInfo(), []);
const skills = useMemo(() => detectModelSkills(model), [model]);

// Cache context calculations
const contextInfo = useMemo(() => getContextInfo(model), [model]);
```

## 🔄 Maintenance and Updates

### Upstream Compatibility

```bash
# Regular compatibility checks
git fetch upstream
git merge upstream/main

# Verify no conflicts in:
# - packages/cli/src/ui/components/
# - Core App.tsx functionality
# - Original Footer/Header/Tips behavior
```

### Version Updates

When updating to new Gemini CLI versions:

1. **Preserve Warpio Directory**: `/packages/cli/src/ui/warpio/` should never conflict
2. **Check Integration Points**: Verify App.tsx changes still work
3. **Test All Providers**: Ensure UI enhancements work with new version
4. **Update Documentation**: Keep this guide current with any changes

## 📚 Related Documentation

- **Architecture**: `ARCHITECTURE.md` - Overall system design
- **Extensions**: `EXTENDING.md` - Copy-paste examples  
- **Main Guide**: `CLAUDE.md` - Development guidelines
- **Implementation Log**: `.claude/devlog.md` - Phase 10 details

## 🚨 Critical Rules

1. **NEVER modify original components** in `/packages/cli/src/ui/components/`
2. **ALWAYS use wrapper pattern** for UI enhancements
3. **ALWAYS test with all providers** before committing
4. **ALWAYS maintain TypeScript compliance**
5. **ALWAYS document provider-specific behavior**

---

## 🎯 Quick Reference

**Add Provider**: Update `providerDetection.ts` and `skillDetection.ts`  
**Add Capability**: Extend `ModelSkills` interface and detection logic  
**Debug Issues**: Use `DEBUG=warpio:*` and check console logs  
**Test Changes**: Run with all provider combinations  
**Maintain Compatibility**: Never touch original Gemini components  

**Success Metric**: UI enhancements should work seamlessly across all providers while maintaining the original Gemini CLI experience for users who don't enable Warpio features.

_Last Updated: August 2025 - Phase 10 UI Enhancement System Complete_