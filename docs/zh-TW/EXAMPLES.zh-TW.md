# 使用範例

> **🚧 開發狀態**：這些範例基於設計規格。某些功能可能尚未完全實作。

本文件提供在各種場景中使用 FactGate 的全面範例。

## 目錄

- [基本驗證](#基本驗證)
- [自定義適配器](#自定義適配器)
- [整合模式](#整合模式)
- [進階場景](#進階場景)
- [錯誤處理](#錯誤處理)

## 基本驗證

### 簡單聲明驗證

使用所有內建驗證器驗證單一聲明：

```javascript
const FactGate = require('factgate');

const factgate = new FactGate();

async function verifyClaim() {
  const result = await factgate.verify("水在標準壓力下 0°C 結冰。");

  console.log('已驗證:', result.verified);
  console.log('信心度:', result.confidence);
  console.log('推理:', result.reasoning);
}

verifyClaim();
```

**預期輸出：**
```
已驗證: true
信心度: 0.95
推理: 聲明具體、可驗證且不包含矛盾。符合已知物理常數。
```

### 檢測矛盾

使用矛盾檢測器識別邏輯不一致：

```javascript
async function detectContradiction() {
  const claim = "太陽從西邊升起，每天從東邊落下。";

  const result = await factgate.verify(claim, {
    adapters: ['contradiction-detector']
  });

  if (!result.verified) {
    console.log('發現矛盾！');
    result.issues.forEach(issue => {
      console.log(`- ${issue.type}: ${issue.message}`);
    });
  }
}
```

**預期輸出：**
```
發現矛盾！
- contradiction: 方向聲明與已知天文事實矛盾
- severity: high
```

### 模式驗證

檢查邏輯謬誤和推理模式：

```javascript
async function validatePattern() {
  const claims = [
    "所有天鵝都是白色的，因此黑天鵝不存在。",
    "冰淇淋銷量和溺水事件的相關性意味著冰淇淋導致溺水。",
    "如果我們不禁止 X，那麼 Y 會發生，最終 Z 會毀滅一切。"
  ];

  for (const claim of claims) {
    const result = await factgate.verify(claim, {
      adapters: ['pattern-validator']
    });

    console.log(`\n聲明: ${claim}`);
    console.log(`有效: ${result.verified}`);
    console.log(`問題: ${result.issues.map(i => i.type).join(', ')}`);
  }
}
```

**預期輸出：**
```
聲明: 所有天鵝都是白色的，因此黑天鵝不存在。
有效: false
問題: hasty-generalization, invalid-conclusion

聲明: 冰淇淋銷量和溺水事件的相關性意味著冰淇淋導致溺水。
有效: false
問題: correlation-causation-fallacy

聲明: 如果我們不禁止 X，那麼 Y 會發生，最終 Z 會毀滅一切。
有效: false
問題: slippery-slope-fallacy
```

## 自定義適配器

### 創建簡單的自定義適配器

實作自定義適配器以根據您自己的資料來源進行驗證：

```javascript
class WikipediaAdapter {
  constructor() {
    this.name = 'wikipedia-adapter';
    this.description = '根據維基百科文章驗證聲明';
  }

  async verify(claim, context) {
    try {
      // 從聲明中提取關鍵詞
      const keywords = this.extractKeywords(claim);

      // 搜尋維基百科
      const articles = await this.searchWikipedia(keywords);

      // 將聲明與文章內容比較
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
        reasoning: `存取維基百科時發生錯誤: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  async isAvailable() {
    try {
      const response = await fetch('https://en.wikipedia.org/api/rest_v1/');
      return response.ok;
    } catch {
      return false;
    }
  }

  extractKeywords(claim) {
    // 簡單的關鍵詞提取（生產環境中使用 NLP 函式庫）
    return claim
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3);
  }

  async searchWikipedia(keywords) {
    // 實作維基百科 API 搜尋
    return [];
  }

  compareWithArticles(claim, articles) {
    // 實作比較邏輯
    return {
      found: false,
      confidence: 0,
      reasoning: '未找到匹配的文章',
      bestArticle: null
    };
  }
}

// 註冊自定義適配器
const factgate = new FactGate({
  adapters: [
    'contradiction-detector',
    'pattern-validator',
    new WikipediaAdapter()
  ]
});
```

### 資料庫支援的自定義適配器

根據您自己的資料庫驗證聲明：

```javascript
const { Pool } = require('pg');

class DatabaseFactAdapter {
  constructor(dbConfig) {
    this.name = 'database-fact-checker';
    this.description = '根據內部事實資料庫驗證聲明';
    this.pool = new Pool(dbConfig);
  }

  async verify(claim, context) {
    try {
      // 查詢事實資料庫
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
          reasoning: '資料庫中未找到匹配的事實',
          timestamp: new Date()
        };
      }

      // 尋找最佳匹配
      const bestMatch = result.rows[0];
      const similarity = this.calculateSimilarity(claim, bestMatch.fact);

      return {
        sourceId: this.name,
        verdict: similarity > 0.8 ? 'verified' : 'uncertain',
        confidence: similarity * bestMatch.confidence,
        reasoning: `與資料庫事實匹配: "${bestMatch.fact}" (來源: ${bestMatch.source})`,
        details: {
          matchedFact: bestMatch.fact,
          similarity: similarity,
          source: bestMatch.source
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('資料庫適配器錯誤:', error);
      return {
        sourceId: this.name,
        verdict: 'uncertain',
        confidence: 0,
        reasoning: '資料庫查詢失敗',
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
    // 實作文字向量化（使用嵌入模型）
    return text;
  }

  calculateSimilarity(text1, text2) {
    // 實作相似度計算
    return text1.toLowerCase() === text2.toLowerCase() ? 1.0 : 0.5;
  }

  async close() {
    await this.pool.end();
  }
}
```

## 整合模式

### Express.js API 整合

創建用於事實驗證的 REST API：

```javascript
const express = require('express');
const FactGate = require('factgate');

const app = express();
app.use(express.json());

const factgate = new FactGate({
  adapters: ['contradiction-detector', 'pattern-validator', 'confidence-scorer']
});

// 驗證端點
app.post('/api/verify', async (req, res) => {
  try {
    const { claim, adapters } = req.body;

    if (!claim) {
      return res.status(400).json({ error: '需要聲明' });
    }

    const result = await factgate.verify(claim, { adapters });

    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('驗證錯誤:', error);
    res.status(500).json({
      success: false,
      error: '驗證失敗'
    });
  }
});

// 批次驗證端點
app.post('/api/verify/batch', async (req, res) => {
  try {
    const { claims } = req.body;

    if (!Array.isArray(claims) || claims.length === 0) {
      return res.status(400).json({ error: '需要聲明陣列' });
    }

    const results = await Promise.all(
      claims.map(claim => factgate.verify(claim))
    );

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('批次驗證錯誤:', error);
    res.status(500).json({
      success: false,
      error: '批次驗證失敗'
    });
  }
});

// 健康檢查
app.get('/api/health', async (req, res) => {
  const adapters = await factgate.getAdapterStatus();

  res.json({
    status: 'ok',
    adapters: adapters
  });
});

app.listen(3000, () => {
  console.log('FactGate API 監聽埠 3000');
});
```

### 即時串流處理

從訊息佇列處理聲明：

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
      console.log(`處理聲明: ${claim}`);

      try {
        const result = await factgate.verify(claim);

        // 將結果發送到輸出主題
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

        console.log(`✓ 已驗證: ${claim} (信心度: ${result.confidence})`);
      } catch (error) {
        console.error(`✗ 驗證聲明時發生錯誤: ${error.message}`);
      }
    }
  });
}

processClaimStream().catch(console.error);
```

## 進階場景

### 信心閾值配置

為不同使用案例設定不同的信心閾值：

```javascript
class AdaptiveFactGate {
  constructor() {
    this.factgate = new FactGate();

    this.thresholds = {
      'medical': 0.95,      // 需要高信心度
      'general': 0.7,       // 中等信心度
      'entertainment': 0.5  // 可接受低信心度
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
      return '接受：信心度達到閾值';
    } else if (confidence >= threshold * 0.8) {
      return '審查：信心度接近閾值，建議人工審查';
    } else {
      return '拒絕：信心度低於可接受閾值';
    }
  }
}

// 使用
const adaptiveGate = new AdaptiveFactGate();

// 醫學聲明需要高信心度
await adaptiveGate.verify(
  "阿斯匹靈可將心臟病發作風險降低 50%",
  'medical'
);

// 娛樂聲明可以有較低的信心度
await adaptiveGate.verify(
  "這部電影是 2023 年票房最高的電影",
  'entertainment'
);
```

### 效能快取

實作快取以避免重新驗證相同的聲明：

```javascript
const NodeCache = require('node-cache');

class CachedFactGate {
  constructor() {
    this.factgate = new FactGate();
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 小時快取
      checkperiod: 600
    });
  }

  async verify(claim, options = {}) {
    const cacheKey = this.generateCacheKey(claim, options);

    // 檢查快取
    const cached = this.cache.get(cacheKey);
    if (cached && !options.skipCache) {
      console.log('快取命中:', cacheKey);
      return { ...cached, fromCache: true };
    }

    // 驗證並快取
    console.log('快取未命中:', cacheKey);
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

### 多語言支援

驗證不同語言的聲明：

```javascript
class MultilingualFactGate {
  constructor() {
    this.factgate = new FactGate();
  }

  async verify(claim, language = 'zh-TW') {
    // 如需要則翻譯為英文
    const englishClaim = await this.translateToEnglish(claim, language);

    // 驗證
    const result = await this.factgate.verify(englishClaim);

    // 將結果翻譯回來
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
    // 實作翻譯（使用翻譯 API）
    return text;
  }

  async localizeResult(result, targetLanguage) {
    if (targetLanguage === 'en') return result;

    // 翻譯推理和問題
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
    // 實作翻譯
    return text;
  }
}
```

## 錯誤處理

### 優雅降級

優雅地處理適配器故障：

```javascript
class ResilientFactGate {
  constructor() {
    this.factgate = new FactGate({
      adapters: ['contradiction-detector', 'pattern-validator', 'confidence-scorer'],
      fallbackStrategy: 'partial' // 即使某些適配器失敗也繼續
    });
  }

  async verify(claim) {
    try {
      const result = await this.factgate.verify(claim);

      // 檢查是否有適配器失敗
      if (result.failedAdapters && result.failedAdapters.length > 0) {
        console.warn('某些適配器失敗:', result.failedAdapters);

        // 如果至少有一個適配器成功，仍然返回結果
        if (result.sources.length > 0) {
          return {
            ...result,
            partial: true,
            warning: '結果基於部分驗證'
          };
        }
      }

      return result;
    } catch (error) {
      console.error('所有適配器失敗:', error);

      // 返回不確定結果
      return {
        verified: false,
        confidence: 0,
        reasoning: '由於系統錯誤無法驗證',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
```

### 超時處理

防止緩慢的適配器阻塞驗證：

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
        reject(new Error(`驗證超時，超過 ${this.timeout}ms`));
      }, this.timeout);
    });
  }
}

// 使用超時處理
const timeoutGate = new TimeoutFactGate(3000); // 3 秒超時

try {
  const result = await timeoutGate.verify(claim);
  console.log('結果:', result);
} catch (error) {
  if (error.message.includes('超時')) {
    console.error('驗證耗時過長');
    // 使用備用策略
  }
}
```

## 參見

- [快速開始指南](QUICKSTART.zh-TW.md) - 開始使用 FactGate
- [API 參考](API.zh-TW.md) - 完整 API 文檔
- [架構](ARCHITECTURE.zh-TW.md) - 系統設計和架構
- [開發指南](DEVELOPMENT.zh-TW.md) - 為 FactGate 做貢獻

---

**🌏 English** / [Usage Examples](../EXAMPLES.md)