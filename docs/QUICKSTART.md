# Quick Start Guide

> **🚧 Development Status**: FactGate is currently in active development. This guide describes the planned usage based on design specifications. Some features may not yet be fully implemented.

## Overview

FactGate is an MCP (Model Context Protocol) Server that prevents AI hallucinations by providing real-time fact-checking and verification capabilities. It can be integrated with Claude and other AI systems to validate generated content against reliable knowledge sources.

## Prerequisites

- **Node.js**: Version 20.19.0 or higher
- **npm**: Package manager (comes with Node.js)
- **Basic MCP knowledge**: Familiarity with Model Context Protocol (optional but helpful)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/AsiaOstrich/FactGate.git
cd FactGate
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Installation

```bash
# Check Node.js version
node --version  # Should be >= 20.19.0

# Verify dependencies
npm list --depth=0
```

## Basic Configuration

### MCP Server Setup

FactGate runs as an MCP server. Configure it in your MCP client (e.g., Claude Desktop):

**Example `claude_desktop_config.json`:**

```json
{
  "mcpServers": {
    "factgate": {
      "command": "node",
      "args": ["/path/to/FactGate/index.js"],
      "env": {}
    }
  }
}
```

### Adapter Configuration (Planned)

FactGate uses pluggable adapters to verify information against different sources:

```javascript
// factgate.config.js (example configuration)
module.exports = {
  adapters: [
    {
      name: 'contradiction-detector',
      type: 'built-in',
      enabled: true
    },
    {
      name: 'pattern-validator',
      type: 'built-in',
      enabled: true
    },
    {
      name: 'confidence-scorer',
      type: 'built-in',
      enabled: true
    }
  ],
  // Chain multiple adapters for comprehensive validation
  chainStrategy: 'all' // or 'any', 'majority'
}
```

## First Verification

### Using Built-in Validators

FactGate includes three built-in validators that work without external dependencies:

#### 1. Contradiction Detection

Checks if a claim contradicts known facts or previous statements.

**Example MCP Request:**

```json
{
  "method": "verify",
  "params": {
    "claim": "The Earth is flat and orbits around the Sun.",
    "adapters": ["contradiction-detector"]
  }
}
```

**Expected Response:**

```json
{
  "verified": false,
  "confidence": 0.05,
  "issues": [
    {
      "type": "contradiction",
      "message": "Claim contains internal contradiction: 'flat' contradicts 'orbits around the Sun'",
      "severity": "high"
    }
  ],
  "sources": ["contradiction-detector"],
  "reasoning": "The claim asserts Earth is flat, which contradicts the orbital mechanics described."
}
```

#### 2. Pattern Validation

Validates claims against common logical patterns and structures.

**Example MCP Request:**

```json
{
  "method": "verify",
  "params": {
    "claim": "All unicorns are invisible, therefore unicorns don't exist.",
    "adapters": ["pattern-validator"]
  }
}
```

**Expected Response:**

```json
{
  "verified": false,
  "confidence": 0.3,
  "issues": [
    {
      "type": "logical-fallacy",
      "message": "Circular reasoning detected",
      "severity": "medium"
    }
  ],
  "sources": ["pattern-validator"]
}
```

#### 3. Confidence Scoring

Assesses confidence level based on claim structure, specificity, and verifiability.

**Example MCP Request:**

```json
{
  "method": "verify",
  "params": {
    "claim": "Some people think that sometimes things happen.",
    "adapters": ["confidence-scorer"]
  }
}
```

**Expected Response:**

```json
{
  "verified": true,
  "confidence": 0.95,
  "issues": [
    {
      "type": "low-specificity",
      "message": "Claim is too vague to be falsifiable",
      "severity": "low"
    }
  ],
  "sources": ["confidence-scorer"],
  "reasoning": "While technically true, the claim lacks specific verifiable details."
}
```

### Chaining Multiple Validators

Combine multiple adapters for comprehensive verification:

**Example MCP Request:**

```json
{
  "method": "verify",
  "params": {
    "claim": "Python was invented in 1991 by Guido van Rossum.",
    "adapters": ["contradiction-detector", "pattern-validator", "confidence-scorer"],
    "strategy": "all"
  }
}
```

**Expected Response:**

```json
{
  "verified": true,
  "confidence": 0.92,
  "issues": [],
  "sources": ["contradiction-detector", "pattern-validator", "confidence-scorer"],
  "reasoning": "All validators agree. Claim is specific, verifiable, and contains no contradictions.",
  "details": {
    "contradiction-detector": { "passed": true, "confidence": 0.95 },
    "pattern-validator": { "passed": true, "confidence": 0.90 },
    "confidence-scorer": { "passed": true, "confidence": 0.91 }
  }
}
```

## Integration with Claude

### In Claude Desktop

Once configured as an MCP server, FactGate can be used directly in Claude conversations:

**User**: "Is it true that the Great Wall of China is visible from space?"

**Claude**: Let me verify this claim using FactGate...

*[Claude calls FactGate MCP server]*

**FactGate Response**:
```json
{
  "verified": false,
  "confidence": 0.2,
  "issues": [
    {
      "type": "common-misconception",
      "message": "This is a frequently debunked myth",
      "severity": "medium"
    }
  ],
  "reasoning": "While widely believed, this claim contradicts verified information from astronauts and space agencies."
}
```

**Claude**: "According to fact-checking, this is actually a common myth. The Great Wall is not visible from space with the naked eye, as confirmed by astronauts and NASA."

### Programmatic Integration

Use FactGate in your own applications:

```javascript
// Example Node.js integration
const FactGate = require('factgate');

const factgate = new FactGate({
  adapters: ['contradiction-detector', 'pattern-validator']
});

async function validateClaim(claim) {
  const result = await factgate.verify(claim);

  if (result.confidence < 0.5) {
    console.warn(`Low confidence (${result.confidence}): ${claim}`);
    console.log('Issues:', result.issues);
  }

  return result;
}

// Usage
validateClaim("Water boils at 100°C at sea level.")
  .then(result => console.log('Verification:', result));
```

## Common Use Cases

### 1. AI Content Validation

Validate AI-generated content before presenting to users:

```javascript
const aiResponse = await getAIResponse(prompt);
const verification = await factgate.verify(aiResponse);

if (verification.confidence > 0.8) {
  return aiResponse; // High confidence
} else {
  return aiResponse + "\n\n⚠️ Note: This information should be verified.";
}
```

### 2. Real-time Fact-Checking

Check claims during conversations:

```javascript
function checkClaim(userMessage) {
  // Extract claims from user message
  const claims = extractClaims(userMessage);

  // Verify each claim
  return Promise.all(
    claims.map(claim => factgate.verify(claim))
  );
}
```

### 3. Content Moderation

Flag potentially false information:

```javascript
async function moderateContent(content) {
  const result = await factgate.verify(content);

  if (result.issues.some(i => i.severity === 'high')) {
    return { approved: false, reason: 'Contains high-severity issues' };
  }

  return { approved: true };
}
```

## Performance Expectations

Based on design specifications:

- **Built-in validators**: < 500ms response time
- **Chained adapters**: Linear scaling (no significant degradation)
- **Concurrent requests**: Supported (Node.js async model)

## Troubleshooting

### Installation Issues

**Problem**: `npm install` fails

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Retry installation
rm -rf node_modules package-lock.json
npm install
```

### Version Issues

**Problem**: "Node.js version too old"

**Solution**:
```bash
# Check current version
node --version

# Update Node.js (using nvm)
nvm install 20.19.0
nvm use 20.19.0
```

### MCP Connection Issues

**Problem**: Claude Desktop can't connect to FactGate

**Solution**:
1. Verify `claude_desktop_config.json` path is correct
2. Check that Node.js is in your PATH
3. Restart Claude Desktop after config changes
4. Check logs: `~/Library/Logs/Claude/` (macOS)

## Next Steps

- **Read the [API Documentation](API.md)** for detailed endpoint reference
- **Explore [Usage Examples](EXAMPLES.md)** for advanced scenarios
- **Review [Architecture](ARCHITECTURE.md)** to understand system design
- **Check [Development Guide](../DEVELOPMENT.md)** if you want to contribute

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/AsiaOstrich/FactGate/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AsiaOstrich/FactGate/discussions)
- **Documentation**: See `docs/` directory for more guides

---

**🌏 繁體中文** / [快速開始指南](zh-TW/QUICKSTART.zh-TW.md)