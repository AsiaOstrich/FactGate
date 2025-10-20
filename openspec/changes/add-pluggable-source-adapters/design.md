# Design Document: Pluggable Fact Source Adapters

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   FactGate Core                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Verification Engine                  │   │
│  │         (Orchestrates fact sources)              │   │
│  └──────────────────────────────────────────────────┘   │
│                        │                                  │
│         ┌──────────────┼──────────────┐                   │
│         ▼              ▼              ▼                   │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │  Built-in   │ │  Built-in    │ │   Custom     │     │
│  │ Contradiction│ │  Pattern     │ │   Sources    │     │
│  │ Detector    │ │  Validator   │ │  (User-impl) │     │
│  └─────────────┘ └──────────────┘ └──────────────┘     │
│         │              │              │                   │
│         └──────────────┼──────────────┘                   │
│                        ▼                                  │
│           ┌─────────────────────────┐                   │
│           │  Confidence Scorer      │                   │
│           │  (Built-in aggregator)  │                   │
│           └─────────────────────────┘                   │
│                        │                                  │
│                        ▼                                  │
│           ┌─────────────────────────┐                   │
│           │  Structured Result      │                   │
│           │  (with reasoning)       │                   │
│           └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Source Adapter Interface
All fact sources implement a consistent interface:

```typescript
interface FactSourceAdapter {
  name: string;
  description: string;

  verify(
    claim: string,
    context?: VerificationContext
  ): Promise<VerificationResult>;

  isAvailable(): Promise<boolean>;
}
```

### 2. Verification Result Structure
Adapters return standardized results:

```typescript
interface VerificationResult {
  sourceId: string;
  verdict: 'verified' | 'contradicted' | 'uncertain';
  confidence: number;        // 0-1 scale
  reasoning: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}
```

### 3. Aggregated Verification Result
Final output to MCP clients:

```typescript
interface AggregatedResult {
  claim: string;
  overall: 'verified' | 'contradicted' | 'uncertain';
  confidence: number;        // 0-1 scale
  sources: VerificationResult[];
  combinedReasoning: string;
  processingTime: number;
}
```

## Implementation Strategy

### Capability 1: Source Adapter Interface & Registry
**Purpose:** Define the contract all adapters must follow and manage their lifecycle

**Key Design Decisions:**
1. Async-first design to support both sync and async sources
2. Optional `context` parameter for future extensibility
3. `isAvailable()` method allows graceful degradation when sources are down
4. Registry pattern for discovering and managing adapters

### Capability 2: Built-in Contradiction Detector
**Purpose:** Identify logically contradictory claims without external dependencies

**Approach:**
1. Pattern-based contradiction detection (e.g., "is X" vs "is not X")
2. Simple semantic analysis for common contradictions
3. Pluggable confidence scoring based on strength of contradiction
4. <500ms response time guaranteed

### Capability 3: Built-in Pattern Validator
**Purpose:** Validate claims against known false patterns

**Approach:**
1. Maintain configurable pattern library
2. Match claims against known problematic patterns
3. Return confidence based on pattern strength
4. No external dependencies

### Capability 4: Built-in Confidence Scorer
**Purpose:** Aggregate results from multiple sources into unified confidence

**Approach:**
1. Weighted aggregation of source results
2. Configurable weighting strategy (equal, by-reliability, custom)
3. Handle missing sources gracefully
4. Provide clear reasoning for final confidence

### Capability 5: Adapter Registry & Orchestration
**Purpose:** Manage adapters and coordinate verification across them

**Approach:**
1. Central registry maintaining adapter metadata
2. Parallel verification across all adapters
3. Timeout handling for slow sources
4. Error isolation (one source's failure doesn't affect others)
5. Caching strategy for repeated claims

## Data Flow

```
User Call: verify("Claim text")
  │
  ├─> Load registered adapters
  │
  ├─> Parallelize verification across all adapters
  │   ├─> Contradiction Detector.verify()
  │   ├─> Pattern Validator.verify()
  │   ├─> Confidence Scorer.verify()
  │   └─> Custom Adapters.verify() (if configured)
  │
  ├─> Collect all results with timeout handling
  │
  ├─> Aggregate results into final confidence
  │
  └─> Return AggregatedResult to caller
```

## Configuration Example

```typescript
const factGate = new FactGate({
  adapters: [
    {
      adapter: new ContradictionDetector(),
      weight: 0.3,
      timeout: 200
    },
    {
      adapter: new PatternValidator(),
      weight: 0.2,
      timeout: 200
    },
    {
      adapter: new ConfidenceScorer(),
      weight: 0.2,
      timeout: 300
    }
  ],
  aggregationStrategy: 'weighted-average',
  maxParallelSources: 10,
  defaultTimeout: 500
});
```

## Extensibility Points

### For Users Creating Custom Adapters:
1. Implement `FactSourceAdapter` interface
2. Return `VerificationResult` with verdict and confidence
3. Optionally implement caching for performance
4. Register with FactGate using `addAdapter()`

### Example Custom Adapter:
```typescript
class WikipediaAdapter implements FactSourceAdapter {
  name = 'wikipedia';

  async verify(claim: string): Promise<VerificationResult> {
    // Query Wikipedia API
    // Parse results
    // Return structured result
  }

  async isAvailable(): Promise<boolean> {
    // Check API connectivity
  }
}
```

## Error Handling Strategy

1. **Adapter Failure:** Isolate failures, continue with other sources
2. **Timeout:** Return partial results from completed sources
3. **Invalid Claims:** Return 'uncertain' verdict with appropriate reasoning
4. **Configuration Errors:** Fail fast during initialization

## Performance Considerations

1. **Parallelization:** All adapters run concurrently
2. **Timeouts:** Built-in validators must complete in <200ms
3. **Caching:** Recent results cached to reduce redundant verification
4. **Circuit Breaker:** Disable unavailable sources after repeated failures
5. **Resource Limits:** Cap concurrent adapter executions

## Security Considerations

1. **Input Validation:** Sanitize claims before processing
2. **Adapter Trust:** Only load trusted adapters (whitelist approach)
3. **Rate Limiting:** Prevent abuse of expensive adapters
4. **Sensitive Data:** Don't log full claims in production
5. **Isolation:** Adapters cannot modify shared state

## Testing Strategy

1. **Unit Tests:** Each adapter tested independently
2. **Integration Tests:** Multiple adapters in concert
3. **Performance Tests:** Verify <500ms response time
4. **Error Scenarios:** Test timeouts, failures, degraded mode
5. **Mock Adapters:** Create stubs for testing orchestration logic

## Dependencies & Constraints

**No External Dependencies Required** for built-in validators
- Pure JavaScript/TypeScript implementation
- Node.js 20.19.0+ standard library only

**MCP Protocol Compliance:**
- Adapter results must serialize to JSON for MCP transmission
- No circular references or non-serializable objects

## Migration Path

**For Existing Code:**
- Current verification logic becomes "default adapter"
- Existing verify() method signature unchanged
- New adapter configuration optional (backward compatible)
- Deprecation timeline: None (fully backward compatible)

## Future Extensions

1. **Adapter Marketplace:** Discover community-built adapters
2. **Reliability Metrics:** Track adapter accuracy over time
3. **Learning:** Improve confidence scoring based on feedback
4. **Chaining Strategies:** Custom logic for combining results
5. **Async Caching:** Persistent cache across restarts