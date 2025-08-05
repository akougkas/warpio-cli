#!/bin/bash

# Enhanced Warpio CLI Testing Framework
# Uses JSON configuration for comprehensive capability testing

set -euo pipefail

# Configuration
WARPIO_CMD="npx warpio"
RESULTS_FILE="warpio-comprehensive-results.json"
CONFIG_FILE="${1:-test-config-extended.json}"
TEST_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TEMP_DIR=$(mktemp -d)
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Logging functions
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
debug() { echo -e "${MAGENTA}🔍 $1${NC}"; }

# Check dependencies
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        error "jq is required for JSON processing"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        error "bc is required for calculations"
        exit 1
    fi
    
    if [ ! -f "$CONFIG_FILE" ]; then
        error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Test warpio command
    if ! $WARPIO_CMD --version &> /dev/null; then
        error "Warpio CLI not accessible: $WARPIO_CMD"
        error "Please ensure Warpio is built and in PATH"
        exit 1
    fi
}

# Initialize results structure
init_results() {
    cat > "$RESULTS_FILE" << EOF
{
    "test_run": {
        "start_time": "$TEST_START_TIME",
        "config_file": "$CONFIG_FILE",
        "warpio_version": "",
        "test_environment": "$(uname -a)",
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "success_rate": 0.0,
        "total_duration": 0.0
    },
    "test_suites": {}
}
EOF
}

# Get Warpio version
get_warpio_version() {
    local version=$($WARPIO_CMD --version 2>/dev/null | head -1 || echo "unknown")
    jq --arg version "$version" '.test_run.warpio_version = $version' "$RESULTS_FILE" > "$TEMP_DIR/results_tmp.json" && mv "$TEMP_DIR/results_tmp.json" "$RESULTS_FILE"
}

# Execute a single test
run_single_test() {
    local suite_name="$1"
    local test_config="$2"
    
    local test_name=$(echo "$test_config" | jq -r '.name')
    local prompt=$(echo "$test_config" | jq -r '.prompt')
    local expected_patterns=$(echo "$test_config" | jq -r '.expected_patterns // []')
    local timeout=$(echo "$test_config" | jq -r '.timeout // 30')
    
    ((TOTAL_TESTS++))
    local test_id="${suite_name}_${test_name}_$$_${TOTAL_TESTS}"
    
    info "Running: $suite_name/$test_name"
    debug "Prompt: $prompt"
    
    local start_time=$(date +%s.%N)
    local output_file="$TEMP_DIR/${test_id}.out"
    local error_file="$TEMP_DIR/${test_id}.err"
    
    # Run warpio command with timeout
    local exit_code=0
    local timed_out=false
    
    if timeout "$timeout" $WARPIO_CMD --non-interactive "$prompt" > "$output_file" 2> "$error_file"; then
        exit_code=0
    else
        exit_code=$?
        if [ $exit_code -eq 124 ]; then
            timed_out=true
            warning "Test timed out after ${timeout}s: $test_name"
        fi
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    local stdout=$(cat "$output_file" 2>/dev/null || echo "")
    local stderr=$(cat "$error_file" 2>/dev/null || echo "")
    
    # Validate test results
    local test_passed=true
    local validation_results="[]"
    local missing_patterns=0
    
    if [ "$expected_patterns" != "[]" ] && [ "$expected_patterns" != "null" ]; then
        local patterns=$(echo "$expected_patterns" | jq -r '.[]')
        while IFS= read -r pattern; do
            if [ -n "$pattern" ]; then
                if echo "$stdout" | grep -iq "$pattern"; then
                    validation_results=$(echo "$validation_results" | jq --arg pattern "$pattern" '. + [{"pattern": $pattern, "found": true}]')
                    debug "✓ Found pattern: $pattern"
                else
                    validation_results=$(echo "$validation_results" | jq --arg pattern "$pattern" '. + [{"pattern": $pattern, "found": false}]')
                    debug "✗ Missing pattern: $pattern"
                    ((missing_patterns++))
                    test_passed=false
                fi
            fi
        done <<< "$patterns"
    fi
    
    # Check for critical errors
    if [ $exit_code -ne 0 ] && [ $exit_code -ne 124 ]; then
        test_passed=false
    fi
    
    if $timed_out; then
        test_passed=false
    fi
    
    # Update counters
    if [ "$test_passed" = true ]; then
        ((PASSED_TESTS++))
        success "$suite_name/$test_name (${duration}s)"
    else
        ((FAILED_TESTS++))
        error "$suite_name/$test_name (exit: $exit_code, missing: $missing_patterns patterns)"
    fi
    
    # Store detailed test result
    local test_result=$(cat <<EOF
{
    "name": "$test_name",
    "prompt": $(echo "$prompt" | jq -Rs .),
    "expected_patterns": $expected_patterns,
    "duration_seconds": $duration,
    "exit_code": $exit_code,
    "timed_out": $timed_out,
    "timeout_seconds": $timeout,
    "passed": $test_passed,
    "missing_patterns": $missing_patterns,
    "stdout": $(echo "$stdout" | jq -Rs .),
    "stderr": $(echo "$stderr" | jq -Rs .),
    "validation_results": $validation_results,
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    )
    
    # Add test result to the appropriate suite
    jq --argjson test "$test_result" \
       --arg suite "$suite_name" \
       '.test_suites[$suite].tests = (.test_suites[$suite].tests // []) + [$test]' \
       "$RESULTS_FILE" > "$TEMP_DIR/results_tmp.json" && mv "$TEMP_DIR/results_tmp.json" "$RESULTS_FILE"
}

# Run a complete test suite
run_test_suite() {
    local suite_name="$1"
    local suite_config="$2"
    
    local description=$(echo "$suite_config" | jq -r '.description')
    local default_timeout=$(echo "$suite_config" | jq -r '.timeout // 30')
    
    log "🧪 Starting test suite: $suite_name"
    info "Description: $description"
    
    # Initialize suite in results
    local suite_info=$(cat <<EOF
{
    "name": "$suite_name",
    "description": "$description", 
    "default_timeout": $default_timeout,
    "start_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "tests": []
}
EOF
    )
    
    jq --argjson suite "$suite_info" \
       --arg suite_name "$suite_name" \
       '.test_suites[$suite_name] = $suite' \
       "$RESULTS_FILE" > "$TEMP_DIR/results_tmp.json" && mv "$TEMP_DIR/results_tmp.json" "$RESULTS_FILE"
    
    # Run each test in the suite
    local test_count=0
    echo "$suite_config" | jq -c '.tests[]' | while read -r test_config; do
        ((test_count++))
        
        # Merge suite timeout with test-specific timeout
        local test_timeout=$(echo "$test_config" | jq -r --arg default "$default_timeout" '.timeout // ($default | tonumber)')
        test_config=$(echo "$test_config" | jq --arg timeout "$test_timeout" '.timeout = ($timeout | tonumber)')
        
        run_single_test "$suite_name" "$test_config"
        
        # Brief pause between tests
        sleep 1
    done
    
    # Update suite completion time
    jq --arg suite "$suite_name" \
       '.test_suites[$suite].end_time = "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"' \
       "$RESULTS_FILE" > "$TEMP_DIR/results_tmp.json" && mv "$TEMP_DIR/results_tmp.json" "$RESULTS_FILE"
    
    success "Completed test suite: $suite_name"
}

# Generate final statistics
finalize_results() {
    local end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local success_rate=0
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    fi
    
    jq --arg end_time "$end_time" \
       --arg total "$TOTAL_TESTS" \
       --arg passed "$PASSED_TESTS" \
       --arg failed "$FAILED_TESTS" \
       --arg skipped "$SKIPPED_TESTS" \
       --arg rate "$success_rate" \
       '.test_run.end_time = $end_time |
        .test_run.total_tests = ($total | tonumber) |
        .test_run.passed = ($passed | tonumber) |
        .test_run.failed = ($failed | tonumber) |
        .test_run.skipped = ($skipped | tonumber) |
        .test_run.success_rate = ($rate | tonumber)' \
       "$RESULTS_FILE" > "$TEMP_DIR/results_tmp.json" && mv "$TEMP_DIR/results_tmp.json" "$RESULTS_FILE"
}

# Display progress statistics
show_progress() {
    local current_suite="$1"
    local progress=$(echo "scale=1; $TOTAL_TESTS * 100 / 50" | bc) # Assuming ~50 total tests
    
    echo
    info "Progress: Test #$TOTAL_TESTS (~${progress}%)"
    info "Current Suite: $current_suite"
    success "Passed: $PASSED_TESTS"
    error "Failed: $FAILED_TESTS"
    echo
}

# Main execution function
main() {
    log "🚀 Starting Enhanced Warpio Comprehensive Testing"
    log "Configuration: $CONFIG_FILE"
    log "Results file: $RESULTS_FILE"
    
    check_dependencies
    init_results
    get_warpio_version
    
    # Get list of test suites from config
    local suites=$(jq -r '.test_suites | keys[]' "$CONFIG_FILE")
    local suite_count=$(echo "$suites" | wc -l)
    
    log "📋 Found $suite_count test suites to execute"
    
    # Run each test suite
    local current_suite_num=0
    while IFS= read -r suite_name; do
        ((current_suite_num++))
        
        show_progress "$suite_name ($current_suite_num/$suite_count)"
        
        local suite_config=$(jq -c ".test_suites[\"$suite_name\"]" "$CONFIG_FILE")
        run_test_suite "$suite_name" "$suite_config"
        
        # Progress checkpoint
        log "Checkpoint: $current_suite_num/$suite_count suites completed"
    done <<< "$suites"
    
    finalize_results
    
    # Final summary
    echo
    log "🏁 Testing Complete!"
    log "════════════════════"
    success "Total Tests: $TOTAL_TESTS"
    success "Passed: $PASSED_TESTS ✅"
    error "Failed: $FAILED_TESTS ❌"
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        local success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
        log "Success Rate: ${success_rate}%"
    fi
    
    log "Results saved to: $RESULTS_FILE"
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    # Suggest next steps
    echo
    info "Next steps:"
    info "1. Analyze results: ./analyze-test-results.sh $RESULTS_FILE"
    info "2. Review failed tests for system prompt improvements"
    info "3. Update documentation based on successful patterns"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "🎉 All tests passed! Warpio is performing excellently."
        exit 0
    else
        warning "Some tests failed. Use analysis script for detailed insights."
        exit 1
    fi
}

# Handle interruption gracefully
trap 'error "Testing interrupted by user"; finalize_results; rm-rf "$TEMP_DIR"; exit 130' INT TERM

# Execute main function
main "$@"