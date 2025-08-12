# Warpio Testing Suite

## Test 1: Basic Identity

### Gemini Flash

```bash
npx warpio --model flash -p "What is Warpio and what are your core capabilities? List 3 main features."
```

### Ollama Small

```bash
npx warpio --model small -p "What is Warpio and what are your core capabilities? List 3 main features."
```

## Test 2: Single Tool Usage

### Gemini Flash

```bash
npx warpio --model flash -p "Read the README.md file and tell me the main purpose of this project."
```

### Ollama Small

```bash
npx warpio --model small -p "Read the README.md file and tell me the main purpose of this project."
```

## Test 3: Multi-Tool Coordination

### Gemini Flash

```bash
npx warpio --model flash -p "Search for all TypeScript files related to 'model' in the packages/core/src directory, then read the main models.ts file and explain the model selection system."
```

### Ollama Small

```bash
npx warpio --model small -p "Search for all TypeScript files related to 'model' in the packages/core/src directory, then read the main models.ts file and explain the model selection system."
```

## Test 4: Complex Analysis

### Gemini Flash

```bash
npx warpio --model flash -p "Analyze the model selection architecture: 1) Find all files related to local model support, 2) Identify the provider routing logic, 3) Explain how Ollama integration works, and 4) Suggest one improvement to the current system."
```

### Ollama Small

```bash
npx warpio --model small -p "Analyze the model selection architecture: 1) Find all files related to local model support, 2) Identify the provider routing logic, 3) Explain how Ollama integration works, and 4) Suggest one improvement to the current system."
```

## Test 5: Full Reasoning Chain

### Gemini Flash

```bash
npx warpio --model flash -p "I want to understand the complete data flow when a user runs 'warpio -m small -p hello'. Trace the execution: 1) Find where CLI arguments are parsed, 2) Locate model resolution logic, 3) Find provider routing code, 4) Identify the Ollama client integration, 5) Show how the response flows back to the user, and 6) Create a simple sequence diagram in text format showing this flow."
```

### Ollama Small

```bash
npx warpio --model small -p "I want to understand the complete data flow when a user runs 'warpio -m small -p hello'. Trace the execution: 1) Find where CLI arguments are parsed, 2) Locate model resolution logic, 3) Find provider routing code, 4) Identify the Ollama client integration, 5) Show how the response flows back to the user, and 6) Create a simple sequence diagram in text format showing this flow."
```

## Logging Template

```
Test X - [flash/small] - [SUCCESS/FAIL] - [time] - [tools used] - [notes]
```
