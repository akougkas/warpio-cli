#!/bin/bash

# Warpio CLI Comprehensive Test Suite
# Tests core functionality, personas, MCP integration, and model management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result storage
declare -a FAILED_TEST_NAMES=()

# Helper function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_keywords="$3"
    local timeout_seconds="${4:-15}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    echo "  Command: $command"
    
    # Run command with timeout
    if timeout "$timeout_seconds" bash -c "$command" > test_output.txt 2>&1; then
        # Check for expected keywords
        local all_found=true
        IFS='|' read -ra KEYWORDS <<< "$expected_keywords"
        for keyword in "${KEYWORDS[@]}"; do
            if ! grep -qi "$keyword" test_output.txt; then
                all_found=false
                echo -e "  ${RED}✗ Missing expected keyword: '$keyword'${NC}"
            fi
        done
        
        if [ "$all_found" = true ]; then
            echo -e "  ${GREEN}✓ PASSED${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "  ${RED}✗ FAILED - Missing expected output${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            FAILED_TEST_NAMES+=("$test_name")
            echo "  Output preview:"
            head -n 5 test_output.txt | sed 's/^/    /'
        fi
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo -e "  ${RED}✗ FAILED - Timeout after ${timeout_seconds}s${NC}"
        else
            echo -e "  ${RED}✗ FAILED - Exit code: $exit_code${NC}"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name")
        echo "  Error output:"
        tail -n 5 test_output.txt 2>/dev/null | sed 's/^/    /'
    fi
    
    echo ""
}

# Helper function for interactive tests
run_interactive_test() {
    local test_name="$1"
    local prompt="$2"
    local expected_keywords="$3"
    local model="${4:-flash}"
    local timeout_seconds="${5:-20}"
    
    local command="echo '$prompt' | npx warpio --model $model --no-interactive"
    run_test "$test_name" "$command" "$expected_keywords" "$timeout_seconds"
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}   Warpio CLI Comprehensive Test Suite${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# ===================
# 1. BASIC FUNCTIONALITY TESTS
# ===================
echo -e "${BLUE}=== BASIC FUNCTIONALITY ===${NC}\n"

run_test "Help command" \
    "npx warpio --help" \
    "warpio|Usage|Options|Commands" \
    5

run_test "Version display" \
    "npx warpio --version" \
    "version|[0-9]" \
    5

run_test "List models" \
    "npx warpio --model list" \
    "Available models|gemini|flash|pro" \
    10

run_test "List personas" \
    "npx warpio --list-personas" \
    "personas|warpio|data-expert|analysis-expert|hpc-expert|research-expert|workflow-expert" \
    5

# ===================
# 2. MODEL SWITCHING TESTS
# ===================
echo -e "${BLUE}=== MODEL SWITCHING ===${NC}\n"

run_interactive_test "Flash model response" \
    "What is Warpio CLI? Answer in one sentence." \
    "Warpio|CLI|command|assistant|software|scientific" \
    "flash" \
    20

run_interactive_test "Pro model response" \
    "What is 2+2?" \
    "4|four" \
    "pro" \
    20

# Check if Ollama is available for local model testing
if command -v ollama &> /dev/null && curl -s http://localhost:11434/api/tags &> /dev/null; then
    run_interactive_test "Local model response" \
        "What is 2+2?" \
        "4|four" \
        "small" \
        25
else
    echo -e "${YELLOW}Skipping local model test - Ollama not available${NC}\n"
fi

# ===================
# 3. PERSONA TESTS
# ===================
echo -e "${BLUE}=== PERSONA FUNCTIONALITY ===${NC}\n"

run_interactive_test "Data expert persona" \
    "What file formats do you specialize in?" \
    "HDF5|NetCDF|data|format|scientific" \
    "flash" \
    20

run_test "Persona with model override" \
    "echo 'Hello' | npx warpio --persona data-expert --model pro --no-interactive" \
    "hello|hi|greeting|assist|help" \
    20

# ===================
# 4. ERROR HANDLING TESTS
# ===================
echo -e "${BLUE}=== ERROR HANDLING ===${NC}\n"

run_test "Invalid model handling" \
    "npx warpio --model nonexistent 2>&1" \
    "error|invalid|not found|available" \
    5

run_test "Invalid persona handling" \
    "npx warpio --persona nonexistent 2>&1" \
    "error|invalid|not found|available" \
    5

# ===================
# 5. STREAMING & RESPONSE TESTS
# ===================
echo -e "${BLUE}=== STREAMING & RESPONSE ===${NC}\n"

run_interactive_test "Short response streaming" \
    "Say hello" \
    "hello|hi|greetings" \
    "flash" \
    15

run_interactive_test "Medium response streaming" \
    "List 3 benefits of Warpio CLI" \
    "1|2|3|benefit|feature|warpio" \
    "flash" \
    25

# ===================
# 6. MCP INTEGRATION TESTS
# ===================
echo -e "${BLUE}=== MCP INTEGRATION ===${NC}\n"

run_test "Check MCP availability" \
    "npx warpio mcp list 2>/dev/null || echo 'MCP not configured'" \
    "mcp|server|tool|configured" \
    10

# ===================
# 7. HISTORY MANAGEMENT TESTS
# ===================
echo -e "${BLUE}=== HISTORY MANAGEMENT ===${NC}\n"

run_test "History command" \
    "npx warpio history list 2>/dev/null || echo 'No history available'" \
    "history|session|no history" \
    5

# ===================
# 8. EDGE CASES & STRESS TESTS
# ===================
echo -e "${BLUE}=== EDGE CASES & STRESS ===${NC}\n"

run_interactive_test "Empty input handling" \
    "" \
    "help|assist|ready|available" \
    "flash" \
    15

run_interactive_test "Unicode handling" \
    "What is π (pi)?" \
    "pi|3.14|mathematical|constant" \
    "flash" \
    20

# Test timeout mechanism (should timeout gracefully)
run_test "Response timeout handling" \
    "echo 'Generate an extremely long story with 10000 words' | timeout 5 npx warpio --model flash --no-interactive" \
    "" \
    6

# ===================
# 9. CONFIGURATION TESTS
# ===================
echo -e "${BLUE}=== CONFIGURATION ===${NC}\n"

run_test "Check API key configuration" \
    "[ -n \"\$GEMINI_API_KEY\" ] && echo 'API key configured' || echo 'API key not set'" \
    "configured|not set" \
    2

# ===================
# 10. BUILD & TYPE CHECKING
# ===================
echo -e "${BLUE}=== BUILD VALIDATION ===${NC}\n"

run_test "TypeScript compilation" \
    "npm run build 2>&1 | tail -n 1" \
    "successfully|built|completed|Done" \
    60

run_test "Type checking" \
    "npm run typecheck 2>&1 | tail -n 1" \
    "success|no errors|Found 0 errors" \
    30

# ===================
# TEST SUMMARY
# ===================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}           TEST SUMMARY${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ ${#FAILED_TEST_NAMES[@]} -gt 0 ]; then
    echo -e "${RED}Failed Tests:${NC}"
    for test_name in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "  - $test_name"
    done
    echo ""
fi

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo -e "${YELLOW}Note: Some failures may be due to API quotas or network issues${NC}"
    exit 1
fi