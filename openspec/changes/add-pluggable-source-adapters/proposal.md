# Change Proposal: Add Pluggable Fact Source Adapters

## Summary
Introduce a pluggable adapter architecture that allows FactGate to work with multiple fact-checking sources without requiring core code modifications. This enables extensibility while keeping built-in validators dependency-free.

## Problem Statement
Currently, FactGate has no structured way to validate information against different fact sources. Every new source requires direct modifications to core code, creating tight coupling and maintenance burden. Users cannot easily integrate their own knowledge bases, APIs, or databases.

## Proposed Solution
Implement a pluggable adapter pattern with:
1. A simple, consistent interface that all fact sources must implement
2. Built-in validators (contradiction detection, pattern validation, confidence scoring) that work without external dependencies
3. A registry and chaining mechanism to combine multiple sources
4. Structured result objects with confidence scores and reasoning

## Benefits
- **Extensibility:** Users can add new sources without forking or modifying core code
- **Modularity:** Core verification logic separated from fact sources
- **No external dependencies required:** Built-in validators work out-of-the-box
- **Flexibility:** Sources can be easily configured, swapped, or combined
- **Better testing:** Each adapter can be tested independently
- **Community-driven:** Enables ecosystem of community-built adapters

## Impact Assessment

### Scope
- New: Core adapter interface definition
- New: Three built-in source validators
- New: Adapter registry and chaining logic
- Modified: FactGate constructor to accept adapter configuration
- Modified: verify() method to coordinate across adapters

### Effort Estimate
- Small to medium effort (~20-30 hours)
- Core interface and registry: ~4-6 hours
- Built-in validators: ~8-12 hours
- Integration and testing: ~8-10 hours

### Risk Level
**Low** - Backward compatible (existing code can work with default adapters)

### Affected Components
- MCP server verification logic
- Configuration system
- Result structure and response format

## Success Criteria
1. Adapter interface is simple enough for developers to implement in <50 lines
2. Built-in validators respond in <500ms
3. Multiple sources can be chained without degradation
4. All adapters follow consistent error handling patterns
5. Clear documentation and example custom adapters provided
6. All built-in validators have >95% test coverage

## Dependencies
- None for built-in validators
- MCP protocol compliance required
- Existing FactGate core verification logic

## Timeline
- Proposal review: 1-2 days
- Implementation: 5-7 days
- Testing and refinement: 2-3 days
- Documentation: 1 day
- Total: ~10 days

## Related Issues
- Addresses extensibility concerns
- Enables future integration with external fact-checking APIs
- Foundation for community adapter ecosystem