# Architecture

> **🚧 Development Status**: This document describes the planned architecture based on design specifications. Implementation is in progress.

## Overview

FactGate is designed as a modular, extensible fact-checking system that operates through the Model Context Protocol (MCP). The architecture prioritizes simplicity, extensibility, and performance.

## Table of Contents

- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Design Principles](#design-principles)
- [Extensibility](#extensibility)
- [Performance Considerations](#performance-considerations)
- [Security](#security)

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                   FactGate System                        │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │            MCP Server Interface                     │  │
│  │     (Handles protocol communication)               │  │
│  └────────────────────────────────────────────────────┘  │
│                        │                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │          Verification Engine                       │  │
│  │    (Orchestrates adapters & aggregation)          │  │
│  └────────────────────────────────────────────────────┘  │
│                        │                                  │
│         ┌──────────────┼──────────────┐                   │
│         ▼              ▼              ▼                   │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │  Built-in   │ │  Built-in    │ │   Custom     │     │
│  │Contradiction│ │  Pattern     │ │   Adapters   │     │
│  │ Detector    │ │  Validator   │ │ (User-impl)  │     │
│  └─────────────┘ └──────────────┘ └──────────────┘     │
│         │              │              │                   │
│         └──────────────┼──────────────┘                   │
│                        ▼                                  │
│           ┌─────────────────────────┐                   │
│           │  Confidence Aggregator  │                   │
│           │  (Combines results)     │                   │
│           └─────────────────────────┘                   │
│                        │                                  │
│                        ▼                                  │
│           ┌─────────────────────────┐                   │
│           │  Result Formatter       │                   │
│           │  (Structured output)    │                   │
│           └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### Component Layers

1. **Protocol Layer**: MCP server interface handling communication
2. **Orchestration Layer**: Verification engine coordinating adapters
3. **Adapter Layer**: Pluggable fact sources (built-in and custom)
4. **Aggregation Layer**: Confidence scoring and result combination
5. **Output Layer**: Structured result formatting

## Core Components

### 1. MCP Server Interface

**Responsibility**: Handle MCP protocol communication with clients.

**Key Functions**:
- Parse incoming MCP requests
- Route to verification engine
- Format responses according to MCP spec
- Handle protocol-level errors

**Technology**: Node.js, MCP SDK

**Interface**:
```typescript
class MCPServer {
  async handleRequest(request: MCPRequest): Promise<MCPResponse>
  async getCapabilities(): Promise<Capabilities>
  async shutdown(): Promise<void>
}
```

### 2. Verification Engine

**Responsibility**: Orchestrate verification across multiple adapters.

**Key Functions**:
- Load and manage registered adapters
- Parallelize verification calls
- Handle timeouts and failures
- Aggregate results

**Design Pattern**: Orchestrator + Strategy

**Interface**:
```typescript
class VerificationEngine {
  async verify(
    claim: string,
    options?: VerifyOptions
  ): Promise<AggregatedResult>

  registerAdapter(adapter: FactSourceAdapter): void
  unregisterAdapter(name: string): void
  getAdapters(): AdapterInfo[]
}
```

**Key Algorithms**:
- **Parallel Execution**: Use `Promise.all()` for concurrent adapter calls
- **Timeout Management**: `Promise.race()` with timeout promises
- **Error Isolation**: Try-catch per adapter to prevent cascading failures

### 3. Adapter Registry

**Responsibility**: Manage lifecycle of fact source adapters.

**Key Functions**:
- Register/unregister adapters
- Validate adapter interface compliance
- Track adapter availability and health
- Provide adapter metadata

**Data Structure**:
```typescript
class AdapterRegistry {
  private adapters: Map<string, RegisteredAdapter>

  register(adapter: FactSourceAdapter): void
  unregister(name: string): void
  get(name: string): FactSourceAdapter | undefined
  getAll(): FactSourceAdapter[]
  checkHealth(): Promise<Map<string, AdapterStatus>>
}

interface RegisteredAdapter {
  adapter: FactSourceAdapter
  weight: number
  timeout: number
  enabled: boolean
  metadata: AdapterMetadata
}
```

### 4. Built-in Adapters

#### Contradiction Detector

**Purpose**: Identify logical contradictions within claims.

**Approach**:
- Pattern matching for explicit contradictions ("is X" vs "is not X")
- Temporal consistency checking
- Internal claim consistency

**Response Time**: <200ms

**Example**:
```javascript
const claim = "The sun rises in the west and sets in the east.";
// Detects contradiction with known astronomical facts
```

#### Pattern Validator

**Purpose**: Detect logical fallacies and problematic patterns.

**Approach**:
- Maintain library of fallacy patterns
- Match claims against known problematic structures
- Confidence based on pattern strength

**Patterns Detected**:
- Circular reasoning
- False dichotomy
- Slippery slope
- Correlation-causation confusion
- Hasty generalization

**Response Time**: <250ms

#### Confidence Scorer

**Purpose**: Assess claim quality and verifiability.

**Approach**:
- Specificity analysis
- Falsifiability assessment
- Vagueness detection
- Temporal/spatial specificity

**Factors**:
- **High confidence**: Specific, verifiable, falsifiable
- **Low confidence**: Vague, unfalsifiable, overly general

**Response Time**: <150ms

### 5. Confidence Aggregator

**Responsibility**: Combine results from multiple adapters into final verdict.

**Strategies**:

1. **Weighted Average** (default):
   ```
   confidence = Σ(adapter_confidence × adapter_weight) / Σ(adapter_weight)
   ```

2. **Majority Vote**:
   ```
   verdict = mostCommon(adapter_verdicts)
   confidence = count(majority) / total_adapters
   ```

3. **Pessimistic** (lowest confidence wins):
   ```
   confidence = min(adapter_confidences)
   verdict = most_negative_verdict
   ```

4. **Optimistic** (highest confidence wins):
   ```
   confidence = max(adapter_confidences)
   verdict = most_positive_verdict
   ```

**Configuration**:
```typescript
const engine = new VerificationEngine({
  aggregationStrategy: 'weighted-average',
  adapterWeights: {
    'contradiction-detector': 0.4,
    'pattern-validator': 0.3,
    'confidence-scorer': 0.3
  }
});
```

### 6. Result Formatter

**Responsibility**: Structure results for client consumption.

**Output Format**:
```typescript
interface AggregatedResult {
  claim: string
  overall: 'verified' | 'contradicted' | 'uncertain'
  confidence: number  // 0-1
  sources: VerificationResult[]
  combinedReasoning: string
  processingTime: number
  issues?: Issue[]
  metadata?: Record<string, unknown>
}
```

**Features**:
- Human-readable reasoning
- Detailed issue breakdown
- Source attribution
- Performance metrics

## Data Flow

### Verification Request Flow

```
1. MCP Client sends verify request
   │
   ▼
2. MCP Server receives and parses request
   │
   ▼
3. Verification Engine receives claim
   │
   ├─> Load registered adapters from registry
   │
   ├─> Create verification promises for each adapter
   │   ├─> Adapter 1: ContradictionDetector.verify(claim)
   │   ├─> Adapter 2: PatternValidator.verify(claim)
   │   └─> Adapter 3: ConfidenceScorer.verify(claim)
   │
   ├─> Execute in parallel with timeout
   │   └─> Promise.race([
   │         Promise.all(adapterPromises),
   │         timeoutPromise
   │       ])
   │
   ├─> Collect results
   │   ├─> Success: Add to results array
   │   └─> Failure: Log error, continue with others
   │
   ├─> Aggregate results
   │   ├─> Calculate weighted confidence
   │   ├─> Determine overall verdict
   │   └─> Combine reasoning from all sources
   │
   ├─> Format result
   │   └─> Create AggregatedResult structure
   │
   ▼
4. Return to MCP Client
```

### Adapter Execution Flow

```
Adapter.verify(claim, context)
   │
   ├─> 1. Validate input
   │      └─> Check claim is non-empty string
   │
   ├─> 2. Check availability
   │      └─> isAvailable()
   │         ├─> Available: continue
   │         └─> Unavailable: return uncertain result
   │
   ├─> 3. Perform verification logic
   │      └─> Adapter-specific implementation
   │
   ├─> 4. Calculate confidence
   │      └─> 0-1 scale based on findings
   │
   ├─> 5. Generate reasoning
   │      └─> Human-readable explanation
   │
   ├─> 6. Structure result
   │      └─> VerificationResult object
   │
   └─> 7. Return result
```

## Design Principles

### 1. Simplicity First

**Principle**: Default to simple, proven patterns over complex solutions.

**Application**:
- Single-file implementations until complexity warrants splitting
- Avoid frameworks without clear justification
- Favor readable code over clever optimizations
- Target <100 lines per change

**Example**:
```javascript
// Preferred: Simple, direct implementation
function calculateConfidence(results) {
  const sum = results.reduce((acc, r) => acc + r.confidence, 0);
  return sum / results.length;
}

// Avoid: Over-engineered solution
class ConfidenceCalculationStrategyFactory {
  createStrategy(type) {
    return new WeightedAverageConfidenceStrategy(
      new ResultNormalizer(new ConfidenceValidator())
    );
  }
}
```

### 2. Pluggable Architecture

**Principle**: Enable extensibility without modifying core code.

**Application**:
- Well-defined adapter interface
- Registry pattern for dynamic loading
- No hard-coded adapter dependencies
- Custom adapters treated equally with built-in

**Benefits**:
- Users can add their own fact sources
- Easy to test adapters in isolation
- Community can build adapter ecosystem
- No need to fork for customization

### 3. Fail Gracefully

**Principle**: System should remain functional even when components fail.

**Application**:
- Error isolation per adapter
- Fallback strategies for partial failures
- Clear error messages with recovery suggestions
- Degraded operation preferred over complete failure

**Example**:
```javascript
// If one adapter fails, others continue
try {
  results.push(await adapter.verify(claim));
} catch (error) {
  logger.warn(`Adapter ${adapter.name} failed:`, error);
  // Continue with other adapters
}

// Return partial results if available
if (results.length > 0) {
  return aggregateResults(results, { partial: true });
}
```

### 4. Performance by Design

**Principle**: Architecture should enable good performance without complex optimizations.

**Application**:
- Parallel adapter execution by default
- Timeout enforcement prevents slow adapters blocking others
- Built-in adapters designed for <500ms response
- Caching opportunities at multiple levels

**Performance Targets**:
- Built-in adapters: <500ms each
- Total verification: <1s for 3 adapters
- Concurrent requests: Supported via Node.js async

### 5. Observable and Debuggable

**Principle**: System behavior should be easy to understand and debug.

**Application**:
- Detailed reasoning in results
- Processing time tracking
- Adapter-level result visibility
- Clear error messages with context

**Example Result**:
```json
{
  "confidence": 0.85,
  "sources": [
    {
      "sourceId": "contradiction-detector",
      "confidence": 0.9,
      "reasoning": "No contradictions detected in claim structure"
    }
  ],
  "processingTime": 145,
  "combinedReasoning": "High confidence based on 3 agreeing sources"
}
```

## Extensibility

### Adding Custom Adapters

**Requirements**:
1. Implement `FactSourceAdapter` interface
2. Return `VerificationResult` format
3. Handle errors gracefully
4. Implement `isAvailable()` check

**Integration Points**:
```javascript
// 1. Create adapter
class MyAdapter implements FactSourceAdapter {
  name = 'my-adapter';
  description = 'My custom fact source';

  async verify(claim, context) {
    // Implementation
  }

  async isAvailable() {
    // Health check
  }
}

// 2. Register with FactGate
const factgate = new FactGate();
factgate.registerAdapter(new MyAdapter());

// 3. Use immediately
await factgate.verify(claim);
```

### Extension Points

1. **Custom Aggregation Strategies**
   ```typescript
   class CustomAggregator implements AggregationStrategy {
     aggregate(results: VerificationResult[]): AggregatedResult
   }
   ```

2. **Result Formatters**
   ```typescript
   class CustomFormatter implements ResultFormatter {
     format(result: AggregatedResult): FormattedOutput
   }
   ```

3. **Caching Layers**
   ```typescript
   class CustomCache implements CacheStrategy {
     get(key: string): AggregatedResult | null
     set(key: string, value: AggregatedResult): void
   }
   ```

## Performance Considerations

### Scalability

**Current Scale**: Single-server deployment
- **Expected Load**: <1000 verifications/minute
- **Concurrent Requests**: Handled by Node.js event loop
- **Memory**: <100MB baseline + adapter overhead

**Future Scaling Options**:
- Horizontal scaling: Multiple FactGate instances behind load balancer
- Adapter caching: Redis/Memcached for repeated claims
- Async processing: Message queue for batch verifications

### Optimization Opportunities

1. **Claim Caching**
   - Cache key: Normalized claim text
   - TTL: Configurable (default 1 hour)
   - Hit rate: Expected 20-30% for typical workloads

2. **Adapter Results Caching**
   - Per-adapter caching
   - Longer TTL for stable sources
   - Invalidation strategy needed

3. **Parallel Execution**
   - Already implemented by default
   - No additional optimization needed

4. **Lazy Adapter Loading**
   - Load custom adapters on demand
   - Reduce startup time

## Security

### Threat Model

**In Scope**:
- Malicious input claims (injection attempts)
- Resource exhaustion (DoS via slow adapters)
- Untrusted custom adapters

**Out of Scope** (handled by MCP/deployment):
- Network security (TLS, authentication)
- Access control
- Rate limiting

### Security Measures

1. **Input Validation**
   ```javascript
   function validateClaim(claim) {
     if (typeof claim !== 'string') {
       throw new Error('Claim must be string');
     }
     if (claim.length > MAX_CLAIM_LENGTH) {
       throw new Error('Claim exceeds maximum length');
     }
     // Additional sanitization
   }
   ```

2. **Timeout Enforcement**
   - Prevents slow adapters from blocking system
   - Default: 5 seconds per adapter
   - Configurable per adapter

3. **Adapter Sandboxing**
   - Custom adapters run in same process (trust model)
   - Future: Consider worker threads for isolation
   - Errors don't crash main process

4. **Resource Limits**
   ```javascript
   const limits = {
     maxAdapters: 10,
     maxClaimLength: 10000,
     maxConcurrentVerifications: 100,
     adapterTimeout: 5000
   };
   ```

## See Also

- [API Reference](API.md) - Complete API documentation
- [Quick Start](QUICKSTART.md) - Getting started guide
- [Examples](EXAMPLES.md) - Usage examples
- [Development Guide](../DEVELOPMENT.md) - Contributing

---

**🌏 繁體中文** / [架構](zh-TW/ARCHITECTURE.zh-TW.md)