# Warpio Demo Queries - Testing Local Models & Personas

## Setup Commands
```bash
# Ensure LM Studio is running at 192.168.86.20:1234
# Current models: gemini-2.5-flash, qwen3-4b-instruct-2507

# Set LM Studio environment
export WARPIO_PROVIDER=lmstudio
export LMSTUDIO_HOST=http://192.168.86.20:1234/v1
export LMSTUDIO_MODEL=qwen3-4b-instruct-2507
```

## 1. Identity & Expertise Testing

### Query 1: Warpio Identity (Gemini)
```bash
npx warpio -m gemini::gemini-2.5-flash -p "What are you and what can you do? Be specific about your identity and capabilities."
```

### Query 2: Warpio Identity (LM Studio)
```bash
npx warpio -m lmstudio::qwen3-4b-instruct-2507 -p "What are you and what can you do? Be specific about your identity and capabilities."
```

## 2. System Prompt Adherence & Scientific Focus

### Query 3: Scientific Computing Expertise (Gemini)
```bash
npx warpio -m gemini::gemini-2.5-flash -p "I have a 50GB NetCDF file with climate data. How would you approach converting it to HDF5 while preserving metadata and optimizing for parallel I/O?"
```

### Query 4: Scientific Computing Expertise (LM Studio)
```bash
npx warpio -m lmstudio::qwen3-4b-instruct-2507 -p "I have a 50GB NetCDF file with climate data. How would you approach converting it to HDF5 while preserving metadata and optimizing for parallel I/O?"
```

## 3. Persona System Testing

### Query 5: Data Expert Persona (Gemini)
```bash
npx warpio --persona data-expert -m gemini::gemini-2.5-flash -p "Analyze the performance characteristics of ADIOS2 vs traditional HDF5 for writing 10TB simulation outputs on a parallel filesystem."
```

### Query 6: Data Expert Persona (LM Studio)
```bash
npx warpio --persona data-expert -m lmstudio::qwen3-4b-instruct-2507 -p "Analyze the performance characteristics of ADIOS2 vs traditional HDF5 for writing 10TB simulation outputs on a parallel filesystem."
```

### Query 7: HPC Expert Persona (Gemini)
```bash
npx warpio --persona hpc-expert -m gemini::gemini-2.5-flash -p "My MPI application scales well to 1000 cores but hits a wall at 2000 cores. What are the most likely bottlenecks and debugging strategies?"
```

### Query 8: HPC Expert Persona (LM Studio)
```bash
npx warpio --persona hpc-expert -m lmstudio::qwen3-4b-instruct-2507 -p "My MPI application scales well to 1000 cores but hits a wall at 2000 cores. What are the most likely bottlenecks and debugging strategies?"
```

## 4. Conversational Intelligence & Engagement

### Query 9: Complex Research Question (Gemini)
```bash
npx warpio -m gemini::gemini-2.5-flash -p "I'm studying turbulence in fusion plasmas. Can you explain the relationship between magnetic reconnection events and energy cascade mechanisms, and suggest computational approaches for modeling this?"
```

### Query 10: Complex Research Question (LM Studio)
```bash
npx warpio -m lmstudio::qwen3-4b-instruct-2507 -p "I'm studying turbulence in fusion plasmas. Can you explain the relationship between magnetic reconnection events and energy cascade mechanisms, and suggest computational approaches for modeling this?"
```

## 5. Multi-Provider Testing (Bonus)

### Query 11: Analysis Expert with Ollama (if available)
```bash
# First set Ollama provider
export WARPIO_PROVIDER=ollama
npx warpio --persona analysis-expert -p "Create a Python workflow to analyze time-series data from 100 climate stations, including anomaly detection and trend visualization."
```

### Query 12: Cross-Provider Comparison Test
```bash
# Quick provider switching test
npx warpio -m gemini::gemini-2.5-flash -p "What's 2+2?" && echo "---SWITCHING---" && npx warpio -m lmstudio::qwen3-4b-instruct-2507 -p "What's 2+2?"
```

## Expected Differences to Observe

1. **Identity**: Warpio should identify as "Warpio CLI" not "Gemini" regardless of backend
2. **Scientific Focus**: Both should prioritize scientific computing solutions
3. **Persona Behavior**: data-expert should focus on I/O, hpc-expert on performance
4. **Model Differences**: 
   - Gemini: More structured, detailed responses
   - Qwen: More direct, code-focused responses
5. **Response Speed**: LM Studio (local) should be faster for simple queries

## Demo Flow Recommendation

1. Run queries 1-2 back-to-back to show identity consistency
2. Run queries 3-4 to demonstrate scientific expertise
3. Run queries 5-8 to show persona differentiation
4. Run queries 9-10 to test conversational intelligence
5. Use query 12 for quick provider switching demo

## Debugging Notes

- Watch for thinking tags `<think>` appearing in LM Studio output
- Check footer for correct provider::model display
- Verify persona-specific behavior differences
- Note response quality and speed differences between providers