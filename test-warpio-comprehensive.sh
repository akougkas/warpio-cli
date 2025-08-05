#!/bin/bash

# Comprehensive Warpio CLI Testing Framework
# Tests all capabilities and stores results in JSON format

set -euo pipefail

# Configuration
WARPIO_CMD="./node_modules/.bin/warpio"
RESULTS_FILE="warpio-test-results.json"
TEST_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TEMP_DIR=$(mktemp -d)
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Initialize results JSON
echo '{
  "test_run": {
    "start_time": "'$TEST_START_TIME'",
    "warpio_version": "",
    "test_environment": "'$(uname -a)'",
    "total_tests": 0,
    "passed": 0,
    "failed": 0
  },
  "categories": {}
}' > "$RESULTS_FILE"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test execution function
run_test() {
    local category="$1"
    local test_name="$2"
    local prompt="$3"
    local expected_patterns="$4"  # JSON array of expected patterns
    local timeout="${5:-30}"      # Default 30 second timeout
    
    ((TOTAL_TESTS++))
    log "Running: $category/$test_name"
    
    local start_time=$(date +%s.%N)
    local output_file="$TEMP_DIR/test_$TOTAL_TESTS.out"
    local error_file="$TEMP_DIR/test_$TOTAL_TESTS.err"
    
    # Run warpio command with timeout
    local exit_code=0
    timeout "$timeout" $WARPIO_CMD --non-interactive "$prompt" > "$output_file" 2> "$error_file" || exit_code=$?
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    local stdout=$(cat "$output_file" 2>/dev/null || echo "")
    local stderr=$(cat "$error_file" 2>/dev/null || echo "")
    
    # Determine test result
    local test_passed=true
    local validation_results=[]
    
    # Check for expected patterns
    if [ "$expected_patterns" != "[]" ]; then
        local patterns=$(echo "$expected_patterns" | jq -r '.[]')
        while IFS= read -r pattern; do
            if echo "$stdout" | grep -q "$pattern"; then
                validation_results=$(echo "$validation_results" | jq '. + [{"pattern": "'$pattern'", "found": true}]')
            else
                validation_results=$(echo "$validation_results" | jq '. + [{"pattern": "'$pattern'", "found": false}]')
                test_passed=false
            fi
        done <<< "$patterns"
    fi
    
    # Check exit code (0 = success, 124 = timeout)
    if [ $exit_code -ne 0 ] && [ $exit_code -ne 124 ]; then
        test_passed=false
    fi
    
    # Update counters
    if [ "$test_passed" = true ]; then
        ((PASSED_TESTS++))
        success "$test_name"
    else
        ((FAILED_TESTS++))
        error "$test_name (exit: $exit_code)"
    fi
    
    # Store result in JSON
    local test_result=$(cat <<EOF
{
    "name": "$test_name",
    "prompt": "$prompt",
    "duration_seconds": $duration,
    "exit_code": $exit_code,
    "passed": $test_passed,
    "stdout": $(echo "$stdout" | jq -Rs .),
    "stderr": $(echo "$stderr" | jq -Rs .),
    "expected_patterns": $expected_patterns,
    "validation_results": $validation_results,
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    )
    
    # Add to results file
    jq --argjson test "$test_result" \
       --arg category "$category" \
       '.categories[$category] = (.categories[$category] // []) + [$test]' \
       "$RESULTS_FILE" > "$TEMP_DIR/results_tmp.json" && mv "$TEMP_DIR/results_tmp.json" "$RESULTS_FILE"
}

# Get Warpio version
get_warpio_version() {
    local version=$($WARPIO_CMD --version 2>/dev/null | head -1 || echo "unknown")
    jq --arg version "$version" '.test_run.warpio_version = $version' "$RESULTS_FILE" > "$TEMP_DIR/results_tmp.json" && mv "$TEMP_DIR/results_tmp.json" "$RESULTS_FILE"
}

# Category 1: Core CLI Functionality
test_core_cli() {
    log "🔧 Testing Core CLI Functionality"
    
    run_test "core_cli" "help_command" "--help" '["Usage:", "Commands:", "Options:"]'
    run_test "core_cli" "version_command" "--version" '["warpio", "version"]'
    run_test "core_cli" "tools_list" "/tools" '["Available tools:", "Description:"]'
    run_test "core_cli" "stats_display" "/stats" '["Session Statistics:", "Total"]'
    run_test "core_cli" "basic_math" "What is 15 * 23?" '["345"]'
    run_test "core_cli" "simple_code" "Write a hello world function in Python" '["def", "hello", "print"]'
}

# Category 2: Original Gemini Features  
test_gemini_features() {
    log "🧠 Testing Original Gemini Features"
    
    run_test "gemini_features" "memory_save" "/memory save test-key This is a test memory" '["Memory saved", "test-key"]'
    run_test "gemini_features" "memory_load" "/memory load test-key" '["test memory", "This is a test"]'
    run_test "gemini_features" "code_generation" "Create a Python function to calculate fibonacci numbers" '["def", "fibonacci", "return"]'
    run_test "gemini_features" "code_analysis" "Analyze this code: def broken_func(): return x + y" '["undefined", "variable", "error"]'
    run_test "gemini_features" "file_operations" "List the files in the current directory" '["packages", "README", "CLAUDE"]'
}

# Category 3: MCP Integration
test_mcp_integration() {
    log "🔬 Testing MCP Integration"
    
    run_test "mcp_integration" "mcp_list" "/mcp list" '["MCP servers", "Available"]'
    run_test "mcp_integration" "mcp_status" "/mcp status" '["MCP", "server", "status"]'
    run_test "mcp_integration" "arxiv_search" "Search arXiv for recent papers on machine learning" '["arxiv", "machine learning", "paper"]' 45
    run_test "mcp_integration" "research_tools" "Find research papers about neural networks" '["research", "neural", "network"]' 45
}

# Category 4: Warpio-Specific Features
test_warpio_features() {
    log "🎯 Testing Warpio-Specific Features"
    
    run_test "warpio_features" "persona_list" "--list-personas" '["data-expert", "analysis-expert", "hpc-expert"]'
    run_test "warpio_features" "persona_help" "--persona-help data-expert" '["data-expert", "scientific", "formats"]'
    run_test "warpio_features" "scientific_identity" "Who are you and what are your capabilities?" '["Warpio", "IOWarp", "scientific"]'
    run_test "warpio_features" "hdf5_knowledge" "Explain HDF5 file format" '["HDF5", "hierarchical", "scientific"]'
    run_test "warpio_features" "netcdf_knowledge" "What is NetCDF used for?" '["NetCDF", "climate", "atmospheric"]'
}

# Category 5: Advanced Capabilities
test_advanced_capabilities() {
    log "⚡ Testing Advanced Capabilities"
    
    run_test "advanced" "multi_step_task" "Create a Python script that reads a CSV file, processes the data, and saves results to JSON" '["csv", "json", "pandas", "import"]' 60
    run_test "advanced" "error_handling" "Fix this broken code: def func(: return None" '["syntax", "error", "def func()"]'
    run_test "advanced" "complex_analysis" "Analyze the architecture of this codebase and suggest improvements" '["architecture", "improvement", "structure"]' 60
    run_test "advanced" "scientific_workflow" "Design a workflow for processing climate data from NetCDF files" '["workflow", "climate", "NetCDF", "processing"]' 45
}

# Main execution
main() {
    log "🚀 Starting Comprehensive Warpio Testing"
    log "Results will be saved to: $RESULTS_FILE"
    
    # Check if warpio is available
    if ! command -v "$WARPIO_CMD" &> /dev/null; then
        error "Warpio command not found at: $WARPIO_CMD"
        error "Please ensure Warpio is built and available"
        exit 1
    fi
    
    get_warpio_version
    
    # Run all test categories
    test_core_cli
    test_gemini_features  
    test_mcp_integration
    test_warpio_features
    test_advanced_capabilities
    
    # Update final statistics
    local end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq --arg end_time "$end_time" \
       --arg total "$TOTAL_TESTS" \
       --arg passed "$PASSED_TESTS" \
       --arg failed "$FAILED_TESTS" \
       '.test_run.end_time = $end_time |
        .test_run.total_tests = ($total | tonumber) |
        .test_run.passed = ($passed | tonumber) |
        .test_run.failed = ($failed | tonumber)' \
       "$RESULTS_FILE" > "$TEMP_DIR/results_tmp.json" && mv "$TEMP_DIR/results_tmp.json" "$RESULTS_FILE"
    
    # Summary
    log "📊 Test Summary:"
    success "Passed: $PASSED_TESTS"
    error "Failed: $FAILED_TESTS"
    log "Total: $TOTAL_TESTS"
    log "Results saved to: $RESULTS_FILE"
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "🎉 All tests passed!"
        exit 0
    else
        log "⚠️  Some tests failed. Check $RESULTS_FILE for details."
        exit 1
    fi
}

# Handle interruption
trap 'error "Testing interrupted"; rm -rf "$TEMP_DIR"; exit 1' INT TERM

# Run main function
main "$@"