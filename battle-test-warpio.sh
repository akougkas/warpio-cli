#!/bin/bash

# Warpio CLI Automated Battle Testing Script
# Fully non-interactive - runs npx warpio -p commands and evaluates results
# No user interaction required
#
# ENHANCED FOR v0.1.18+ FEATURES:
# - Model selector functionality (--model small/medium/large/flash/pro)
# - Local model integration (Ollama, LM Studio)
# - Provider routing and health checking
# - Multi-provider model discovery
# - Enhanced persona + model combinations

set -e

echo "🚀 WARPIO CLI AUTOMATED BATTLE TESTING"
echo "====================================="
echo "Started: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

run_test() {
    local test_name="$1"
    local persona="$2"
    local prompt="$3"
    local expected_keywords="$4"
    local timeout="${5:-60}"
    local model="${6:-}"
    
    test_count=$((test_count + 1))
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Test ${test_count}: ${test_name}${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -n "$persona" ]; then
        echo "Persona: $persona"
    fi
    if [ -n "$model" ]; then
        echo "Model: $model"
    fi
    echo "Prompt: $prompt"
    echo "Expected: $expected_keywords"
    echo ""
    
    # Build command
    local cmd="npx warpio"
    if [ -n "$persona" ]; then
        cmd="$cmd --persona $persona"
    fi
    if [ -n "$model" ]; then
        cmd="$cmd --model $model"
    fi
    cmd="$cmd -p \"$prompt\""
    
    echo "Executing: $cmd"
    echo ""
    
    # Run test with timeout
    local start_time=$(date +%s)
    local result
    local exit_code
    
    if result=$(timeout ${timeout}s bash -c "$cmd" 2>&1); then
        exit_code=0
    else
        exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "📊 RESULT (${duration}s):"
    echo "────────────────────────"
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ EXECUTION: SUCCESS${NC}"
        
        # Check for expected keywords
        local keywords_found=0
        local total_keywords=0
        
        if [ -n "$expected_keywords" ]; then
            IFS=',' read -ra KEYWORDS <<< "$expected_keywords"
            total_keywords=${#KEYWORDS[@]}
            
            for keyword in "${KEYWORDS[@]}"; do
                keyword=$(echo "$keyword" | xargs) # trim whitespace
                if echo "$result" | grep -qi "$keyword"; then
                    echo -e "${GREEN}✅ Found: $keyword${NC}"
                    keywords_found=$((keywords_found + 1))
                else
                    echo -e "${RED}❌ Missing: $keyword${NC}"
                fi
            done
        fi
        
        if [ $total_keywords -eq 0 ] || [ $keywords_found -eq $total_keywords ]; then
            echo -e "${GREEN}✅ OVERALL: PASS${NC}"
            pass_count=$((pass_count + 1))
        else
            echo -e "${YELLOW}⚠️  OVERALL: PARTIAL (${keywords_found}/${total_keywords} keywords)${NC}"
            fail_count=$((fail_count + 1))
        fi
        
    elif [ $exit_code -eq 124 ]; then
        echo -e "${RED}❌ EXECUTION: TIMEOUT (${timeout}s)${NC}"
        fail_count=$((fail_count + 1))
    else
        echo -e "${RED}❌ EXECUTION: FAILED (exit code: $exit_code)${NC}"
        fail_count=$((fail_count + 1))
    fi
    
    # Show first 10 lines of output for debugging
    echo ""
    echo "📝 OUTPUT PREVIEW:"
    echo "$result" | head -10 | sed 's/^/   /'
    if [ $(echo "$result" | wc -l) -gt 10 ]; then
        echo "   ... (truncated, $(echo "$result" | wc -l) total lines)"
    fi
    
    echo ""
    echo "Waiting 3 seconds before next test..."
    sleep 3
}

# Test Category 1: Core CLI Functionality
echo "📋 CATEGORY 1: Core CLI Functionality"
echo "====================================="

run_test "Post-Merge Functionality Check" "" \
    "Quick test to verify CLI works after upstream merge." \
    "test,merge,functionality,works" 15

run_test "Basic Identity Check" "" \
    "What is Warpio and what can you help me with?" \
    "Warpio,IOWarp,scientific computing,persona" 30

run_test "Persona Awareness" "" \
    "What personas are available and what do they specialize in?" \
    "data-expert,analysis-expert,hpc-expert,research-expert,workflow-expert" 30

# Test Category 2: Scientific Computing Personas
echo ""
echo "🔬 CATEGORY 2: Scientific Computing Personas"
echo "==========================================="

run_test "Data Expert - NetCDF Analysis" "data-expert" \
    "I have a NetCDF climate dataset with temperature data. How would you help me extract monthly averages?" \
    "NetCDF,HDF5,climate,temperature,monthly,scientific" 45

run_test "Analysis Expert - Data Visualization" "analysis-expert" \
    "Create a Python script to analyze sales data and generate interactive plots." \
    "pandas,matplotlib,python,plot,visualization,analysis" 45

run_test "HPC Expert - SLURM Job" "hpc-expert" \
    "Help me create a SLURM job script for a molecular dynamics simulation on 100 nodes." \
    "SLURM,MPI,molecular dynamics,nodes,job script,HPC" 45

run_test "Research Expert - Literature Search" "research-expert" \
    "Find recent papers about transformer attention mechanisms from 2024." \
    "papers,research,transformer,attention,literature,arxiv" 45

run_test "Workflow Expert - Pipeline Design" "workflow-expert" \
    "Design a Snakemake workflow for genomic data processing." \
    "Snakemake,workflow,genomic,pipeline,computational" 45

# Test Category 3: Context Handover
echo ""
echo "👥 CATEGORY 3: Context Handover System"
echo "===================================="

run_test "Handover Planning" "data-expert" \
    "I've processed climate data and need statistical analysis. Plan handover to analysis expert." \
    "handover,analysis-expert,context,statistical,climate" 45

run_test "Multi-Expert Workflow" "research-expert" \
    "I found relevant papers and need to process datasets then run HPC simulations. Plan multi-expert workflow." \
    "multi-expert,workflow,data-expert,hpc-expert,handover" 45

# Test Category 4: Advanced MCP Features
echo ""
echo "🌐 CATEGORY 4: Advanced MCP Integration"
echo "====================================="

run_test "ArXiv Integration" "research-expert" \
    "Search for papers about quantum error correction from the last 6 months." \
    "arxiv,quantum,error correction,search,papers" 60

run_test "Scientific Data Formats" "data-expert" \
    "Explain how to diagnose and repair a corrupted HDF5 file from particle physics." \
    "HDF5,corrupted,repair,particle physics,diagnose" 45

# Test Category 5: Complex Scenarios
echo ""
echo "🎯 CATEGORY 5: Complex Real-World Scenarios"
echo "=========================================="

run_test "Full Scientific Pipeline" "workflow-expert" \
    "Design a workflow: download NOAA climate data, convert to HDF5, run parallel analysis, create visualizations." \
    "NOAA,climate,HDF5,parallel,workflow,visualization" 60

run_test "Emergency Data Recovery" "data-expert" \
    "Help recover partial NetCDF oceanographic files after storage failure using interpolation." \
    "NetCDF,recovery,oceanographic,interpolation,storage" 45

# Test Category 6: Model Selector and Local Models
echo ""
echo "🤖 CATEGORY 6: Model Selector and Local Models"
echo "=============================================="

run_test "Local Model - Small Alias" "" \
    "Hello, how are you today? Tell me about yourself briefly." \
    "hello,language model,assistant" 30 "small"

run_test "Local Model - Medium Alias" "" \
    "Explain quantum computing in one paragraph." \
    "quantum,computing,qubits,superposition" 30 "medium"

run_test "Gemini Model - Flash Alias" "" \
    "What is machine learning? Be concise." \
    "machine learning,data,algorithms" 30 "flash"

run_test "Model Discovery Command" "" \
    "list" \
    "Available AI Models,GEMINI,OLLAMA,models" 45 "list"

run_test "Local Model with Persona" "data-expert" \
    "What file formats do you work with?" \
    "HDF5,NetCDF,scientific,data" 30 "small"

# Test Category 7: Provider Integration
echo ""
echo "🔧 CATEGORY 7: Provider Integration"
echo "=================================="

run_test "Provider Health Check" "" \
    "Test local provider connection." \
    "connection,provider,models,available" 30 "small"

run_test "Model Switching Performance" "" \
    "Quick response test." \
    "quick,response,test" 15 "flash"

# Test Category 8: Error Handling
echo ""
echo "⚠️  CATEGORY 8: Error Handling"
echo "============================"

run_test "Complex Large Query" "data-expert" \
    "I have 50TB satellite imagery, need conversion to HDF5, ML classification, GPU optimization, PostgreSQL integration, web dashboard, FAIR data principles." \
    "satellite,HDF5,machine learning,GPU,PostgreSQL,dashboard" 60

# Final Summary
echo ""
echo "🎉 BATTLE TESTING SUMMARY"
echo "========================"
echo "Completed: $(date)"
echo ""
echo "📊 Results:"
echo "  Total Tests: $test_count"
echo "  Passed: $pass_count"
echo "  Failed: $fail_count"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Warpio is ready for GitHub push! 🚀${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Review results before GitHub push.${NC}"
    exit 1
fi