# API Reference

> **🚧 Development Status**: This API specification is based on design documents. Implementation details may vary as development progresses.

## Overview

FactGate provides fact-checking capabilities through the Model Context Protocol (MCP). This document describes the complete API surface for interacting with FactGate.

## Table of Contents

- [MCP Server API](#mcp-server-api)
- [JavaScript/Node.js API](#javascriptnodejs-api)
- [Adapter Interface](#adapter-interface)
- [Data Structures](#data-structures)
- [Error Handling](#error-handling)

## MCP Server API

### verify

Verify a claim against configured fact sources.

**Method**: `verify`

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `claim` | string | Yes | The claim to verify |
| `adapters` | string[] | No | Specific adapters to use (default: all) |
| `strategy` | string | No | Chaining strategy: `all`, `any`, `majority` (default: `all`) |
| `context` | object | No | Additional context for verification |

**Returns**: `AggregatedResult`

**Example Request**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "verify",
  "params": {
    "claim": "Python was created by Guido van Rossum in 1991.",
    "adapters": ["contradiction-detector", "pattern-validator"],
    "strategy": "all"
  }
}
```

**Example Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "claim": "Python was created by Guido van Rossum in 1991.",
    "overall": "verified",
    "confidence": 0.92,
    "sources": [
      {
        "sourceId": "contradiction-detector",
        "verdict": "verified",
        "confidence": 0.95,
        "reasoning": "No contradictions detected",
        "timestamp": "2025-10-25T10:30:00.000Z"
      },
      {
        "sourceId": "pattern-validator",
        "verdict": "verified",
        "confidence": 0.89,
        "reasoning": "Claim structure is logical and verifiable",
        "timestamp": "2025-10-25T10:30:00.100Z"
      }
    ],
    "combinedReasoning": "All validators agree. Claim is specific, verifiable, and contains no contradictions.",
    "processingTime": 150
  }
}
```

### getAdapters

List all available adapters.

**Method**: `getAdapters`

**Parameters**: None

**Returns**: Array of adapter information

**Example Request**:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "getAdapters"
}
```

**Example Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": [
    {
      "name": "contradiction-detector",
      "type": "built-in",
      "description": "Detects logical contradictions in claims",
      "available": true
    },
    {
      "name": "pattern-validator",
      "type": "built-in",
      "description": "Validates claims against logical patterns",
      "available": true
    },
    {
      "name": "confidence-scorer",
      "type": "built-in",
      "description": "Scores claim confidence based on specificity",
      "available": true
    }
  ]
}
```

### getAdapterStatus

Check health status of all adapters.

**Method**: `getAdapterStatus`

**Parameters**: None

**Returns**: Object mapping adapter names to status

**Example Request**:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "getAdapterStatus"
}
```

**Example Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "contradiction-detector": {
      "available": true,
      "responseTime": 45,
      "lastCheck": "2025-10-25T10:30:00.000Z"
    },
    "pattern-validator": {
      "available": true,
      "responseTime": 52,
      "lastCheck": "2025-10-25T10:30:00.000Z"
    },
    "confidence-scorer": {
      "available": true,
      "responseTime": 38,
      "lastCheck": "2025-10-25T10:30:00.000Z"
    }
  }
}
```

## JavaScript/Node.js API

### FactGate Class

Main class for interacting with FactGate.

#### Constructor

```typescript
constructor(config?: FactGateConfig)
```

**Parameters**:

```typescript
interface FactGateConfig {
  adapters?: (string | FactSourceAdapter)[];
  strategy?: 'all' | 'any' | 'majority';
  timeout?: number; // milliseconds
  fallbackStrategy?: 'fail' | 'partial' | 'ignore';
}
```

**Example**:

```javascript
const FactGate = require('factgate');

// Default configuration (all built-in adapters)
const factgate1 = new FactGate();

// Custom configuration
const factgate2 = new FactGate({
  adapters: ['contradiction-detector', 'pattern-validator'],
  strategy: 'majority',
  timeout: 5000,
  fallbackStrategy: 'partial'
});

// With custom adapter
const factgate3 = new FactGate({
  adapters: [
    'contradiction-detector',
    new CustomWikipediaAdapter()
  ]
});
```

#### verify()

Verify a claim.

```typescript
async verify(
  claim: string,
  options?: VerifyOptions
): Promise<AggregatedResult>
```

**Parameters**:

```typescript
interface VerifyOptions {
  adapters?: string[];
  strategy?: 'all' | 'any' | 'majority';
  context?: VerificationContext;
}

interface VerificationContext {
  previousClaims?: string[];
  domain?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}
```

**Example**:

```javascript
// Simple verification
const result = await factgate.verify(
  "The Earth orbits the Sun."
);

// With options
const result = await factgate.verify(
  "Water boils at 100°C at sea level.",
  {
    adapters: ['contradiction-detector', 'confidence-scorer'],
    strategy: 'all',
    context: {
      domain: 'science',
      language: 'en'
    }
  }
);
```

#### registerAdapter()

Register a custom adapter.

```typescript
registerAdapter(adapter: FactSourceAdapter): void
```

**Example**:

```javascript
const customAdapter = new MyCustomAdapter();
factgate.registerAdapter(customAdapter);
```

#### unregisterAdapter()

Remove an adapter.

```typescript
unregisterAdapter(adapterName: string): void
```

**Example**:

```javascript
factgate.unregisterAdapter('custom-adapter');
```

#### getAdapters()

Get list of registered adapters.

```typescript
getAdapters(): AdapterInfo[]
```

**Example**:

```javascript
const adapters = factgate.getAdapters();
console.log(adapters);
// [
//   { name: 'contradiction-detector', type: 'built-in', ... },
//   { name: 'pattern-validator', type: 'built-in', ... }
// ]
```

#### getAdapterStatus()

Check health status of adapters.

```typescript
async getAdapterStatus(): Promise<Record<string, AdapterStatus>>
```

**Example**:

```javascript
const status = await factgate.getAdapterStatus();
console.log(status);
// {
//   'contradiction-detector': { available: true, responseTime: 45, ... },
//   'pattern-validator': { available: true, responseTime: 52, ... }
// }
```

## Adapter Interface

Custom adapters must implement the `FactSourceAdapter` interface.

### FactSourceAdapter Interface

```typescript
interface FactSourceAdapter {
  // Adapter identification
  name: string;
  description: string;

  // Main verification method
  verify(
    claim: string,
    context?: VerificationContext
  ): Promise<VerificationResult>;

  // Health check
  isAvailable(): Promise<boolean>;
}
```

### Implementing a Custom Adapter

**Minimal Example**:

```javascript
class SimpleAdapter {
  constructor() {
    this.name = 'simple-adapter';
    this.description = 'A simple example adapter';
  }

  async verify(claim, context) {
    // Your verification logic here
    const isValid = claim.length > 10; // Simple example

    return {
      sourceId: this.name,
      verdict: isValid ? 'verified' : 'uncertain',
      confidence: isValid ? 0.8 : 0.3,
      reasoning: `Claim length: ${claim.length} characters`,
      timestamp: new Date()
    };
  }

  async isAvailable() {
    // Check if adapter can function
    return true;
  }
}
```

**Complete Example with Error Handling**:

```javascript
class RobustAdapter {
  constructor(config) {
    this.name = 'robust-adapter';
    this.description = 'Production-ready adapter example';
    this.config = config;
  }

  async verify(claim, context) {
    try {
      // Validate input
      if (!claim || typeof claim !== 'string') {
        throw new Error('Invalid claim input');
      }

      // Check availability before processing
      if (!await this.isAvailable()) {
        return this.unavailableResult();
      }

      // Perform verification
      const result = await this.performVerification(claim, context);

      // Validate result
      this.validateResult(result);

      return result;
    } catch (error) {
      console.error(`${this.name} error:`, error);
      return this.errorResult(error);
    }
  }

  async performVerification(claim, context) {
    // Your custom verification logic
    return {
      sourceId: this.name,
      verdict: 'uncertain',
      confidence: 0.5,
      reasoning: 'Verification logic not implemented',
      timestamp: new Date()
    };
  }

  async isAvailable() {
    try {
      // Check dependencies, APIs, databases, etc.
      return true;
    } catch {
      return false;
    }
  }

  unavailableResult() {
    return {
      sourceId: this.name,
      verdict: 'uncertain',
      confidence: 0,
      reasoning: 'Adapter is currently unavailable',
      timestamp: new Date()
    };
  }

  errorResult(error) {
    return {
      sourceId: this.name,
      verdict: 'uncertain',
      confidence: 0,
      reasoning: `Error during verification: ${error.message}`,
      details: { error: error.message },
      timestamp: new Date()
    };
  }

  validateResult(result) {
    const required = ['sourceId', 'verdict', 'confidence', 'reasoning', 'timestamp'];
    for (const field of required) {
      if (!(field in result)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (result.confidence < 0 || result.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    if (!['verified', 'contradicted', 'uncertain'].includes(result.verdict)) {
      throw new Error('Invalid verdict value');
    }
  }
}
```

## Data Structures

### AggregatedResult

Final result returned to clients.

```typescript
interface AggregatedResult {
  claim: string;                       // Original claim
  overall: 'verified' | 'contradicted' | 'uncertain';  // Final verdict
  confidence: number;                  // 0-1 scale
  sources: VerificationResult[];       // Results from each adapter
  combinedReasoning: string;           // Aggregated explanation
  processingTime: number;              // Milliseconds
  issues?: Issue[];                    // Optional issues found
  metadata?: Record<string, unknown>;  // Optional metadata
}
```

### VerificationResult

Result from a single adapter.

```typescript
interface VerificationResult {
  sourceId: string;                    // Adapter name
  verdict: 'verified' | 'contradicted' | 'uncertain';
  confidence: number;                  // 0-1 scale
  reasoning: string;                   // Explanation
  details?: Record<string, unknown>;   // Optional additional data
  timestamp: Date;                     // When verification occurred
}
```

### Issue

Specific problem found during verification.

```typescript
interface Issue {
  type: string;                        // Issue type (e.g., 'contradiction', 'logical-fallacy')
  message: string;                     // Human-readable description
  severity: 'low' | 'medium' | 'high'; // Issue severity
  location?: string;                   // Where in the claim (optional)
  suggestion?: string;                 // How to fix (optional)
}
```

### AdapterInfo

Information about an adapter.

```typescript
interface AdapterInfo {
  name: string;                        // Adapter identifier
  type: 'built-in' | 'custom';         // Adapter type
  description: string;                 // What it does
  available: boolean;                  // Current availability
  version?: string;                    // Optional version
}
```

### AdapterStatus

Health status of an adapter.

```typescript
interface AdapterStatus {
  available: boolean;                  // Can the adapter function?
  responseTime: number;                // Last response time (ms)
  lastCheck: Date;                     // When status was checked
  error?: string;                      // Error message if unavailable
}
```

## Error Handling

### Error Types

FactGate throws typed errors for different failure scenarios:

```typescript
class FactGateError extends Error {
  code: string;
  details?: unknown;
}
```

**Error Codes**:

| Code | Description | Handling |
|------|-------------|----------|
| `INVALID_CLAIM` | Claim is null, empty, or invalid type | Validate input before calling |
| `ADAPTER_NOT_FOUND` | Requested adapter doesn't exist | Check available adapters |
| `ADAPTER_UNAVAILABLE` | Adapter is down or unreachable | Use fallback strategy |
| `VERIFICATION_TIMEOUT` | Verification exceeded timeout | Increase timeout or optimize adapters |
| `INVALID_CONFIGURATION` | Invalid FactGate config | Check config format |
| `ALL_ADAPTERS_FAILED` | No adapters could verify | Check adapter availability |

### Error Handling Examples

**Basic Try-Catch**:

```javascript
try {
  const result = await factgate.verify(claim);
  console.log('Result:', result);
} catch (error) {
  if (error.code === 'ADAPTER_UNAVAILABLE') {
    console.log('Adapter is down, using fallback');
    // Use fallback logic
  } else {
    console.error('Verification failed:', error.message);
  }
}
```

**With Fallback Strategy**:

```javascript
const factgate = new FactGate({
  adapters: ['contradiction-detector', 'pattern-validator', 'confidence-scorer'],
  fallbackStrategy: 'partial' // Continue even if some adapters fail
});

const result = await factgate.verify(claim);

if (result.sources.length < 3) {
  console.warn('Some adapters failed');
  console.log('Available results:', result.sources.map(s => s.sourceId));
}
```

**Custom Error Handler**:

```javascript
class SafeFactGate {
  constructor() {
    this.factgate = new FactGate();
  }

  async verify(claim) {
    try {
      return await this.factgate.verify(claim);
    } catch (error) {
      return {
        claim: claim,
        overall: 'uncertain',
        confidence: 0,
        sources: [],
        combinedReasoning: `Verification failed: ${error.message}`,
        processingTime: 0,
        error: error.code
      };
    }
  }
}
```

## Performance Considerations

### Response Time Expectations

Based on design specifications:

- **Built-in validators**: < 500ms per adapter
- **Chained verification**: Linear scaling (no significant overhead)
- **Network-based adapters**: Variable (implement timeout)

### Optimization Tips

1. **Use specific adapters** when possible:
   ```javascript
   // Faster: only use needed adapters
   await factgate.verify(claim, { adapters: ['contradiction-detector'] });

   // Slower: use all adapters
   await factgate.verify(claim);
   ```

2. **Implement caching** for repeated claims:
   ```javascript
   const cache = new Map();
   const cacheKey = claim.toLowerCase().trim();

   if (cache.has(cacheKey)) {
     return cache.get(cacheKey);
   }

   const result = await factgate.verify(claim);
   cache.set(cacheKey, result);
   return result;
   ```

3. **Use batch verification** for multiple claims:
   ```javascript
   const results = await Promise.all(
     claims.map(claim => factgate.verify(claim))
   );
   ```

## See Also

- [Quick Start Guide](QUICKSTART.md) - Getting started with FactGate
- [Usage Examples](EXAMPLES.md) - Practical examples
- [Architecture](ARCHITECTURE.md) - System design
- [Development Guide](../DEVELOPMENT.md) - Contributing

---

**🌏 繁體中文** / [API 參考](zh-TW/API.zh-TW.md)