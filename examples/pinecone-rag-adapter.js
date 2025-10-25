/**
 * Pinecone RAG Adapter for FactGate
 *
 * This adapter connects FactGate to Pinecone vector database for semantic fact-checking.
 *
 * Prerequisites:
 * 1. Pinecone account and API key
 * 2. Created index in Pinecone
 * 3. Populated index with fact embeddings
 *
 * Installation:
 * npm install @pinecone-database/pinecone openai
 *
 * Usage:
 * const adapter = new PineconeRAGAdapter({
 *   pineconeApiKey: process.env.PINECONE_API_KEY,
 *   indexName: 'factgate-facts',
 *   openaiApiKey: process.env.OPENAI_API_KEY
 * });
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

class PineconeRAGAdapter {
  constructor(config) {
    this.name = 'pinecone-rag';
    this.description = 'Verifies claims using Pinecone vector database with semantic search';

    // Validate configuration
    if (!config.pineconeApiKey) {
      throw new Error('Pinecone API key is required');
    }
    if (!config.indexName) {
      throw new Error('Pinecone index name is required');
    }
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key is required for embeddings');
    }

    // Initialize Pinecone client
    this.pinecone = new Pinecone({
      apiKey: config.pineconeApiKey
    });

    this.indexName = config.indexName;
    this.index = null; // Lazy initialization

    // Initialize OpenAI for embeddings
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });

    // Configuration
    this.config = {
      embeddingModel: config.embeddingModel || 'text-embedding-3-small',
      topK: config.topK || 5,
      similarityThreshold: config.similarityThreshold || 0.8,
      timeout: config.timeout || 5000
    };

    // Statistics
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      errors: 0
    };

    // Simple cache
    this.cache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 100;
  }

  /**
   * Lazy initialize Pinecone index
   */
  async getIndex() {
    if (!this.index) {
      this.index = this.pinecone.index(this.indexName);
    }
    return this.index;
  }

  /**
   * Main verification method - implements FactSourceAdapter interface
   */
  async verify(claim, context) {
    this.stats.totalQueries++;

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(claim);
      if (this.cache.has(cacheKey)) {
        this.stats.cacheHits++;
        return this.cache.get(cacheKey);
      }

      // 1. Generate embedding for the claim
      const embedding = await this.generateEmbedding(claim);

      // 2. Query Pinecone for similar facts
      const index = await this.getIndex();
      const queryResponse = await index.query({
        vector: embedding,
        topK: this.config.topK,
        includeMetadata: true
      });

      // 3. Analyze results
      const result = this.analyzeResults(claim, queryResponse);

      // 4. Cache the result
      this.cacheResult(cacheKey, result);

      return result;

    } catch (error) {
      this.stats.errors++;
      console.error(`[${this.name}] Verification error:`, error.message);

      return {
        sourceId: this.name,
        verdict: 'uncertain',
        confidence: 0,
        reasoning: `RAG system error: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate embedding using OpenAI API
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
   * Analyze Pinecone query results
   */
  analyzeResults(claim, queryResponse) {
    // No matches found
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return {
        sourceId: this.name,
        verdict: 'uncertain',
        confidence: 0,
        reasoning: 'No matching facts found in knowledge base',
        details: {
          queriedVectors: this.config.topK,
          matchesFound: 0
        },
        timestamp: new Date()
      };
    }

    // Get best match
    const bestMatch = queryResponse.matches[0];
    const similarity = bestMatch.score;

    // Determine verdict based on similarity threshold
    let verdict;
    if (similarity >= this.config.similarityThreshold) {
      verdict = 'verified';
    } else if (similarity >= this.config.similarityThreshold * 0.6) {
      verdict = 'uncertain';
    } else {
      verdict = 'uncertain';
    }

    // Build reasoning
    const reasoning = this.buildReasoning(claim, queryResponse.matches, similarity);

    return {
      sourceId: this.name,
      verdict: verdict,
      confidence: similarity,
      reasoning: reasoning,
      details: {
        bestMatch: {
          fact: bestMatch.metadata?.fact || bestMatch.metadata?.text || 'N/A',
          source: bestMatch.metadata?.source,
          similarity: similarity
        },
        allMatches: queryResponse.matches.map(m => ({
          fact: m.metadata?.fact || m.metadata?.text || 'N/A',
          similarity: m.score,
          source: m.metadata?.source
        })),
        threshold: this.config.similarityThreshold
      },
      timestamp: new Date()
    };
  }

  /**
   * Build human-readable reasoning
   */
  buildReasoning(claim, matches, topSimilarity) {
    const factText = matches[0].metadata?.fact || matches[0].metadata?.text || 'a known fact';
    const source = matches[0].metadata?.source || 'knowledge base';

    if (topSimilarity >= this.config.similarityThreshold) {
      return `High similarity (${(topSimilarity * 100).toFixed(1)}%) with verified fact from ${source}: "${factText}"`;
    } else if (topSimilarity >= this.config.similarityThreshold * 0.6) {
      return `Moderate similarity (${(topSimilarity * 100).toFixed(1)}%) with known facts. Found ${matches.length} potentially relevant facts, but confidence is below threshold.`;
    } else {
      return `Low similarity (${(topSimilarity * 100).toFixed(1)}%) with known facts. Claim may be novel or requires verification from additional sources.`;
    }
  }

  /**
   * Cache management
   */
  getCacheKey(claim) {
    return claim.toLowerCase().trim();
  }

  cacheResult(key, result) {
    // Simple LRU: remove oldest if cache is full
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Health check - implements FactSourceAdapter interface
   */
  async isAvailable() {
    try {
      const index = await this.getIndex();
      const stats = await index.describeIndexStats();
      return stats.totalRecordCount > 0;
    } catch (error) {
      console.error(`[${this.name}] Health check failed:`, error.message);
      return false;
    }
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.totalQueries > 0
        ? (this.stats.cacheHits / this.stats.totalQueries * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * Utility: Add fact to Pinecone index
   * (Not part of FactSourceAdapter interface, but useful for setup)
   */
  async addFact(fact, metadata = {}) {
    try {
      const embedding = await this.generateEmbedding(fact);
      const index = await this.getIndex();

      await index.upsert([{
        id: metadata.id || `fact-${Date.now()}`,
        values: embedding,
        metadata: {
          fact: fact,
          ...metadata,
          addedAt: new Date().toISOString()
        }
      }]);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Utility: Batch add facts
   */
  async addFactsBatch(facts) {
    try {
      const embeddings = await Promise.all(
        facts.map(f => this.generateEmbedding(f.text))
      );

      const index = await this.getIndex();
      const vectors = facts.map((f, i) => ({
        id: f.id || `fact-${Date.now()}-${i}`,
        values: embeddings[i],
        metadata: {
          fact: f.text,
          source: f.source,
          ...f.metadata,
          addedAt: new Date().toISOString()
        }
      }));

      // Pinecone recommends batches of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
      }

      return { success: true, count: facts.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export
module.exports = PineconeRAGAdapter;

// Example usage
if (require.main === module) {
  (async () => {
    // Example configuration
    const adapter = new PineconeRAGAdapter({
      pineconeApiKey: process.env.PINECONE_API_KEY,
      indexName: 'factgate-facts',
      openaiApiKey: process.env.OPENAI_API_KEY,
      similarityThreshold: 0.85
    });

    // Check if available
    const available = await adapter.isAvailable();
    console.log('Adapter available:', available);

    if (available) {
      // Example verification
      const result = await adapter.verify('Water boils at 100°C at sea level.');
      console.log('Verification result:', JSON.stringify(result, null, 2));

      // Show statistics
      console.log('Adapter stats:', adapter.getStats());
    }
  })();
}
