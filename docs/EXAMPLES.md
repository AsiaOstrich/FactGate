# Usage Examples

> **🚧 Development Status**: These examples are based on design specifications. Some features may not yet be fully implemented.

This document provides comprehensive examples of using FactGate in various scenarios.

## Table of Contents

- [Basic Verification](#basic-verification)
- [Custom Adapters](#custom-adapters)
- [Integration Patterns](#integration-patterns)
- [Advanced Scenarios](#advanced-scenarios)
- [Error Handling](#error-handling)

## Basic Verification

### Simple Claim Verification

Verify a single claim using all built-in validators:

```javascript
const FactGate = require('factgate');

const factgate = new FactGate();

async function verifyClaim() {
  const result = await factgate.verify("Water freezes at 0°C at standard pressure.");

  console.log('Verified:', result.verified);
  console.log('Confidence:', result.confidence);
  console.log('Reasoning:', result.reasoning);
}

verifyClaim();
```

**Expected Output:**
```
Verified: true
Confidence: 0.95
Reasoning: Claim is specific, verifiable, and contains no contradictions. Aligns with known physical constants.
```

### Detecting Contradictions

Use the contradiction detector to identify logical inconsistencies:

```javascript
async function detectContradiction() {
  const claim = "The sun rises in the west and sets in the east every day.";

  const result = await factgate.verify(claim, {
    adapters: ['contradiction-detector']
  });

  if (!result.verified) {
    console.log('Contradiction found!');
    result.issues.forEach(issue => {
      console.log(`- ${issue.type}: ${issue.message}`);
    });
  }
}
```

**Expected Output:**
```
Contradiction found!
- contradiction: Direction claims contradict known astronomical facts
- severity: high
```

### Pattern Validation

Check for logical fallacies and reasoning patterns:

```javascript
async function validatePattern() {
  const claims = [
    "All swans are white, therefore black swans don't exist.",
    "Correlation between ice cream sales and drowning means ice cream causes drowning.",
    "If we don't ban X, then Y will happen, and eventually Z will destroy everything."
  ];

  for (const claim of claims) {
    const result = await factgate.verify(claim, {
      adapters: ['pattern-validator']
    });

    console.log(`\nClaim: ${claim}`);
    console.log(`Valid: ${result.verified}`);
    console.log(`Issues: ${result.issues.map(i => i.type).join(', ')}`);
  }
}
```

**Expected Output:**
```
Claim: All swans are white, therefore black swans don't exist.
Valid: false
Issues: hasty-generalization, invalid-conclusion

Claim: Correlation between ice cream sales and drowning means ice cream causes drowning.
Valid: false
Issues: correlation-causation-fallacy

Claim: If we don't ban X, then Y will happen, and eventually Z will destroy everything.
Valid: false
Issues: slippery-slope-fallacy
```

## Custom Adapters

### Creating a Simple Custom Adapter

Implement a custom adapter to verify against your own data source:

```javascript
class WikipediaAdapter {
  constructor() {
    this.name = 'wikipedia-adapter';
    this.description = 'Verifies claims against Wikipedia articles';
  }

  async verify(claim, context) {
    try {
      // Extract key terms from claim
      const keywords = this.extractKeywords(claim);

      // Search Wikipedia
      const articles = await this.searchWikipedia(keywords);

      // Compare claim with article content
      const match = this.compareWithArticles(claim, articles);

      return {
        sourceId: this.name,
        verdict: match.found ? 'verified' : 'uncertain',
        confidence: match.confidence,
        reasoning: match.reasoning,
        details: {
          articlesChecked: articles.length,
          topMatch: match.bestArticle
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        sourceId: this.name,
        verdict: 'uncertain',
        confidence: 0,
        reasoning: `Error accessing Wikipedia: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  async isAvailable() {
    try {
      // Check if Wikipedia API is reachable
      const response = await fetch('https://en.wikipedia.org/api/rest_v1/');
      return response.ok;
    } catch {
      return false;
    }
  }

  extractKeywords(claim) {
    // Simple keyword extraction (in production, use NLP library)
    return claim
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3);
  }

  async searchWikipedia(keywords) {
    // Implement Wikipedia API search
    // This is a placeholder
    return [];
  }

  compareWithArticles(claim, articles) {
    // Implement comparison logic
    // This is a placeholder
    return {
      found: false,
      confidence: 0,
      reasoning: 'No matching articles found',
      bestArticle: null
    };
  }
}

// Register custom adapter
const factgate = new FactGate({
  adapters: [
    'contradiction-detector',
    'pattern-validator',
    new WikipediaAdapter()
  ]
});
```

### Database-backed Custom Adapter

Verify claims against your own database:

```javascript
const { Pool } = require('pg');

class DatabaseFactAdapter {
  constructor(dbConfig) {
    this.name = 'database-fact-checker';
    this.description = 'Verifies claims against internal fact database';
    this.pool = new Pool(dbConfig);
  }

  async verify(claim, context) {
    try {
      // Query facts database
      const query = `
        SELECT fact, confidence, source, metadata
        FROM verified_facts
        WHERE fact_vector <=> $1 < 0.3
        ORDER BY fact_vector <=> $1
        LIMIT 5
      `;

      const claimVector = await this.vectorize(claim);
      const result = await this.pool.query(query, [claimVector]);

      if (result.rows.length === 0) {
        return {
          sourceId: this.name,
          verdict: 'uncertain',
          confidence: 0,
          reasoning: 'No matching facts found in database',
          timestamp: new Date()
        };
      }

      // Find best match
      const bestMatch = result.rows[0];
      const similarity = this.calculateSimilarity(claim, bestMatch.fact);

      return {
        sourceId: this.name,
        verdict: similarity > 0.8 ? 'verified' : 'uncertain',
        confidence: similarity * bestMatch.confidence,
        reasoning: `Matched with database fact: "${bestMatch.fact}" (source: ${bestMatch.source})`,
        details: {
          matchedFact: bestMatch.fact,
          similarity: similarity,
          source: bestMatch.source
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Database adapter error:', error);
      return {
        sourceId: this.name,
        verdict: 'uncertain',
        confidence: 0,
        reasoning: 'Database query failed',
        timestamp: new Date()
      };
    }
  }

  async isAvailable() {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async vectorize(text) {
    // Implement text vectorization (use embedding model)
    // Placeholder: return simple hash
    return text;
  }

  calculateSimilarity(text1, text2) {
    // Implement similarity calculation
    // Placeholder: simple comparison
    return text1.toLowerCase() === text2.toLowerCase() ? 1.0 : 0.5;
  }

  async close() {
    await this.pool.end();
  }
}

// Usage
const factgate = new FactGate({
  adapters: [
    new DatabaseFactAdapter({
      host: 'localhost',
      database: 'factgate_db',
      user: 'factgate',
      password: process.env.DB_PASSWORD
    })
  ]
});
```

## Integration Patterns

### Express.js API Integration

Create a REST API for fact verification:

```javascript
const express = require('express');
const FactGate = require('factgate');

const app = express();
app.use(express.json());

const factgate = new FactGate({
  adapters: ['contradiction-detector', 'pattern-validator', 'confidence-scorer']
});

// Verify endpoint
app.post('/api/verify', async (req, res) => {
  try {
    const { claim, adapters } = req.body;

    if (!claim) {
      return res.status(400).json({ error: 'Claim is required' });
    }

    const result = await factgate.verify(claim, { adapters });

    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

// Batch verify endpoint
app.post('/api/verify/batch', async (req, res) => {
  try {
    const { claims } = req.body;

    if (!Array.isArray(claims) || claims.length === 0) {
      return res.status(400).json({ error: 'Claims array is required' });
    }

    const results = await Promise.all(
      claims.map(claim => factgate.verify(claim))
    );

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Batch verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch verification failed'
    });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  const adapters = await factgate.getAdapterStatus();

  res.json({
    status: 'ok',
    adapters: adapters
  });
});

app.listen(3000, () => {
  console.log('FactGate API listening on port 3000');
});
```

### Real-time Stream Processing

Process claims from a message queue:

```javascript
const { Kafka } = require('kafkajs');
const FactGate = require('factgate');

const kafka = new Kafka({
  clientId: 'factgate-consumer',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'fact-verification' });
const producer = kafka.producer();

const factgate = new FactGate();

async function processClaimStream() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({
    topic: 'claims-to-verify',
    fromBeginning: true
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const claim = message.value.toString();
      console.log(`Processing claim: ${claim}`);

      try {
        const result = await factgate.verify(claim);

        // Send result to output topic
        await producer.send({
          topic: 'verification-results',
          messages: [{
            key: message.key,
            value: JSON.stringify({
              claim: claim,
              result: result,
              processedAt: new Date().toISOString()
            })
          }]
        });

        console.log(`✓ Verified: ${claim} (confidence: ${result.confidence})`);
      } catch (error) {
        console.error(`✗ Error verifying claim: ${error.message}`);

        // Send error to dead letter queue
        await producer.send({
          topic: 'verification-errors',
          messages: [{
            key: message.key,
            value: JSON.stringify({
              claim: claim,
              error: error.message,
              timestamp: new Date().toISOString()
            })
          }]
        });
      }
    }
  });
}

processClaimStream().catch(console.error);
```

### ChatGPT Plugin Integration

Use FactGate as a ChatGPT plugin:

```javascript
const express = require('express');
const FactGate = require('factgate');

const app = express();
app.use(express.json());

const factgate = new FactGate();

// Plugin manifest
app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'FactGate Verifier',
    name_for_model: 'factgate',
    description_for_human: 'Verify claims and detect misinformation',
    description_for_model: 'Use this plugin to verify factual claims and detect contradictions or logical fallacies.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: 'https://your-domain.com/openapi.yaml'
    },
    logo_url: 'https://your-domain.com/logo.png',
    contact_email: 'support@your-domain.com',
    legal_info_url: 'https://your-domain.com/legal'
  });
});

// Verification endpoint for ChatGPT
app.post('/verify', async (req, res) => {
  const { claim } = req.body;

  const result = await factgate.verify(claim);

  res.json({
    verified: result.verified,
    confidence: result.confidence,
    reasoning: result.reasoning,
    issues: result.issues,
    recommendation: result.confidence > 0.7
      ? 'This claim appears to be reliable.'
      : 'This claim should be verified with additional sources.'
  });
});

app.listen(3000);
```

## Advanced Scenarios

### Confidence Threshold Configuration

Set different confidence thresholds for different use cases:

```javascript
class AdaptiveFactGate {
  constructor() {
    this.factgate = new FactGate();

    this.thresholds = {
      'medical': 0.95,      // High confidence required
      'general': 0.7,       // Moderate confidence
      'entertainment': 0.5  // Low confidence acceptable
    };
  }

  async verify(claim, category = 'general') {
    const result = await this.factgate.verify(claim);
    const threshold = this.thresholds[category] || this.thresholds.general;

    return {
      ...result,
      acceptable: result.confidence >= threshold,
      threshold: threshold,
      category: category,
      recommendation: this.getRecommendation(result.confidence, threshold)
    };
  }

  getRecommendation(confidence, threshold) {
    if (confidence >= threshold) {
      return 'ACCEPT: Confidence meets threshold';
    } else if (confidence >= threshold * 0.8) {
      return 'REVIEW: Confidence close to threshold, manual review recommended';
    } else {
      return 'REJECT: Confidence below acceptable threshold';
    }
  }
}

// Usage
const adaptiveGate = new AdaptiveFactGate();

// Medical claim requires high confidence
await adaptiveGate.verify(
  "Aspirin reduces heart attack risk by 50%",
  'medical'
);

// Entertainment claim can have lower confidence
await adaptiveGate.verify(
  "This movie was the highest-grossing film of 2023",
  'entertainment'
);
```

### Caching for Performance

Implement caching to avoid re-verifying identical claims:

```javascript
const NodeCache = require('node-cache');

class CachedFactGate {
  constructor() {
    this.factgate = new FactGate();
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour cache
      checkperiod: 600
    });
  }

  async verify(claim, options = {}) {
    const cacheKey = this.generateCacheKey(claim, options);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !options.skipCache) {
      console.log('Cache hit:', cacheKey);
      return { ...cached, fromCache: true };
    }

    // Verify and cache
    console.log('Cache miss:', cacheKey);
    const result = await this.factgate.verify(claim, options);

    this.cache.set(cacheKey, result);
    return { ...result, fromCache: false };
  }

  generateCacheKey(claim, options) {
    const normalized = claim.toLowerCase().trim();
    const adapters = (options.adapters || []).sort().join(',');
    return `${normalized}:${adapters}`;
  }

  clearCache() {
    this.cache.flushAll();
  }

  getCacheStats() {
    return this.cache.getStats();
  }
}
```

### Multi-language Support

Verify claims in different languages:

```javascript
class MultilingualFactGate {
  constructor() {
    this.factgate = new FactGate();
  }

  async verify(claim, language = 'en') {
    // Translate to English if needed
    const englishClaim = await this.translateToEnglish(claim, language);

    // Verify
    const result = await this.factgate.verify(englishClaim);

    // Translate result back
    const localizedResult = await this.localizeResult(result, language);

    return {
      ...localizedResult,
      originalClaim: claim,
      translatedClaim: englishClaim,
      language: language
    };
  }

  async translateToEnglish(text, sourceLanguage) {
    if (sourceLanguage === 'en') return text;

    // Implement translation (use translation API)
    // Placeholder: return as-is
    return text;
  }

  async localizeResult(result, targetLanguage) {
    if (targetLanguage === 'en') return result;

    // Translate reasoning and issues
    return {
      ...result,
      reasoning: await this.translateText(result.reasoning, targetLanguage),
      issues: await Promise.all(
        result.issues.map(async issue => ({
          ...issue,
          message: await this.translateText(issue.message, targetLanguage)
        }))
      )
    };
  }

  async translateText(text, targetLanguage) {
    // Implement translation
    return text;
  }
}
```

## Error Handling

### Graceful Degradation

Handle adapter failures gracefully:

```javascript
class ResilientFactGate {
  constructor() {
    this.factgate = new FactGate({
      adapters: ['contradiction-detector', 'pattern-validator', 'confidence-scorer'],
      fallbackStrategy: 'partial' // Continue even if some adapters fail
    });
  }

  async verify(claim) {
    try {
      const result = await this.factgate.verify(claim);

      // Check if any adapters failed
      if (result.failedAdapters && result.failedAdapters.length > 0) {
        console.warn('Some adapters failed:', result.failedAdapters);

        // Still return result if at least one adapter succeeded
        if (result.sources.length > 0) {
          return {
            ...result,
            partial: true,
            warning: 'Result based on partial verification'
          };
        }
      }

      return result;
    } catch (error) {
      console.error('All adapters failed:', error);

      // Return uncertain result
      return {
        verified: false,
        confidence: 0,
        reasoning: 'Unable to verify due to system error',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
```

### Timeout Handling

Prevent slow adapters from blocking verification:

```javascript
class TimeoutFactGate {
  constructor(timeout = 5000) {
    this.factgate = new FactGate();
    this.timeout = timeout;
  }

  async verify(claim) {
    return Promise.race([
      this.factgate.verify(claim),
      this.timeoutPromise()
    ]);
  }

  timeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Verification timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
  }
}

// Usage with timeout handling
const timeoutGate = new TimeoutFactGate(3000); // 3 second timeout

try {
  const result = await timeoutGate.verify(claim);
  console.log('Result:', result);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Verification took too long');
    // Use fallback strategy
  }
}
```

## See Also

- [Quick Start Guide](QUICKSTART.md) - Getting started with FactGate
- [API Reference](API.md) - Complete API documentation
- [Architecture](ARCHITECTURE.md) - System design and architecture
- [Development Guide](../DEVELOPMENT.md) - Contributing to FactGate

---

**🌏 繁體中文** / [使用範例](zh-TW/EXAMPLES.zh-TW.md)