# Specification: Source Adapter Interface

## Overview
Define the contract that all fact-checking source adapters must implement to work with FactGate's pluggable architecture.

## ADDED Requirements

### Requirement 1: Adapter Interface Contract
All fact sources must implement a consistent interface to ensure interoperability and predictable behavior.

#### Scenario: Implement basic adapter
- **WHEN** a developer creates a new fact-checking source adapter
- **THEN** they must implement the `FactSourceAdapter` interface
- **AND** the adapter must have `name: string` property identifying it
- **AND** the adapter must have `description: string` property explaining its purpose
- **AND** the adapter must implement `verify(claim: string, context?: VerificationContext): Promise<VerificationResult>` method
- **AND** the adapter must implement `isAvailable(): Promise<boolean>` method
- **THEN** the adapter is compatible with FactGate's orchestration system

#### Scenario: Interface type safety
- **WHEN** FactGate processes adapters
- **THEN** TypeScript type checking ensures all adapters conform to the interface
- **AND** adapters with missing methods cause compilation errors
- **AND** return types are validated at compile time

### Requirement 2: Verification Result Structure
Adapters return standardized results enabling consistent aggregation.

#### Scenario: Return verification result
- **WHEN** an adapter completes verification of a claim
- **THEN** it returns a `VerificationResult` object
- **AND** the result includes `sourceId: string` identifying the adapter
- **AND** the result includes `verdict: 'verified' | 'contradicted' | 'uncertain'`
- **AND** the result includes `confidence: number` (0-1 scale)
- **AND** the result includes `reasoning: string` explaining the verdict
- **AND** the result includes `timestamp: Date` when verification occurred
- **AND** the result optionally includes `details: Record<string, unknown>` for adapter-specific data

#### Scenario: Structured result serialization
- **WHEN** verification results are transmitted via MCP
- **THEN** all result objects are JSON-serializable
- **AND** Date objects serialize to ISO 8601 format
- **AND** numbers are properly formatted as JSON numbers
- **AND** no circular references exist in result objects

### Requirement 3: Adapter Availability Checking
Adapters can signal when they're unavailable for graceful degradation.

#### Scenario: Check adapter availability
- **WHEN** FactGate checks if an adapter can process requests
- **THEN** it calls the adapter's `isAvailable()` method
- **AND** the method returns a Promise resolving to boolean
- **AND** true indicates the adapter is ready to verify claims
- **AND** false indicates the adapter is temporarily unavailable
- **AND** unavailable adapters are skipped without failing the overall verification

#### Scenario: Handle adapter temporarily down
- **WHEN** an adapter's `isAvailable()` returns false
- **THEN** FactGate does not call its `verify()` method
- **AND** the verification proceeds with remaining available adapters
- **AND** the result indicates which sources were unavailable
- **AND** the user receives partial but valid results

### Requirement 4: Async-First Design
All adapters support asynchronous operations for API calls and database queries.

#### Scenario: Async adapter verification
- **WHEN** an adapter calls external services (APIs, databases)
- **THEN** it uses async/await for non-blocking operations
- **AND** the `verify()` method returns a Promise
- **AND** multiple adapters can verify in parallel without blocking
- **AND** slow adapters don't prevent other adapters from completing

#### Scenario: Promise-based error handling
- **WHEN** adapter verification fails
- **THEN** it rejects with an Error object
- **AND** the error is caught by FactGate's orchestration layer
- **AND** the error doesn't prevent other adapters from running
- **AND** the error is logged with adapter context for debugging

### Requirement 5: Optional Verification Context
The interface supports passing additional context for sophisticated verification.

#### Scenario: Pass context to adapter
- **WHEN** verifying a claim with additional context
- **THEN** the caller can provide optional `VerificationContext`
- **AND** context includes `language?: string` for language-specific verification
- **AND** context includes `category?: string` for domain-specific verification
- **AND** context includes `user?: string` for personalization
- **AND** context includes `source?: string` indicating claim origin
- **AND** adapters can ignore context if not applicable

#### Scenario: Context-aware verification
- **WHEN** an adapter receives context
- **THEN** it uses context to refine its verification logic
- **AND** the context influences confidence scoring
- **AND** adapters document which context fields they support
- **AND** missing context doesn't cause errors

## MODIFIED Requirements
None - this is a new capability

## REMOVED Requirements
None - this is a new capability