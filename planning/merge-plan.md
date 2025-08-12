# Warpio CLI Strategic Branch Integration Plan

## ⚠️ CRITICAL SAFETY WARNINGS

**NEVER PUSH TO ORIGIN WITHOUT EXPLICIT CONFIRMATION**

```bash
# FORBIDDEN COMMANDS (DO NOT RUN):
git push origin main              # ❌ NEVER without confirmation
git push origin --force          # ❌ ABSOLUTELY NEVER
git push --all                    # ❌ DANGEROUS
```

**ALWAYS USE LOCAL BRANCHES FOR INTEGRATION**

- Work in local integration branches only
- Test thoroughly before any remote operations
- Maintain rollback points at every step

## Mission Overview

Integrate three parallel development branches while preserving upstream compatibility:

- `warpio/thinking-core` - Reasoning architecture + GPT-OSS hanging fix
- `warpio/model-health` - Provider health monitoring + fallback systems
- `warpio/model-ui` - Model selection UI enhancements + status display

## Setup & Context

### FIRST ACTION: Read Project Context

```bash
Read("/mnt/nfs/develop/warpio-cli/CLAUDE.md")
```

### Verify Current State

```bash
# Check all branches exist and are clean
git branch -a | grep -E "(thinking-core|model-health|model-ui)"
git status                        # Should be clean working tree

# Ensure we're starting from latest main
git checkout main
git fetch origin                  # Get latest (DO NOT PULL automatically)
git status                        # Check if behind/ahead of origin/main
```

## Integration Strategy: Risk-Based Sequential Merging

### Phase 1: Individual Branch Validation (REQUIRED)

**Test Each Branch Before Integration**:

```bash
# Test warpio/thinking-core
git checkout warpio/thinking-core
npm run preflight                 # Must pass
npm run test:warpio              # Must pass
npx warpio --help                # Basic functionality
npx warpio -m flash -p "test"    # Gemini preserved
npx warpio -m ollama:gpt-oss:20b -p "Complex reasoning task" # No hanging

# Test warpio/model-health
git checkout warpio/model-health
npm run preflight                 # Must pass
npm run test:warpio              # Must pass
npx warpio --model list          # Enhanced model discovery
npx warpio -m invalid-model -p "test" # Should fallback gracefully

# Test warpio/model-ui
git checkout warpio/model-ui
npm run preflight                 # Must pass
npm run test:warpio              # Must pass
npx warpio --model status        # UI enhancements work
```

**❌ STOP INTEGRATION if any branch fails validation**

### Phase 2: Create Safe Integration Environment

```bash
# Return to main and create integration workspace
git checkout main

# Create rollback tag (CRITICAL SAFETY MEASURE)
git tag warpio-pre-integration-$(date +%Y%m%d-%H%M%S)

# Create local integration branch (NEVER push this)
git checkout -b warpio/local-integration
```

### Phase 3: Sequential Integration (Backend → Infrastructure → Frontend)

#### Step 1: Integrate Thinking Core (Lowest Risk)

```bash
# Merge first feature
git merge warpio/thinking-core --no-ff -m "feat: integrate thinking/reasoning architecture

- Add WarpioReasoningRegistry for model capability detection
- Implement WarpioThinkingProcessor for token separation
- Add native Ollama thinking support with think parameter
- Fix GPT-OSS:20b hanging issue with timeout handling
- Preserve all upstream Gemini CLI functionality"

# CRITICAL: Test integration immediately
npm run preflight                 # Must pass
npm run test:full                 # Must pass

# Test new functionality
npx warpio -m ollama:gpt-oss:20b -p "Test reasoning without hanging"

# Test upstream preservation
npx warpio -m flash -p "Upstream compatibility test"

# Create checkpoint
git tag integration-step1-thinking-$(date +%Y%m%d-%H%M%S)
```

#### Step 2: Integrate Model Health (Medium Risk)

```bash
# Merge second feature
git merge warpio/model-health --no-ff -m "feat: integrate model health monitoring and fallback

- Add ProviderHealthMonitor for real-time provider status
- Implement ModelFallbackService with smart provider chains
- Add ModelManager for centralized model state tracking
- Enhance model discovery with health status integration
- Maintain upstream compatibility for all core functions"

# CRITICAL: Test integration
npm run preflight                 # Must pass
npm run test:full                 # Must pass

# Test health functionality
npx warpio --model list          # Should show health indicators
npx warpio -m nonexistent-provider:model -p "test" # Should fallback

# Test that previous features still work
npx warpio -m ollama:gpt-oss:20b -p "Both thinking and health work"

# Create checkpoint
git tag integration-step2-health-$(date +%Y%m%d-%H%M%S)
```

#### Step 3: Integrate Model UI (Highest Risk - UI Changes)

```bash
# Merge third feature
git merge warpio/model-ui --no-ff -m "feat: integrate model selection UI enhancements

- Update Footer to show actual active model (not hardcoded)
- Add provider status indicators in UI components
- Implement ModelStatus and ProviderStatus display components
- Add model management CLI commands (status, switch)
- Enhance error messages with actionable recovery suggestions
- Preserve upstream UI compatibility and behavior"

# CRITICAL: Test full integration
npm run preflight                 # Must pass
npm run test:full                 # Must pass

# Test UI enhancements
npx warpio --model status        # Enhanced status display
npx warpio --model list          # Improved model listing

# Test complete integration
npx warpio --persona data-expert -m small -p "Full integration test"

# Create final checkpoint
git tag integration-step3-ui-$(date +%Y%m%d-%H%M%S)
```

### Phase 4: Upstream Compatibility Validation (CRITICAL)

#### Create Compatibility Test Script

```bash
cat > scripts/upstream-compatibility-check.sh << 'EOF'
#!/bin/bash
set -e

echo "🔍 CRITICAL: Upstream Compatibility Validation"
echo "============================================="

# Test 1: Core Package Integrity (MUST PRESERVE)
echo "1. Checking package integrity..."
grep -q "@google/gemini-cli-core" packages/core/package.json || {
    echo "❌ CRITICAL: Core package name changed"; exit 1;
}
grep -q "@google/gemini-cli" packages/cli/package.json || {
    echo "❌ CRITICAL: CLI package name changed"; exit 1;
}

# Test 2: Environment Variables (MUST PRESERVE)
echo "2. Checking environment variable handling..."
grep -r "GEMINI_API_KEY" packages/core/src/ >/dev/null || {
    echo "❌ CRITICAL: GEMINI_API_KEY handling broken"; exit 1;
}

# Test 3: Core API Compatibility (MUST PRESERVE)
echo "3. Checking core API exports..."
node -e "
const core = require('./packages/core/dist/index.js');
if (!core.GeminiClient) throw new Error('GeminiClient export missing');
console.log('✓ Core APIs preserved');
" || { echo "❌ CRITICAL: Core API broken"; exit 1; }

# Test 4: Gemini Functionality (MUST WORK)
echo "4. Testing Gemini functionality..."
npx warpio -m flash -p "Upstream compatibility test" --dry-run || {
    echo "❌ CRITICAL: Gemini CLI functionality broken"; exit 1;
}

# Test 5: Build System (MUST WORK)
echo "5. Validating build system..."
npm run build >/dev/null 2>&1 || {
    echo "❌ CRITICAL: Build system broken"; exit 1;
}

# Test 6: TypeScript Compatibility (MUST PASS)
echo "6. Checking TypeScript compilation..."
npm run typecheck >/dev/null 2>&1 || {
    echo "❌ CRITICAL: TypeScript errors introduced"; exit 1;
}

echo ""
echo "✅ SUCCESS: All upstream compatibility checks passed"
echo "Safe to proceed with integration"
EOF

chmod +x scripts/upstream-compatibility-check.sh

# Run compatibility validation
./scripts/upstream-compatibility-check.sh
```

### Phase 5: Final Integration Testing

```bash
# Run comprehensive test suite
echo "Running final validation suite..."

# Core functionality tests
npm run preflight                 # All checks must pass
npm run test:warpio              # Warpio tests must pass
npm test                         # Upstream tests must pass

# Battle testing (if available)
if [ -f "./battle-test-warpio.sh" ]; then
    ./battle-test-warpio.sh      # Integration tests must pass
fi

# End-to-end functionality test
npx warpio --persona data-expert -m small -p "Complete integration test"
npx warpio -m ollama:gpt-oss:20b -p "Reasoning test - should not hang"
npx warpio --model list | head -10   # Performance check
```

## Finalization Process (ONLY if all tests pass)

### Option 1: Merge to Local Main (RECOMMENDED)

```bash
# Merge integration branch to local main
git checkout main
git merge warpio/local-integration --no-ff -m "Integrate parallel features: thinking, health, UI

Complete integration of three parallel development branches:
- Thinking/reasoning architecture with GPT-OSS hanging fix
- Model health monitoring with intelligent fallback systems
- Enhanced model selection UI with real-time status display

All features maintain full upstream compatibility with Google Gemini CLI.
Tested with comprehensive validation suite."

# Create final integration tag
git tag warpio-integrated-$(date +%Y%m%d-%H%M%S)

echo "✅ Integration complete in local main branch"
echo "⚠️  Ready for push to origin (MANUAL CONFIRMATION REQUIRED)"
```

### Option 2: Prepare for Remote Push (REQUIRES MANUAL APPROVAL)

```bash
echo "🚨 INTEGRATION READY FOR REMOTE PUSH"
echo "=================================="
echo ""
echo "Integration completed successfully in local main branch."
echo "All tests pass, upstream compatibility verified."
echo ""
echo "To push to origin:"
echo "  git push origin main"
echo ""
echo "⚠️  CONFIRM with user before executing push command"
echo "⚠️  Review all changes one final time"
```

## Emergency Rollback Procedures

### Immediate Rollback (If Any Step Fails)

```bash
# Find rollback point
git tag | grep -E "(pre-integration|integration-step)"

# Choose appropriate rollback point
git reset --hard warpio-pre-integration-YYYYMMDD-HHMM    # Complete rollback
git reset --hard integration-step1-thinking-YYYYMMDD-HHMM  # Partial rollback
git reset --hard integration-step2-health-YYYYMMDD-HHMM    # Partial rollback

# Clean workspace
git clean -fd
npm install                       # Restore dependencies
```

### Conflict Resolution Guidelines

**High-Risk Files for Conflicts**:

- `packages/core/src/core/localClient.ts` (thinking + health)
- `packages/cli/src/ui/components/Footer.tsx` (UI changes)
- `packages/core/src/config/models.ts` (health + UI)
- `packages/core/src/adapters/ollama.ts` (thinking + health)

**Conflict Resolution Strategy**:

1. **Preserve upstream compatibility** - Never break Gemini CLI functions
2. **Merge both changes** when possible - Don't lose functionality
3. **Test after each resolution** - Validate immediately
4. **Prioritize stability** - If unsure, choose safer option

## Success Criteria Checklist

**Integration is complete when ALL criteria are met**:

- [ ] All three branches successfully merged
- [ ] `npm run preflight` passes without errors
- [ ] `npm run test:warpio` passes all Warpio-specific tests
- [ ] `npm test` passes all upstream tests
- [ ] `./scripts/upstream-compatibility-check.sh` passes
- [ ] GPT-OSS:20b works without hanging
- [ ] Model health monitoring and fallback functional
- [ ] UI shows real model status (not hardcoded values)
- [ ] Original Gemini CLI functionality completely preserved
- [ ] Battle test suite passes (if available)
- [ ] No TypeScript compilation errors
- [ ] All new features work as designed

## Key Principles for Future Upstream Syncs

**This integration maintains upstream compatibility by**:

1. **Additive Changes Only** - No removal of upstream functionality
2. **Preserved Package Structure** - All core Gemini CLI files unchanged
3. **Isolated Extensions** - Warpio features in separate directories/files
4. **API Compatibility** - All upstream APIs and exports preserved
5. **Environment Compatibility** - All Gemini environment variables preserved
6. **Clean Git History** - Merge commits clearly document integration points

**Future upstream merges will be easier because**:

- Changes are clearly documented in merge commit messages
- Warpio-specific code is isolated in identifiable locations
- No upstream files have breaking changes
- All integration points are well-documented
- Rollback tags provide clear restoration points

---

**Remember: This integration plan prioritizes safety and upstream compatibility above all else. Take time at each step, validate thoroughly, and use rollback procedures if any issues arise. Never push to origin without explicit confirmation.**
