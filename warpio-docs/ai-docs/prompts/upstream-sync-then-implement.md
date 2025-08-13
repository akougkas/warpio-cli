# 🔄 Upstream Sync & Local AI Implementation Session

## Priority 1: Upstream Synchronization

Please use the **upstream-sync** subagent to synchronize with the upstream google-gemini/gemini-cli repository before we begin implementing the local AI provider abstraction.

### Sync Instructions

1. **Use the upstream-sync agent** to:
   - Fetch latest changes from `google-gemini/gemini-cli`
   - Merge upstream/main into our main branch
   - Resolve any conflicts while preserving our Warpio enhancements
   - Ensure all our modifications remain isolated and non-breaking

2. **Key Files to Preserve During Merge**:
   - Our enhanced CLAUDE.md and README.md
   - Everything in `/warpio-docs/`
   - Our persona definitions in `packages/core/src/personas/`
   - Any Warpio-specific branding changes

3. **Conflict Resolution Strategy**:
   - For core Gemini files: Accept upstream changes
   - For our additions: Keep our changes
   - For modified sections: Carefully merge preserving both functionalities

## Priority 2: Local AI Provider Implementation

After successful upstream sync, implement the provider abstraction following the plan at:
`/warpio-docs/ai-docs/plans/provider-abstraction-implementation.md`

### Implementation Checklist

#### Phase 1: Foundation
- [ ] Create `packages/core/src/providers/` directory
- [ ] Implement `provider.interface.ts` with Provider interface
- [ ] Create `OpenAICompatibleProvider` base class
- [ ] Implement `OpenAIToGeminiTransformer` for format conversion

#### Phase 2: LM Studio Provider
- [ ] Create `LMStudioProvider` extending `OpenAICompatibleProvider`
- [ ] Configure for `http://192.168.86.20:1234/v1`
- [ ] Default model: `gpt-oss-20b`
- [ ] Test connection and basic generation

#### Phase 3: Integration
- [ ] Modify `contentGenerator.ts` minimally to check for provider override
- [ ] Add provider configuration to Config class (flat structure)
- [ ] Implement fallback to `gemini-2.0-flash`
- [ ] Test provider switching via environment variables

### Testing Requirements

```bash
# Test LM Studio connection
export WARPIO_PROVIDER=lmstudio
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
export LMSTUDIO_MODEL=gpt-oss-20b
npx warpio "Test LM Studio connection"

# Test fallback
export WARPIO_FALLBACK_PROVIDER=gemini
export WARPIO_FALLBACK_MODEL=gemini-2.0-flash
npx warpio "Test fallback mechanism"
```

## Important Context

### Current Status
- **Branch**: main
- **Last Commit**: Provider abstraction planning and SDK documentation
- **Implementation Plan**: Complete and documented
- **SDK Docs**: Ready in `/warpio-docs/warpio-sdk/`

### Design Principles (MUST FOLLOW)
1. **100% Backward Compatibility**: Never break Gemini functionality
2. **Isolation Philosophy**: All provider code in separate modules
3. **Transform at Boundaries**: Maintain Gemini format internally
4. **Minimal Disruption**: Following Qwen's approach
5. **Explicit Configuration**: User controls provider selection

### Files Never to Modify
- `packages/core/src/gemini.tsx`
- `packages/core/src/geminiChat.ts`
- `packages/core/src/core/client.ts` (only extend, don't modify)

### Key References
- **Implementation Plan**: `/warpio-docs/ai-docs/plans/provider-abstraction-implementation.md`
- **SDK Documentation**: `/warpio-docs/warpio-sdk/`
- **Development Guide**: `CLAUDE.md`
- **Reference Examples**: `/warpio-docs/ai-docs/_reference/`

## Session Goals

1. ✅ Complete upstream sync successfully
2. ✅ Implement OpenAICompatibleProvider base class
3. ✅ Add LMStudioProvider with full functionality
4. ✅ Test with actual LM Studio instance
5. ✅ Ensure all existing tests still pass
6. ✅ Document any deviations from plan

## Notes for Opus

- Use the **upstream-sync** agent first - it's specialized for this task
- After sync, use **file-searcher** agent to understand current code structure
- Follow the implementation plan exactly - it's been carefully designed
- Test frequently with the actual LM Studio endpoint
- Maintain clean git history with meaningful commits
- If you encounter issues, document them clearly for resolution

## Quick Command Reference

```bash
# Upstream sync
git remote add upstream https://github.com/google-gemini/gemini-cli.git
git fetch upstream
git merge upstream/main

# Build and test
npm run build
npm run test
npm run typecheck
npm run lint

# Run with provider
WARPIO_PROVIDER=lmstudio npx warpio "Hello"
```

---

**Start with the upstream-sync agent, then proceed with implementation. Good luck!**