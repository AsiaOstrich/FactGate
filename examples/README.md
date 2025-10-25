# FactGate Examples

This directory contains example implementations and usage scenarios for FactGate.

## Contents

- [Pinecone RAG Adapter](#pinecone-rag-adapter) - Connect FactGate to Pinecone vector database

## Pinecone RAG Adapter

A production-ready adapter that connects FactGate to Pinecone for semantic fact-checking using vector similarity search.

### Quick Start

#### 1. Prerequisites

```bash
# Install dependencies
npm install @pinecone-database/pinecone openai

# Set environment variables
export PINECONE_API_KEY="your-pinecone-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

#### 2. Create Pinecone Index

Go to [Pinecone Console](https://app.pinecone.io/) and create an index:

- **Index Name**: `factgate-facts`
- **Dimensions**: `1536` (for OpenAI text-embedding-3-small)
- **Metric**: `cosine`
- **Cloud**: Any available region

#### 3. Populate Index with Facts

```javascript
const PineconeRAGAdapter = require('./examples/pinecone-rag-adapter');

const adapter = new PineconeRAGAdapter({
  pineconeApiKey: process.env.PINECONE_API_KEY,
  indexName: 'factgate-facts',
  openaiApiKey: process.env.OPENAI_API_KEY
});

// Add individual fact
await adapter.addFact('Water boils at 100°C at sea level.', {
  source: 'Physics textbook',
  confidence: 1.0
});

// Batch add facts
await adapter.addFactsBatch([
  {
    text: 'Python was created by Guido van Rossum in 1991.',
    source: 'Wikipedia',
    metadata: { category: 'technology' }
  },
  {
    text: 'The Great Wall of China is NOT visible from space with the naked eye.',
    source: 'NASA',
    metadata: { category: 'science' }
  },
  {
    text: 'Marie Curie was the first woman to win a Nobel Prize.',
    source: 'Nobel Prize Official Website',
    metadata: { category: 'history' }
  }
]);
```

#### 4. Use with FactGate

```javascript
const FactGate = require('factgate');
const PineconeRAGAdapter = require('./examples/pinecone-rag-adapter');

// Initialize adapter
const ragAdapter = new PineconeRAGAdapter({
  pineconeApiKey: process.env.PINECONE_API_KEY,
  indexName: 'factgate-facts',
  openaiApiKey: process.env.OPENAI_API_KEY,
  similarityThreshold: 0.85  // Minimum similarity to consider verified
});

// Create FactGate instance with RAG
const factgate = new FactGate({
  adapters: [
    'contradiction-detector',  // Built-in
    'pattern-validator',       // Built-in
    ragAdapter                 // Remote RAG
  ]
});

// Verify claims
const result = await factgate.verify('Does water boil at 100 degrees Celsius?');
console.log(result);
```

### Configuration Options

```javascript
const adapter = new PineconeRAGAdapter({
  // Required
  pineconeApiKey: 'your-api-key',
  indexName: 'your-index-name',
  openaiApiKey: 'your-openai-key',

  // Optional
  embeddingModel: 'text-embedding-3-small',  // OpenAI embedding model
  topK: 5,                                    // Number of results to retrieve
  similarityThreshold: 0.8,                   // Minimum similarity for verification
  timeout: 5000,                              // Request timeout (ms)
  cacheMaxSize: 100                           // Max cached results
});
```

### API Reference

#### verify(claim, context)

Verify a claim against the Pinecone knowledge base.

**Parameters:**
- `claim` (string): The claim to verify
- `context` (object, optional): Additional context

**Returns:**
```javascript
{
  sourceId: 'pinecone-rag',
  verdict: 'verified' | 'uncertain' | 'contradicted',
  confidence: 0.92,  // 0-1 scale
  reasoning: 'High similarity (92.3%) with verified fact from...',
  details: {
    bestMatch: {
      fact: 'Water boils at 100°C at sea level.',
      source: 'Physics textbook',
      similarity: 0.923
    },
    allMatches: [...],
    threshold: 0.8
  },
  timestamp: '2025-10-25T10:30:00.000Z'
}
```

#### isAvailable()

Check if the Pinecone index is accessible.

**Returns:** `Promise<boolean>`

#### addFact(fact, metadata)

Add a single fact to the index.

**Parameters:**
- `fact` (string): The fact text
- `metadata` (object): Additional metadata (source, confidence, etc.)

**Returns:** `Promise<{success: boolean, error?: string}>`

#### addFactsBatch(facts)

Batch add multiple facts.

**Parameters:**
```javascript
[
  {
    text: 'Fact text',
    source: 'Source name',
    metadata: { ... }
  },
  // ...
]
```

**Returns:** `Promise<{success: boolean, count?: number, error?: string}>`

#### getStats()

Get adapter statistics.

**Returns:**
```javascript
{
  totalQueries: 42,
  cacheHits: 12,
  errors: 0,
  cacheSize: 15,
  cacheHitRate: '28.57%'
}
```

### Cost Considerations

**OpenAI Embeddings:**
- Model: `text-embedding-3-small`
- Cost: ~$0.02 per 1M tokens
- Average claim: ~20 tokens
- ~50,000 verifications per $1

**Pinecone:**
- Free tier: 1 index, 100K vectors
- Starter: $70/month for 10M vectors
- See [Pinecone Pricing](https://www.pinecone.io/pricing/)

**Cost Optimization:**
- Enable caching for repeated queries
- Use batch operations when populating
- Monitor usage via `getStats()`

### Performance

**Expected Response Times:**
- Cached query: <10ms
- Embedding generation: 100-300ms
- Pinecone query: 50-200ms
- **Total: 150-500ms**

**Optimization Tips:**
1. Use caching (enabled by default)
2. Adjust `topK` based on your needs (lower = faster)
3. Use connection pooling for high traffic
4. Consider read replicas for Pinecone

### Troubleshooting

#### "No matching facts found"
- Ensure your index is populated with facts
- Check if embedding model matches (must be same for indexing and querying)
- Verify index dimensions (1536 for text-embedding-3-small)

#### "Embedding generation failed"
- Check OpenAI API key is valid
- Verify API quota hasn't been exceeded
- Check network connectivity

#### "Index not found"
- Verify index name is correct
- Ensure index has been created in Pinecone console
- Check API key has access to the index

#### Low similarity scores
- Facts in index may be too different from queries
- Consider lowering `similarityThreshold`
- Add more diverse facts to your knowledge base
- Rephrase queries to match fact phrasing

### Alternative RAG Systems

The same adapter pattern works with other vector databases:

- **Weaviate**: See [Weaviate Adapter Example](weaviate-rag-adapter.js)
- **Qdrant**: See [Qdrant Adapter Example](qdrant-rag-adapter.js)
- **Chroma**: See [Chroma Adapter Example](chroma-rag-adapter.js)
- **Custom**: Implement `FactSourceAdapter` interface

### License

MIT

### Support

- GitHub Issues: [FactGate Issues](https://github.com/AsiaOstrich/FactGate/issues)
- Documentation: [FactGate Docs](../docs/)

---

**🌏 繁體中文** / [範例](README.zh-TW.md)