/**
 * Custom RAG Backend Server for FactGate
 *
 * A complete self-hosted RAG backend using:
 * - Express.js for HTTP API
 * - Chroma (chromadb) for vector database
 * - OpenAI for embeddings
 *
 * This demonstrates how to build your own RAG system from scratch
 * that integrates with FactGate via custom-rag-adapter.js
 *
 * Installation:
 * npm install express chromadb openai cors body-parser
 *
 * Usage:
 * node examples/custom-rag-server.js
 *
 * Environment Variables:
 * - PORT: Server port (default: 3000)
 * - OPENAI_API_KEY: OpenAI API key for embeddings
 * - RAG_API_KEY: Optional API key for authentication
 * - CHROMA_URL: Chroma server URL (default: http://localhost:8000)
 */

const express = require('express');
const cors = require('cors');
const { ChromaClient, OpenAIEmbeddingFunction } = require('chromadb');
const OpenAI = require('openai');

class CustomRAGServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || process.env.PORT || 3000,
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      ragApiKey: config.ragApiKey || process.env.RAG_API_KEY,
      chromaUrl: config.chromaUrl || process.env.CHROMA_URL || 'http://localhost:8000',
      collectionName: config.collectionName || 'factgate-facts',
      embeddingModel: config.embeddingModel || 'text-embedding-3-small'
    };

    // Validate configuration
    if (!this.config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    // Initialize Express
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    // Initialize clients (will be done in start())
    this.chroma = null;
    this.collection = null;
    this.openai = null;

    // Statistics
    this.stats = {
      totalSearches: 0,
      totalFacts: 0,
      uptime: Date.now(),
      errors: 0
    };
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

    // API key authentication middleware
    if (this.config.ragApiKey) {
      this.app.use((req, res, next) => {
        // Skip auth for health check
        if (req.path === '/api/health') {
          return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${this.config.ragApiKey}`) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });
    }

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/api/health', async (req, res) => {
      try {
        const factCount = await this.getFactCount();
        res.json({
          status: 'healthy',
          factCount: factCount,
          uptime: Math.floor((Date.now() - this.stats.uptime) / 1000),
          version: '1.0.0'
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    // Get server info
    this.app.get('/api/info', async (req, res) => {
      try {
        const factCount = await this.getFactCount();
        res.json({
          name: 'Custom RAG Backend',
          version: '1.0.0',
          embeddingModel: this.config.embeddingModel,
          vectorDatabase: 'ChromaDB',
          factCount: factCount,
          stats: this.stats,
          uptime: Math.floor((Date.now() - this.stats.uptime) / 1000)
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Search for similar facts
    this.app.post('/api/search', async (req, res) => {
      try {
        const { query, topK = 5, context } = req.body;

        if (!query) {
          return res.status(400).json({ error: 'Query is required' });
        }

        this.stats.totalSearches++;

        // Generate embedding for query
        const embedding = await this.generateEmbedding(query);

        // Query ChromaDB
        const results = await this.collection.query({
          queryEmbeddings: [embedding],
          nResults: topK
        });

        // Format results
        const matches = this.formatSearchResults(results);

        res.json({
          query: query,
          matches: matches,
          topK: topK,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        this.stats.errors++;
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Add single fact
    this.app.post('/api/facts', async (req, res) => {
      try {
        const { text, metadata = {} } = req.body;

        if (!text) {
          return res.status(400).json({ error: 'Fact text is required' });
        }

        const id = await this.addFact(text, metadata);

        this.stats.totalFacts++;

        res.json({
          success: true,
          id: id,
          message: 'Fact added successfully'
        });

      } catch (error) {
        this.stats.errors++;
        console.error('Add fact error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Add facts in batch
    this.app.post('/api/facts/batch', async (req, res) => {
      try {
        const { facts } = req.body;

        if (!facts || !Array.isArray(facts)) {
          return res.status(400).json({ error: 'Facts array is required' });
        }

        const ids = await this.addFactsBatch(facts);

        this.stats.totalFacts += facts.length;

        res.json({
          success: true,
          count: facts.length,
          ids: ids,
          message: `${facts.length} facts added successfully`
        });

      } catch (error) {
        this.stats.errors++;
        console.error('Batch add error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Delete fact
    this.app.delete('/api/facts/:id', async (req, res) => {
      try {
        const { id } = req.params;

        await this.collection.delete({
          ids: [id]
        });

        res.json({
          success: true,
          message: 'Fact deleted successfully'
        });

      } catch (error) {
        this.stats.errors++;
        console.error('Delete fact error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get statistics
    this.app.get('/api/stats', async (req, res) => {
      try {
        const factCount = await this.getFactCount();
        res.json({
          ...this.stats,
          currentFactCount: factCount,
          uptime: Math.floor((Date.now() - this.stats.uptime) / 1000)
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Custom RAG Backend',
        version: '1.0.0',
        endpoints: {
          health: 'GET /api/health',
          info: 'GET /api/info',
          search: 'POST /api/search',
          addFact: 'POST /api/facts',
          addBatch: 'POST /api/facts/batch',
          deleteFact: 'DELETE /api/facts/:id',
          stats: 'GET /api/stats'
        }
      });
    });
  }

  /**
   * Generate embedding using OpenAI
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: text
      });

      return response.data[0].embedding;

    } catch (error) {
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Format ChromaDB search results
   */
  formatSearchResults(results) {
    if (!results.documents || results.documents.length === 0) {
      return [];
    }

    const matches = [];
    const documents = results.documents[0];
    const distances = results.distances[0];
    const metadatas = results.metadatas[0];
    const ids = results.ids[0];

    for (let i = 0; i < documents.length; i++) {
      // Convert distance to similarity (ChromaDB uses L2 distance)
      // Similarity = 1 / (1 + distance)
      const similarity = 1 / (1 + distances[i]);

      matches.push({
        id: ids[i],
        text: documents[i],
        similarity: similarity,
        distance: distances[i],
        metadata: metadatas[i] || {},
        source: metadatas[i]?.source || 'unknown'
      });
    }

    return matches;
  }

  /**
   * Add single fact to database
   */
  async addFact(text, metadata = {}) {
    const id = `fact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const embedding = await this.generateEmbedding(text);

    await this.collection.add({
      ids: [id],
      embeddings: [embedding],
      documents: [text],
      metadatas: [{
        ...metadata,
        addedAt: new Date().toISOString()
      }]
    });

    return id;
  }

  /**
   * Add multiple facts in batch
   */
  async addFactsBatch(facts) {
    const ids = [];
    const embeddings = [];
    const documents = [];
    const metadatas = [];

    // Generate embeddings for all facts
    for (const fact of facts) {
      const id = `fact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const embedding = await this.generateEmbedding(fact.text);

      ids.push(id);
      embeddings.push(embedding);
      documents.push(fact.text);
      metadatas.push({
        ...(fact.metadata || {}),
        source: fact.source,
        addedAt: new Date().toISOString()
      });
    }

    // Add all at once
    await this.collection.add({
      ids: ids,
      embeddings: embeddings,
      documents: documents,
      metadatas: metadatas
    });

    return ids;
  }

  /**
   * Get fact count from database
   */
  async getFactCount() {
    try {
      const result = await this.collection.count();
      return result;
    } catch (error) {
      console.error('Error getting fact count:', error);
      return 0;
    }
  }

  /**
   * Initialize database connections
   */
  async initialize() {
    console.log('Initializing RAG backend...');

    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey
    });

    // Initialize ChromaDB client
    this.chroma = new ChromaClient({
      path: this.config.chromaUrl
    });

    // Create or get collection
    try {
      this.collection = await this.chroma.getOrCreateCollection({
        name: this.config.collectionName,
        metadata: { 'hnsw:space': 'cosine' }
      });

      const count = await this.getFactCount();
      console.log(`Collection '${this.config.collectionName}' ready with ${count} facts`);

    } catch (error) {
      console.error('Failed to initialize collection:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Initialize database
      await this.initialize();

      // Start Express server
      this.server = this.app.listen(this.config.port, () => {
        console.log(`\n✅ Custom RAG Backend running on port ${this.config.port}`);
        console.log(`   Health check: http://localhost:${this.config.port}/api/health`);
        console.log(`   Info: http://localhost:${this.config.port}/api/info\n`);
        console.log('Configuration:');
        console.log(`   - Embedding model: ${this.config.embeddingModel}`);
        console.log(`   - ChromaDB URL: ${this.config.chromaUrl}`);
        console.log(`   - Collection: ${this.config.collectionName}`);
        console.log(`   - API Key auth: ${this.config.ragApiKey ? 'Enabled' : 'Disabled'}\n`);
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      this.server.close();
      console.log('Server stopped');
    }
  }
}

// Export for use as module
module.exports = CustomRAGServer;

// Run as standalone server if executed directly
if (require.main === module) {
  const server = new CustomRAGServer();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Start server
  server.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
