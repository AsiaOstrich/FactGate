# FactGate Examples

This directory contains example implementations and usage scenarios for FactGate.

## Contents

- [Pinecone RAG Adapter](#pinecone-rag-adapter) - Connect FactGate to Pinecone vector database
- [Custom RAG System](#custom-rag-system) - Build your own self-hosted RAG backend

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
- **Custom**: See [Custom RAG System](#custom-rag-system) below

---

## Custom RAG System

Build your own self-hosted RAG (Retrieval-Augmented Generation) backend from scratch. This gives you complete control over your fact-checking infrastructure, data, and costs.

### When to Use Custom RAG vs Managed Services

**Use Custom RAG when:**
- You need complete control over your data and infrastructure
- You want to avoid vendor lock-in
- You have strict data privacy requirements (healthcare, finance, government)
- You want to minimize ongoing costs (no monthly fees)
- You need to customize the RAG pipeline extensively
- You're processing sensitive or proprietary information

**Use Managed RAG (Pinecone, etc.) when:**
- You want faster time-to-market
- You prefer not to manage infrastructure
- You need global scalability out-of-the-box
- Your data privacy requirements allow cloud hosting
- You want professional support

### Architecture Overview

A custom RAG system consists of two parts:

1. **Backend Server** ([custom-rag-server.js](custom-rag-server.js))
   - HTTP API for search, health checks, and fact management
   - Vector database (ChromaDB, LanceDB, FAISS)
   - Embedding generation (OpenAI, local models)

2. **Client Adapter** ([custom-rag-adapter.js](custom-rag-adapter.js))
   - Implements `FactSourceAdapter` interface
   - Communicates with backend via HTTP
   - Handles caching, retries, error handling

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   FactGate      │  HTTP   │  Custom RAG      │         │  Vector Database │
│   + Adapter     ├────────►│  Backend Server  ├────────►│   (ChromaDB)     │
│                 │         │                  │         │                  │
└─────────────────┘         └──────────────────┘         └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  OpenAI API      │
                            │  (Embeddings)    │
                            └──────────────────┘
```

### Quick Start

#### 1. Install Dependencies

```bash
# Backend dependencies
npm install express chromadb openai cors body-parser

# Adapter dependencies (already installed if you have Pinecone example)
npm install axios
```

#### 2. Start ChromaDB (Vector Database)

ChromaDB is an open-source vector database. You have two options:

**Option A: Docker (Recommended)**
```bash
docker pull chromadb/chroma
docker run -p 8000:8000 chromadb/chroma
```

**Option B: Python**
```bash
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

#### 3. Configure Environment

```bash
# Required
export OPENAI_API_KEY="your-openai-api-key"

# Optional
export PORT=3000
export RAG_API_KEY="your-secret-api-key"  # For securing your backend
export CHROMA_URL="http://localhost:8000"
```

#### 4. Start RAG Backend Server

```bash
node examples/custom-rag-server.js
```

You should see:
```
✅ Custom RAG Backend running on port 3000
   Health check: http://localhost:3000/api/health
   Info: http://localhost:3000/api/info

Configuration:
   - Embedding model: text-embedding-3-small
   - ChromaDB URL: http://localhost:8000
   - Collection: factgate-facts
   - API Key auth: Enabled
```

#### 5. Populate with Facts

Create a script to add facts (e.g., `populate-facts.js`):

```javascript
const CustomRAGAdapter = require('./examples/custom-rag-adapter');

const adapter = new CustomRAGAdapter({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.RAG_API_KEY
});

async function populateFacts() {
  // Add facts in batch
  const result = await adapter.addFactsBatch([
    {
      text: 'Water boils at 100°C at sea level.',
      source: 'Physics textbook',
      metadata: { category: 'science', verified: true }
    },
    {
      text: 'Python was created by Guido van Rossum in 1991.',
      source: 'Wikipedia',
      metadata: { category: 'technology' }
    },
    {
      text: 'The Great Wall of China is NOT visible from space with the naked eye.',
      source: 'NASA',
      metadata: { category: 'science', verified: true }
    },
    {
      text: 'Marie Curie was the first woman to win a Nobel Prize.',
      source: 'Nobel Prize Official Website',
      metadata: { category: 'history' }
    },
    {
      text: 'Photosynthesis converts light energy into chemical energy.',
      source: 'Biology textbook',
      metadata: { category: 'biology', verified: true }
    }
  ]);

  console.log('Facts added:', result);
}

populateFacts();
```

Run it:
```bash
node populate-facts.js
```

#### 6. Use with FactGate

```javascript
const FactGate = require('factgate');
const CustomRAGAdapter = require('./examples/custom-rag-adapter');

// Initialize adapter
const ragAdapter = new CustomRAGAdapter({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.RAG_API_KEY,
  similarityThreshold: 0.85,
  retryAttempts: 3
});

// Create FactGate instance
const factgate = new FactGate({
  adapters: [
    'contradiction-detector',  // Built-in
    'pattern-validator',       // Built-in
    ragAdapter                 // Custom RAG
  ]
});

// Verify claims
const result = await factgate.verify('Does water boil at 100 degrees Celsius?');
console.log(result);

// Check adapter statistics
console.log(ragAdapter.getStats());
```

### Configuration Options

#### Backend Server (custom-rag-server.js)

```javascript
const server = new CustomRAGServer({
  port: 3000,                              // Server port
  openaiApiKey: 'your-openai-key',         // Required for embeddings
  ragApiKey: 'your-secret-key',            // Optional API key for auth
  chromaUrl: 'http://localhost:8000',      // ChromaDB URL
  collectionName: 'factgate-facts',        // Collection name
  embeddingModel: 'text-embedding-3-small' // OpenAI embedding model
});

await server.start();
```

#### Client Adapter (custom-rag-adapter.js)

```javascript
const adapter = new CustomRAGAdapter({
  // Required
  baseUrl: 'http://localhost:3000',        // Backend URL

  // Optional
  apiKey: 'your-secret-key',               // API key (if backend requires)
  topK: 5,                                  // Number of results to retrieve
  similarityThreshold: 0.8,                 // Minimum similarity for verification
  timeout: 5000,                            // Request timeout (ms)
  retryAttempts: 3,                         // Retry on failure
  retryDelay: 1000,                         // Delay between retries (ms)
  cacheMaxSize: 100                         // Max cached results
});
```

### API Reference

#### Backend Endpoints

The custom RAG server exposes these endpoints:

**POST /api/search**
```javascript
// Request
{
  "query": "Water boils at 100°C",
  "topK": 5,
  "context": {}
}

// Response
{
  "query": "Water boils at 100°C",
  "matches": [
    {
      "id": "fact-123",
      "text": "Water boils at 100°C at sea level.",
      "similarity": 0.95,
      "distance": 0.05,
      "source": "Physics textbook",
      "metadata": { ... }
    }
  ],
  "topK": 5,
  "timestamp": "2025-10-25T10:30:00.000Z"
}
```

**GET /api/health**
```javascript
{
  "status": "healthy",
  "factCount": 1500,
  "uptime": 3600,
  "version": "1.0.0"
}
```

**POST /api/facts**
```javascript
// Request
{
  "text": "New fact text",
  "metadata": { "source": "Wikipedia" }
}

// Response
{
  "success": true,
  "id": "fact-123456",
  "message": "Fact added successfully"
}
```

**POST /api/facts/batch**
```javascript
// Request
{
  "facts": [
    { "text": "Fact 1", "source": "Source A", "metadata": {} },
    { "text": "Fact 2", "source": "Source B", "metadata": {} }
  ]
}

// Response
{
  "success": true,
  "count": 2,
  "ids": ["fact-123", "fact-456"],
  "message": "2 facts added successfully"
}
```

**GET /api/info**
```javascript
{
  "name": "Custom RAG Backend",
  "version": "1.0.0",
  "embeddingModel": "text-embedding-3-small",
  "vectorDatabase": "ChromaDB",
  "factCount": 1500,
  "stats": { ... },
  "uptime": 3600
}
```

**GET /api/stats**
```javascript
{
  "totalSearches": 1000,
  "totalFacts": 1500,
  "uptime": 1698249600000,
  "errors": 5,
  "currentFactCount": 1500
}
```

#### Adapter Methods

Same as Pinecone adapter:

- `verify(claim, context)` - Verify a claim
- `isAvailable()` - Check backend health
- `addFact(fact, metadata)` - Add single fact
- `addFactsBatch(facts)` - Batch add facts
- `getStats()` - Get adapter statistics
- `getBackendInfo()` - Get backend information
- `clearCache()` - Clear result cache

### Cost Considerations

**OpenAI Embeddings:**
- Model: `text-embedding-3-small`
- Cost: ~$0.02 per 1M tokens
- Average claim: ~20 tokens
- ~50,000 verifications per $1

**ChromaDB:**
- **Free and open-source**
- Self-hosted, no monthly fees
- Scales to millions of vectors on commodity hardware

**Infrastructure Costs:**
- **Development**: Free (local laptop/desktop)
- **Production**: ~$20-50/month (small cloud VM + storage)
  - Example: DigitalOcean Droplet ($20/month) + Block Storage ($10/month)
  - Example: AWS EC2 t3.medium (~$30/month) + EBS ($10/month)

**Cost Comparison (1M verifications/month):**
- **Managed (Pinecone)**: ~$70/month (starter) + $0.20 (embeddings) = **$70.20**
- **Custom RAG**: ~$30/month (infrastructure) + $0.20 (embeddings) = **$30.20**
- **Savings**: ~$40/month or **57% less**

### Performance

**Expected Response Times:**
- Cached query: <10ms
- Backend search (including embedding): 150-500ms
- With retry logic: up to 1500ms (on failures)

**Optimization Tips:**
1. **Enable caching** (built-in, automatic)
2. **Deploy backend close to adapter** (reduce network latency)
3. **Use local embedding models** (eliminates OpenAI API calls)
   - Example: `sentence-transformers/all-MiniLM-L6-v2`
   - Faster, free, private, but slightly lower quality
4. **Tune ChromaDB** for your dataset size
5. **Use connection pooling** for high traffic
6. **Monitor with `/api/stats`** endpoint

### Alternative Vector Databases

You can replace ChromaDB with other open-source vector databases:

#### LanceDB

```bash
npm install vectordb
```

Pros: Serverless, embedded, very fast
Cons: Newer, smaller community

#### FAISS (Facebook AI Similarity Search)

```bash
npm install faiss-node
```

Pros: Very fast, battle-tested, scales to billions
Cons: No native Node.js support, requires Python bindings

#### Qdrant (Open Source)

```bash
docker run -p 6333:6333 qdrant/qdrant
```

Pros: Production-ready, excellent filtering, Rust-based
Cons: More complex than ChromaDB

#### Milvus

```bash
docker-compose up -d  # See Milvus docs
```

Pros: Enterprise-grade, highly scalable
Cons: More complex setup, heavier resource usage

### Using Local Embedding Models

To eliminate OpenAI API calls and costs, use local embedding models:

```javascript
// Install Transformers.js
npm install @xenova/transformers

// In custom-rag-server.js, replace OpenAI embedding generation:
const { pipeline } = require('@xenova/transformers');

class CustomRAGServer {
  async initialize() {
    // Load local embedding model
    this.embedder = await pipeline('feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }

  async generateEmbedding(text) {
    const output = await this.embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  }
}
```

**Trade-offs:**
- Pros: Free, private, faster (no API calls), works offline
- Cons: Slightly lower quality than OpenAI models, requires more CPU/memory

### Deployment

#### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY examples/custom-rag-server.js ./
COPY examples/custom-rag-adapter.js ./

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "custom-rag-server.js"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  chromadb:
    image: chromadb/chroma
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/chroma

  rag-backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - RAG_API_KEY=${RAG_API_KEY}
      - CHROMA_URL=http://chromadb:8000
    depends_on:
      - chromadb

volumes:
  chroma-data:
```

Deploy:
```bash
docker-compose up -d
```

#### Cloud Deployment

**DigitalOcean / Linode / Vultr:**
```bash
# 1. Create a Droplet/Instance (Ubuntu 22.04, 2GB RAM)
# 2. SSH into server
ssh root@your-server-ip

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. Clone your repo (or upload docker-compose.yml)
git clone your-repo
cd your-repo

# 5. Start services
docker-compose up -d

# 6. Check health
curl http://localhost:3000/api/health
```

**AWS / GCP / Azure:**
- Deploy on EC2 / Compute Engine / Azure VM
- Use managed container services (ECS, Cloud Run, Container Instances)
- Consider serverless options (Lambda + API Gateway + managed ChromaDB alternative)

### Security Considerations

1. **API Key Authentication**
   ```javascript
   // Backend
   const server = new CustomRAGServer({
     ragApiKey: process.env.RAG_API_KEY  // Required for auth
   });

   // Adapter
   const adapter = new CustomRAGAdapter({
     apiKey: process.env.RAG_API_KEY
   });
   ```

2. **HTTPS in Production**
   - Use reverse proxy (nginx, Caddy)
   - Obtain SSL certificate (Let's Encrypt)
   - Never send API keys over HTTP

3. **Rate Limiting**
   ```javascript
   npm install express-rate-limit

   const rateLimit = require('express-rate-limit');

   app.use(rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   }));
   ```

4. **Input Validation**
   - Validate all input parameters
   - Sanitize user input
   - Implement request size limits

### Troubleshooting

#### "Backend is not available"
- Check if ChromaDB is running: `curl http://localhost:8000/api/v1/heartbeat`
- Check if backend server is running: `curl http://localhost:3000/api/health`
- Verify firewall rules allow connections
- Check Docker container logs: `docker logs <container-id>`

#### "Connection refused"
- Backend URL incorrect in adapter config
- Backend not listening on the right port
- Network firewall blocking requests
- Use `0.0.0.0` instead of `localhost` for Docker

#### "Embedding generation failed"
- Invalid or missing OpenAI API key
- API quota exceeded
- Network connectivity issues
- Consider switching to local embeddings

#### "No matching facts found"
- Database is empty, populate with facts first
- Embedding model mismatch between indexing and querying
- Query is too different from stored facts

#### High response times
- Backend server overloaded (scale up resources)
- ChromaDB needs tuning (check documentation)
- Network latency (deploy backend closer to adapter)
- Enable caching in adapter

### Monitoring

Add monitoring to track system health:

```javascript
// In custom-rag-server.js
const prometheus = require('prom-client');

const searchCounter = new prometheus.Counter({
  name: 'rag_searches_total',
  help: 'Total number of searches'
});

const searchDuration = new prometheus.Histogram({
  name: 'rag_search_duration_seconds',
  help: 'Search duration in seconds'
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

Monitor with Prometheus + Grafana, or use built-in `/api/stats` endpoint.

### Comparison: Custom vs Managed RAG

| Feature | Custom RAG | Pinecone | Weaviate Cloud |
|---------|-----------|----------|----------------|
| **Setup Time** | ~2 hours | ~30 minutes | ~30 minutes |
| **Monthly Cost** | $30-50 | $70+ | $25+ |
| **Data Control** | Complete | Limited | Limited |
| **Scalability** | Manual | Automatic | Automatic |
| **Privacy** | High | Medium | Medium |
| **Maintenance** | You manage | Managed | Managed |
| **Customization** | Unlimited | Limited | Medium |
| **Support** | Community | Professional | Professional |

**Recommendation:**
- **Prototype/MVP**: Use managed service (faster to start)
- **Production (privacy-sensitive)**: Use custom RAG
- **Production (scale)**: Depends on team size and expertise

### License

MIT

### Support

- GitHub Issues: [FactGate Issues](https://github.com/AsiaOstrich/FactGate/issues)
- Documentation: [FactGate Docs](../docs/)

---

**🌏 繁體中文** / [範例](README.zh-TW.md)