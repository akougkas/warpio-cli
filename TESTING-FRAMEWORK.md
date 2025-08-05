# Warpio CLI Comprehensive Testing Framework

This framework provides exhaustive testing of all Warpio capabilities to inform system prompt improvements and ensure quality.

## 🚀 Quick Start

```bash
# Run comprehensive tests
./run-comprehensive-tests.sh

# Analyze results
./analyze-test-results.sh warpio-comprehensive-results.json

# Run with custom config
./run-comprehensive-tests.sh my-custom-config.json
```

## 📋 Testing Categories

### 1. 🔧 Core CLI Functionality
- Basic commands and help system
- File operations and shell integration
- Configuration management
- **Tests:** 5 | **Timeout:** 15s

### 2. 🎯 Identity & Capabilities
- Warpio identity and differentiation
- Scientific computing expertise
- IOWarp ecosystem integration
- Persona system explanation
- **Tests:** 4 | **Timeout:** 20s

### 3. 🔬 Scientific Computing
- HDF5 and NetCDF knowledge
- SLURM and HPC optimization
- Scientific workflow design
- **Tests:** 5 | **Timeout:** 30s

### 4. 🌐 MCP Integration
- MCP server connectivity
- arXiv and research database access
- Scientific data retrieval
- **Tests:** 4 | **Timeout:** 45s

### 5. 👥 Personas & Handover
- Persona listing and help
- Context handover functionality
- Multi-agent workflows
- **Tests:** 4 | **Timeout:** 25s

### 6. 💻 Code Generation
- Scientific computing code
- HDF5/NetCDF processing scripts
- SLURM job scripts
- Data visualization code
- **Tests:** 4 | **Timeout:** 40s

### 7. 🧠 Memory & History
- Memory save/load operations
- Chat history management
- Session persistence
- **Tests:** 4 | **Timeout:** 20s

### 8. ⚠️ Error Handling
- Syntax error detection
- File handling errors
- Invalid command responses
- Edge case management
- **Tests:** 4 | **Timeout:** 25s

### 9. ⚡ Performance Stress
- Large code generation
- Complex analysis tasks
- Multi-step workflows
- **Tests:** 3 | **Timeout:** 60s

## 📊 Output Format

### Results JSON Structure
```json
{
  "test_run": {
    "start_time": "2025-08-05T16:30:00Z",
    "warpio_version": "0.1.17",
    "total_tests": 37,
    "passed": 35,
    "failed": 2,
    "success_rate": 94.6
  },
  "test_suites": {
    "core_cli": {
      "tests": [
        {
          "name": "help_system",
          "prompt": "--help",
          "duration_seconds": 1.23,
          "passed": true,
          "validation_results": [...]
        }
      ]
    }
  }
}
```

### Analysis Report
- **Overall Results:** Success rates and performance metrics
- **Category Breakdown:** Detailed per-category analysis
- **Performance Analysis:** Slowest tests and optimization opportunities
- **Error Patterns:** Common failure modes
- **System Prompt Suggestions:** Evidence-based improvements

## 🔧 Configuration

### Custom Test Configuration
Create a JSON file with test suites:

```json
{
  "test_suites": {
    "my_custom_suite": {
      "description": "Custom test suite",
      "timeout": 30,
      "tests": [
        {
          "name": "test_name",
          "prompt": "Your test prompt here",
          "expected_patterns": ["pattern1", "pattern2"]
        }
      ]
    }
  }
}
```

### Test Parameters
- **name:** Unique test identifier
- **prompt:** Command/question to send to Warpio
- **expected_patterns:** Array of strings/patterns to validate in output
- **timeout:** Optional test-specific timeout (inherits suite default)

## 📈 Using Results for System Prompt Improvement

### 1. Identify Strong Capabilities
- Look for tests with high success rates and fast response times
- Extract successful response patterns
- Emphasize these capabilities in system prompt

### 2. Address Weak Areas  
- Focus on failed tests and slow responses
- Analyze error patterns and missing knowledge
- Add specific guidance to system prompt

### 3. Performance Optimization
- Identify consistently slow operations
- Optimize prompts for better response times
- Balance comprehensiveness with speed

### 4. Scientific Knowledge Gaps
- Review scientific computing test failures
- Update knowledge base with missing information
- Strengthen domain expertise claims

## 🛠️ Framework Components

### Scripts
- **`run-comprehensive-tests.sh`:** Main test runner with JSON config support
- **`test-warpio-comprehensive.sh`:** Simpler hardcoded test runner
- **`analyze-test-results.sh`:** Results analysis and reporting

### Configuration
- **`test-config-extended.json`:** Comprehensive test suite configuration
- **`TESTING-FRAMEWORK.md`:** Documentation (this file)

### Dependencies
- **`jq`:** JSON processing
- **`bc`:** Mathematical calculations  
- **`timeout`:** Test timeout handling
- **Warpio CLI:** Must be built and accessible

## 🎯 Best Practices

### Running Tests
1. **Clean Environment:** Run tests in a clean repository state
2. **Sufficient API Credits:** Some tests query external services
3. **Stable Connection:** Network-dependent tests may fail with poor connectivity
4. **Regular Execution:** Run after significant changes

### Interpreting Results
1. **Context Matters:** Consider test complexity when evaluating failures
2. **Pattern Analysis:** Look for systematic issues vs isolated failures
3. **Performance Trends:** Track response times over multiple runs
4. **Scientific Accuracy:** Verify technical content in scientific computing tests

### System Prompt Updates
1. **Evidence-Based:** Use test results to guide improvements
2. **Incremental Changes:** Make small, measurable improvements
3. **Re-test After Changes:** Validate improvements with follow-up testing
4. **Balance Breadth vs Depth:** Maintain general capability while strengthening specializations

---

*Framework created to ensure Warpio CLI excellence and continuous improvement.*