#!/bin/bash

# Warpio Test Results Analysis Script
# Analyzes comprehensive test results and suggests system prompt improvements

set -euo pipefail

RESULTS_FILE="${1:-warpio-test-results.json}"
ANALYSIS_FILE="warpio-analysis-$(date +%Y%m%d-%H%M%S).md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

if [ ! -f "$RESULTS_FILE" ]; then
    error "Results file not found: $RESULTS_FILE"
    error "Run ./test-warpio-comprehensive.sh first"
    exit 1
fi

log "📊 Analyzing Warpio test results from: $RESULTS_FILE"

# Extract key metrics
TOTAL_TESTS=$(jq -r '.test_run.total_tests' "$RESULTS_FILE")
PASSED_TESTS=$(jq -r '.test_run.passed' "$RESULTS_FILE")
FAILED_TESTS=$(jq -r '.test_run.failed' "$RESULTS_FILE")
SUCCESS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)

# Generate analysis report
cat > "$ANALYSIS_FILE" << EOF
# Warpio CLI Comprehensive Test Analysis

**Test Run:** $(jq -r '.test_run.start_time' "$RESULTS_FILE") - $(jq -r '.test_run.end_time' "$RESULTS_FILE")
**Warpio Version:** $(jq -r '.test_run.warpio_version' "$RESULTS_FILE")
**Environment:** $(jq -r '.test_run.test_environment' "$RESULTS_FILE")

## 📈 Overall Results

- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED_TESTS ✅
- **Failed:** $FAILED_TESTS ❌
- **Success Rate:** $SUCCESS_RATE%

## 📊 Category Breakdown

EOF

# Analyze each category
jq -r '.categories | keys[]' "$RESULTS_FILE" | while read -r category; do
    category_total=$(jq -r ".categories[\"$category\"] | length" "$RESULTS_FILE")
    category_passed=$(jq -r ".categories[\"$category\"] | map(select(.passed == true)) | length" "$RESULTS_FILE")
    category_failed=$(jq -r ".categories[\"$category\"] | map(select(.passed == false)) | length" "$RESULTS_FILE")
    category_avg_time=$(jq -r ".categories[\"$category\"] | map(.duration_seconds) | add / length" "$RESULTS_FILE")
    
    cat >> "$ANALYSIS_FILE" << EOF
### $category
- **Tests:** $category_total
- **Passed:** $category_passed ✅
- **Failed:** $category_failed ❌  
- **Average Duration:** ${category_avg_time}s

EOF

    # List failed tests in this category
    failed_tests=$(jq -r ".categories[\"$category\"] | map(select(.passed == false)) | .[].name" "$RESULTS_FILE")
    if [ -n "$failed_tests" ]; then
        echo "**Failed Tests:**" >> "$ANALYSIS_FILE"
        echo "$failed_tests" | while read -r test_name; do
            echo "- $test_name" >> "$ANALYSIS_FILE"
        done
        echo "" >> "$ANALYSIS_FILE"
    fi
done

# Performance analysis
cat >> "$ANALYSIS_FILE" << EOF
## ⚡ Performance Analysis

### Slowest Tests
EOF

jq -r '
.categories | 
to_entries[] | 
.value[] | 
select(.duration_seconds > 5) | 
"\(.duration_seconds)s - \(.name) (\(.key))"
' "$RESULTS_FILE" | sort -nr | head -5 >> "$ANALYSIS_FILE"

# Error pattern analysis
cat >> "$ANALYSIS_FILE" << EOF

## 🔍 Error Pattern Analysis

### Common Error Patterns
EOF

jq -r '
.categories | 
to_entries[] | 
.value[] | 
select(.passed == false) | 
.stderr
' "$RESULTS_FILE" | grep -o '[A-Za-z]*Error\|[A-Za-z]*Exception\|[A-Za-z]*Warning' | sort | uniq -c | sort -nr >> "$ANALYSIS_FILE" 2>/dev/null || echo "No common error patterns found" >> "$ANALYSIS_FILE"

# System prompt improvement suggestions
cat >> "$ANALYSIS_FILE" << EOF

## 🎯 System Prompt Improvement Suggestions

Based on the test results, here are recommendations to enhance Warpio's system prompt:

### Successful Capabilities to Emphasize
EOF

# Find successful test patterns
jq -r '
.categories | 
to_entries[] | 
.value[] | 
select(.passed == true and .duration_seconds < 10) | 
"\(.name): \(.prompt)"
' "$RESULTS_FILE" | head -10 | while read -r line; do
    echo "- $line" >> "$ANALYSIS_FILE"
done

cat >> "$ANALYSIS_FILE" << EOF

### Areas Needing Improvement
EOF

# Find failed test patterns for improvement
jq -r '
.categories | 
to_entries[] | 
.value[] | 
select(.passed == false) | 
"\(.name): \(.prompt)"
' "$RESULTS_FILE" | while read -r line; do
    echo "- $line" >> "$ANALYSIS_FILE"
done

# Capability matrix
cat >> "$ANALYSIS_FILE" << EOF

## 🔧 Capability Matrix

| Category | Success Rate | Avg Duration | Key Strengths | Areas for Improvement |
|----------|-------------|--------------|---------------|----------------------|
EOF

jq -r '.categories | keys[]' "$RESULTS_FILE" | while read -r category; do
    category_total=$(jq -r ".categories[\"$category\"] | length" "$RESULTS_FILE")
    category_passed=$(jq -r ".categories[\"$category\"] | map(select(.passed == true)) | length" "$RESULTS_FILE")
    category_rate=$(echo "scale=1; $category_passed * 100 / $category_total" | bc)
    category_avg_time=$(jq -r ".categories[\"$category\"] | map(.duration_seconds) | add / length" "$RESULTS_FILE")
    
    # Get strongest capability
    strongest=$(jq -r ".categories[\"$category\"] | map(select(.passed == true)) | sort_by(.duration_seconds) | .[0].name // \"None\"" "$RESULTS_FILE")
    
    # Get weakest capability  
    weakest=$(jq -r ".categories[\"$category\"] | map(select(.passed == false)) | .[0].name // \"None\"" "$RESULTS_FILE")
    
    printf "| %s | %.1f%% | %.1fs | %s | %s |\n" "$category" "$category_rate" "$category_avg_time" "$strongest" "$weakest" >> "$ANALYSIS_FILE"
done

cat >> "$ANALYSIS_FILE" << EOF

## 📝 Recommended System Prompt Enhancements

### 1. Identity Reinforcement
Based on successful identity tests, emphasize:
- Warpio as a scientific computing assistant
- IOWarp ecosystem integration
- Specialized expertise in HDF5, NetCDF, SLURM

### 2. Capability Clarification
Highlight strong performance in:
$(jq -r '.categories | to_entries[] | .value[] | select(.passed == true and .duration_seconds < 5) | "- \(.name)"' "$RESULTS_FILE" | head -5)

### 3. Error Handling Improvements
Address common failure patterns:
$(jq -r '.categories | to_entries[] | .value[] | select(.passed == false) | "- \(.name): \(.stderr | split("\n")[0])"' "$RESULTS_FILE" | head -3)

### 4. Performance Optimization
Focus on improving response times for:
$(jq -r '.categories | to_entries[] | .value[] | select(.duration_seconds > 15) | "- \(.name) (currently \(.duration_seconds)s)"' "$RESULTS_FILE" | head -3)

## 🚀 Next Steps

1. **Update System Prompt** with successful capability patterns
2. **Address Failed Tests** by improving relevant documentation
3. **Optimize Slow Operations** identified in performance analysis
4. **Re-run Tests** after improvements to measure progress

---

*Analysis generated on $(date) from $RESULTS_FILE*
EOF

# Display summary
log "📋 Analysis Summary:"
success "Total Tests: $TOTAL_TESTS"
success "Success Rate: $SUCCESS_RATE%"

if [ "$FAILED_TESTS" -gt 0 ]; then
    warning "$FAILED_TESTS tests failed - check analysis for details"
else
    success "All tests passed! 🎉"
fi

log "📄 Detailed analysis saved to: $ANALYSIS_FILE"

# Interactive mode
read -p "View analysis file now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v less &> /dev/null; then
        less "$ANALYSIS_FILE"
    else
        cat "$ANALYSIS_FILE"
    fi
fi