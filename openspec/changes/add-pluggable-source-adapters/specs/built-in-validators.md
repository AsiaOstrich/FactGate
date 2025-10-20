# Specification: Built-in Validators

## Overview
Define three built-in validators that work without external dependencies: contradiction detector, pattern validator, and confidence scorer.

## ADDED Requirements

### Requirement 1: Contradiction Detector Validator
Identify logically contradictory claims without external dependencies.

#### Scenario: Detect direct contradiction
- **WHEN** the contradiction detector analyzes a claim
- **THEN** it identifies claims that directly contradict known facts
- **AND** it detects patterns like "X is Y" contradicting "X is not Y"
- **AND** it returns verdict 'contradicted' when contradiction found
- **AND** confidence is high (>0.8) when contradiction is clear
- **AND** reasoning explains which pattern was matched

#### Scenario: Handle uncertain contradictions
- **WHEN** the detector encounters claims that might contradict
- **THEN** it returns verdict 'uncertain' for ambiguous cases
- **AND** confidence reflects the ambiguity (0.3-0.7 range)
- **AND** reasoning explains the potential contradiction
- **AND** it doesn't make false positives by assuming contradictions

#### Scenario: Process within performance budget
- **WHEN** the contradiction detector verifies a claim
- **THEN** it completes in <200ms
- **AND** it works with claims up to 10,000 characters
- **AND** it never times out
- **AND** it maintains consistent performance regardless of claim complexity

#### Scenario: Handle edge cases
- **WHEN** the detector receives empty or null claims
- **THEN** it returns verdict 'uncertain'
- **AND** confidence is 0 (unknown)
- **AND** reasoning indicates invalid input
- **AND** it doesn't throw errors for malformed input

### Requirement 2: Pattern Validator Validator
Validate claims against known false patterns without external dependencies.

#### Scenario: Match claim against pattern library
- **WHEN** the pattern validator processes a claim
- **THEN** it compares the claim against configurable patterns
- **AND** patterns include common misinformation (flat earth, vaccines cause autism, etc.)
- **AND** it performs fuzzy matching to catch variations
- **AND** it returns verdict 'contradicted' when pattern matches
- **AND** confidence reflects pattern strength

#### Scenario: Configure pattern library
- **WHEN** FactGate initializes
- **THEN** the pattern validator is initialized with default patterns
- **AND** operators can add custom patterns at runtime
- **AND** patterns support regex for flexible matching
- **AND** patterns can be enabled/disabled individually
- **AND** pattern weights affect confidence calculation

#### Scenario: Handle non-matching claims
- **WHEN** a claim doesn't match any pattern
- **THEN** the validator returns verdict 'uncertain'
- **AND** confidence is 0.5 (neutral)
- **AND** reasoning indicates no patterns matched
- **AND** this doesn't prevent other validators from running

#### Scenario: Performance within budget
- **WHEN** the pattern validator checks a claim
- **THEN** it completes in <200ms
- **AND** pattern matching uses optimized algorithms
- **AND** it supports 1000+ patterns without slowdown
- **AND** regex compilation is cached

### Requirement 3: Confidence Scorer Aggregator
Combine results from multiple sources into unified confidence scoring.

#### Scenario: Aggregate multiple source results
- **WHEN** the confidence scorer receives results from multiple adapters
- **THEN** it combines their verdicts and confidence scores
- **AND** it computes a weighted average confidence
- **AND** it derives an overall verdict (verified, contradicted, uncertain)
- **AND** it provides clear reasoning for the final score
- **AND** all source results are preserved in output

#### Scenario: Use weighted aggregation
- **WHEN** confidence scores are aggregated
- **THEN** it uses configurable weights for each source
- **AND** weights default to equal importance (1/n each)
- **AND** operators can increase weight for more reliable sources
- **AND** weights are normalized to sum to 1.0
- **AND** weight configuration is persisted

#### Scenario: Handle missing sources
- **WHEN** some sources are unavailable or timeout
- **THEN** the scorer aggregates available results only
- **AND** it adjusts weights to maintain normalized sum
- **AND** it indicates in reasoning which sources were used
- **AND** it indicates in reasoning which sources were unavailable
- **AND** unavailable sources don't penalize the confidence

#### Scenario: Compute final verdict
- **WHEN** computing overall verdict from multiple results
- **THEN** it uses majority voting with confidence as tie-breaker
- **AND** verdict is 'verified' if confidence >0.7 and most sources agree
- **AND** verdict is 'contradicted' if confidence >0.7 and most contradict
- **AND** verdict is 'uncertain' if confidence is ambiguous
- **AND** reasoning explains the voting logic

#### Scenario: Score within performance budget
- **WHEN** the scorer aggregates results
- **THEN** it completes in <100ms
- **AND** it works with any number of source results
- **AND** it doesn't create bottlenecks in the verification pipeline

### Requirement 4: No External Dependencies
Built-in validators work without requiring external APIs or services.

#### Scenario: Run offline
- **WHEN** FactGate is used offline (no internet)
- **THEN** built-in validators (contradiction, patterns, scoring) still work
- **AND** no API calls are attempted
- **AND** no external services are queried
- **AND** verification completes normally with available sources

#### Scenario: Zero configuration
- **WHEN** FactGate initializes with default settings
- **THEN** built-in validators are immediately ready
- **AND** no API keys required
- **AND** no database connections needed
- **AND** no external configuration files required

#### Scenario: Pure JavaScript implementation
- **WHEN** built-in validators execute
- **THEN** they use only Node.js standard library
- **AND** no native modules required
- **AND** no C++ bindings needed
- **AND** they run in any Node.js 20.19.0+ environment

## MODIFIED Requirements
None - this is a new capability

## REMOVED Requirements
None - this is a new capability