/**
 * Custom RAG Adapter for FactGate
 *
 * This adapter connects FactGate to a self-hosted RAG system via HTTP API.
 * Unlike managed services (Pinecone, Weaviate), this adapter works with
 * custom-built RAG backends that you control completely.
 *
 * Prerequisites:
 * 1. A running RAG backend server (see custom-rag-server.js)
 * 2. Backend must expose: /api/search, /api/health endpoints
 *
 * Installation:
 * npm install axios
 *
 * Usage:
 * const adapter = new CustomRAGAdapter({
 *   baseUrl: 'http://localhost:3000',
 *   apiKey: process.env.RAG_API_KEY  // Optional
 * });
 */

const axios = require('axios');

class CustomRAGAdapter {
  constructor(config) {
    this.name = 'custom-rag';
    this.description = 'Verifies claims using self-hosted RAG system with semantic search';

    // Validate configuration
    if (!config.baseUrl) {
      throw new Error('RAG backend base URL is required');
    }

    // Configuration
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey: config.apiKey,
      topK: config.topK || 5,
      similarityThreshold: config.similarityThreshold || 0.8,
      timeout: config.timeout || 5000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000
    };

    // HTTP client
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    // Statistics
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      errors: 0,
      retries: 0,
      avgResponseTime: 0
    };

    // Simple cache
    this.cache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 100;
  }

  /**
   * Main verification method - implements FactSourceAdapter interface
   */
  async verify(claim, context) {
    this.stats.totalQueries++;
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(claim);
      if (this.cache.has(cacheKey)) {
        this.stats.cacheHits++;
        return this.cache.get(cacheKey);
      }

      // Call RAG backend with retry logic
      const searchResult = await this.searchWithRetry(claim, context);

      // Analyze results
      const result = this.analyzeResults(claim, searchResult);

      // Cache the result
      this.cacheResult(cacheKey, result);

      // Update statistics
      this.updateResponseTime(Date.now() - startTime);

      return result;

    } catch (error) {
      this.stats.errors++;
      console.error(`[${this.name}] Verification error:`, error.message);

      return {
        sourceId: this.name,
        verdict: 'uncertain',
        confidence: 0,
        reasoning: `RAG system error: ${error.message}`,
        details: {
          error: error.message,
          endpoint: this.config.baseUrl
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Search RAG backend with retry logic
   */
  async searchWithRetry(claim, context, attempt = 1) {
    try {
      const response = await this.client.post('/api/search', {
        query: claim,
        topK: this.config.topK,
        context: context
      });

      return response.data;

    } catch (error) {
      // Retry on network errors or 5xx server errors
      if (attempt < this.config.retryAttempts && this.isRetryableError(error)) {
        this.stats.retries++;
        console.warn(`[${this.name}] Retry ${attempt}/${this.config.retryAttempts}:`, error.message);

        await this.sleep(this.config.retryDelay * attempt);
        return this.searchWithRetry(claim, context, attempt + 1);
      }

      throw new Error(`Backend search failed: ${error.message}`);
    }
  }

  /**
   * Check if error should trigger retry
   */
  isRetryableError(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }
    if (error.response && error.response.status >= 500) {
      return true;
    }
    return false;
  }

  /**
   * Analyze search results from backend
   */
  analyzeResults(claim, searchResult) {
    // Handle empty results
    if (!searchResult || !searchResult.matches || searchResult.matches.length === 0) {
      return {
        sourceId: this.name,
        verdict: 'uncertain',
        confidence: 0,
        reasoning: 'No matching facts found in knowledge base',
        details: {
          queriedTopK: this.config.topK,
          matchesFound: 0
        },
        timestamp: new Date()
      };
    }

    // Get best match
    const bestMatch = searchResult.matches[0];
    const similarity = bestMatch.similarity || bestMatch.score || 0;

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
    const reasoning = this.buildReasoning(claim, searchResult.matches, similarity);

    return {
      sourceId: this.name,
      verdict: verdict,
      confidence: similarity,
      reasoning: reasoning,
      details: {
        bestMatch: {
          fact: bestMatch.text || bestMatch.fact || 'N/A',
          source: bestMatch.source || bestMatch.metadata?.source,
          similarity: similarity
        },
        allMatches: searchResult.matches.map(m => ({
          fact: m.text || m.fact || 'N/A',
          similarity: m.similarity || m.score,
          source: m.source || m.metadata?.source
        })),
        threshold: this.config.similarityThreshold,
        backend: this.config.baseUrl
      },
      timestamp: new Date()
    };
  }

  /**
   * Build human-readable reasoning
   */
  buildReasoning(claim, matches, topSimilarity) {
    const factText = matches[0].text || matches[0].fact || 'a known fact';
    const source = matches[0].source || matches[0].metadata?.source || 'knowledge base';

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
      const response = await this.client.get('/api/health', {
        timeout: 3000 // Shorter timeout for health check
      });

      return response.data.status === 'healthy' && response.data.factCount > 0;

    } catch (error) {
      console.error(`[${this.name}] Health check failed:`, error.message);
      return false;
    }
  }

  /**
   * Statistics management
   */
  updateResponseTime(time) {
    const total = this.stats.avgResponseTime * (this.stats.totalQueries - 1) + time;
    this.stats.avgResponseTime = Math.round(total / this.stats.totalQueries);
  }

  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.totalQueries > 0
        ? (this.stats.cacheHits / this.stats.totalQueries * 100).toFixed(2) + '%'
        : 'N/A',
      backend: this.config.baseUrl
    };
  }

  /**
   * Utility: Add fact to backend
   * (Not part of FactSourceAdapter interface, but useful for setup)
   */
  async addFact(fact, metadata = {}) {
    try {
      const response = await this.client.post('/api/facts', {
        text: fact,
        metadata: metadata
      });

      return { success: true, id: response.data.id };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Utility: Batch add facts
   */
  async addFactsBatch(facts) {
    try {
      const response = await this.client.post('/api/facts/batch', {
        facts: facts
      });

      return {
        success: true,
        count: response.data.count,
        ids: response.data.ids
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Utility: Get backend info
   */
  async getBackendInfo() {
    try {
      const response = await this.client.get('/api/info');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get backend info: ${error.message}`);
    }
  }

  /**
   * Helper: Sleep utility for retry logic
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export
module.exports = CustomRAGAdapter;

// Example usage
if (require.main === module) {
  (async () => {
    // Example configuration
    const adapter = new CustomRAGAdapter({
      baseUrl: process.env.RAG_BACKEND_URL || 'http://localhost:3000',
      apiKey: process.env.RAG_API_KEY,
      similarityThreshold: 0.85,
      retryAttempts: 3
    });

    // Check if available
    console.log('Checking backend availability...');
    const available = await adapter.isAvailable();
    console.log('Backend available:', available);

    if (available) {
      // Get backend info
      try {
        const info = await adapter.getBackendInfo();
        console.log('Backend info:', info);
      } catch (error) {
        console.log('Could not get backend info:', error.message);
      }

      // Example verification
      console.log('\nVerifying claim...');
      const result = await adapter.verify('Water boils at 100°C at sea level.');
      console.log('Verification result:', JSON.stringify(result, null, 2));

      // Show statistics
      console.log('\nAdapter stats:', adapter.getStats());
    } else {
      console.log('Backend is not available. Please start the RAG server first.');
      console.log('See: examples/custom-rag-server.js');
    }
  })();
}
