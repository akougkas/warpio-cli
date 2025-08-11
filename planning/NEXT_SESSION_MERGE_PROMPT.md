# 🔄 Upstream Merge Session Prompt for Claude Code

## Mission: Safe Integration of Upstream Changes

You are tasked with safely merging the latest upstream changes from Google's Gemini CLI into Warpio CLI while preserving all local model functionality and maintaining production stability.

## Current Status Summary

**Branch**: `warpio/local-models-support` (READY FOR MERGE)
**Last Commit**: `d1cb2108` - Added minimal Warpio testing infrastructure
**Upstream**: Google Gemini CLI (needs sync)

### 🎯 What Was Accomplished in Previous Session

- ✅ **Complete Local Models Implementation**: Ollama native SDK integration with intelligent routing
- ✅ **Production Code Cleanup**: Removed debug artifacts, optimized TypeScript types
- ✅ **Architecture Optimization**: Enhanced error handling, improved type safety
- ✅ **License Management**: Proper IOWarp Team copyright with ESLint exclusions
- ✅ **Testing Infrastructure**: Minimal Warpio testing suite with 19 passing tests
- ✅ **Quality Assurance**: All tests passing, 0 ESLint errors, 100% functionality verified
- ✅ **Upstream Compatibility**: Changes designed for minimal merge conflicts

### 🔍 Key Files to Monitor During Merge

**HIGH ATTENTION (Modified Core Files)**:

- `packages/core/src/config/config.ts` - Only `refreshAuth()` method modified (lines ~360-430)
- `packages/core/src/config/models.ts` - Mostly formatting changes, very low risk

**NO CONFLICT RISK (New Warpio Files)**:

- `packages/core/src/adapters/` - All files are new (ollama.ts, lmstudio.ts, openai-base.ts)
- `packages/core/src/core/localClient.ts` - New file
- `packages/core/src/core/clientFactory.ts` - New file
- `packages/core/src/services/providerHealth.ts` - New file
- `packages/cli/src/utils/modelFallback.ts` - New file
- `test/` - Warpio testing infrastructure (3 test files, 19 tests)

**WARPIO-SPECIFIC (Safe)**:

- `README.md` - Only Warpio sections modified
- `CLAUDE.md` - Our documentation
- `docs/warpio/` - Our documentation folder
- `eslint.config.js` - Added exclusions for Warpio files
- All test files in `test/e2e/`

## 📋 Step-by-Step Merge Protocol

### Phase 1: Pre-Merge Preparation

1. **Read this file first**: `CLAUDE.md` to understand the full context
2. **Verify current status**: Check that we're on `warpio/local-models-support` branch
3. **Test current functionality**: Run `npx warpio --model list` and `npx warpio --model small -p "test"` to ensure everything works
4. **Review recent commits**: `git log --oneline -10` to understand our local changes

### Phase 2: Upstream Integration

1. **Fetch upstream**: `git fetch upstream`
2. **Check upstream changes**: `git log --oneline upstream/main --not HEAD` to see what's new
3. **Identify potential conflicts**: Focus on files we modified (config.ts, models.ts)
4. **Create merge branch**: `git checkout -b warpio/upstream-merge-$(date +%Y%m%d)`

### Phase 3: Safe Merge Execution

1. **Attempt merge**: `git merge upstream/main`
2. **If conflicts occur**:
   - **PRIORITY**: Preserve our local model routing logic in `refreshAuth()` method
   - **STRATEGY**: Accept upstream changes for new features, keep our additions
   - **VERIFICATION**: Ensure `isLocalProvider()` and provider detection logic remains intact

### Phase 4: Post-Merge Validation

1. **Build test**: `npm run build && npm run typecheck`
2. **Functionality test**:
   ```bash
   npx warpio --model list
   npx warpio --model small -p "Hello"
   npx warpio --model flash -p "Hello"
   npx warpio -m ollama:qwen3:8b -p "test"
   ```
3. **Integration test**: Run battle-test script if available
4. **Lint check**: `npm run lint:ci` (should pass with 0 errors)

### Phase 5: Finalization

1. **Update documentation**: Merge any upstream doc changes with our Warpio additions
2. **Clean commit**: Create merge commit with proper attribution
3. **Branch cleanup**: Merge back to `warpio/local-models-support` if needed
4. **Final verification**: Complete functionality test across all model types

## 🛡️ Critical Preservation Requirements

### MUST PRESERVE (Non-negotiable):

- Local model routing logic in `config.ts:refreshAuth()`
- All files in `packages/core/src/adapters/`
- IOWarp Team copyright on Warpio-specific files
- `LocalModelClient` and `ClientFactory` implementations
- Model discovery and provider detection logic
- ESLint exclusions for Warpio files

### CAN ACCEPT UPSTREAM CHANGES:

- New Gemini features and improvements
- Documentation updates (merge with ours)
- Dependency updates
- Build system enhancements
- Bug fixes in core Gemini functionality

## 🚨 Conflict Resolution Strategy

**If conflicts in `config.ts:refreshAuth()`**:

1. Keep the entire local model routing section (our addition)
2. Accept upstream changes for Gemini-specific logic
3. Ensure both paths coexist without interference

**If conflicts in `models.ts`**:

1. Preserve our provider detection functions
2. Accept upstream model constant updates
3. Keep our alias resolution logic

**If conflicts in build/config files**:

1. Merge configurations intelligently
2. Preserve Warpio-specific exclusions
3. Accept upstream tooling improvements

## 🧪 Validation Commands

After merge completion, run these to ensure everything works:

```bash
# Model discovery
npx warpio --model list

# Local model aliases
npx warpio --model small -p "Quick test"
npx warpio --model medium -p "Quick test"
npx warpio --model large -p "Quick test"

# Explicit provider syntax
npx warpio -m ollama:qwen3:8b -p "Explicit provider test"
npx warpio -m gemini:flash -p "Gemini provider test"

# Build validation
npm run preflight

# Test validation (new in this session)
npm run test:warpio
```

All commands should work without errors.

## 📞 Emergency Fallback

If merge becomes too complex:

1. **Abort merge**: `git merge --abort`
2. **Create issue branch**: `git checkout -b warpio/merge-conflicts-$(date +%Y%m%d)`
3. **Document conflicts**: List specific files and conflict areas
4. **Plan resolution**: Break down conflicts into smaller, manageable chunks

## 🎯 Success Criteria

- ✅ All upstream changes integrated
- ✅ Local models functionality 100% preserved
- ✅ No ESLint errors or build failures
- ✅ All test commands passing
- ✅ Clean git history with proper merge commit
- ✅ Documentation updated with any new upstream features
- ✅ IOWarp Team copyright preserved on our files

## 💡 Additional Notes

- **Architecture Advantage**: Our local models implementation is cleanly isolated, making conflicts unlikely
- **Fallback Safety**: All changes gracefully fall back to Gemini behavior if local providers fail
- **Upstream Compatibility**: Previous session's cleanup specifically optimized for merge safety
- **Testing Coverage**: Comprehensive validation commands ensure nothing breaks

Remember: The local models implementation was designed from the beginning for minimal upstream conflict. The changes are additive and non-intrusive, so the merge should be straightforward.

Good luck! The implementation is solid and ready for safe upstream integration.
