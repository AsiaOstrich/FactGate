# FactGate 範例

本目錄包含 FactGate 的範例實作和使用場景。

## 內容

- [Pinecone RAG 適配器](#pinecone-rag-適配器) - 將 FactGate 連接到 Pinecone 向量資料庫

## Pinecone RAG 適配器

一個生產就緒的適配器，將 FactGate 連接到 Pinecone，使用向量相似度搜尋進行語義事實查證。

### 快速開始

#### 1. 先決條件

```bash
# 安裝依賴
npm install @pinecone-database/pinecone openai

# 設定環境變數
export PINECONE_API_KEY="your-pinecone-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

#### 2. 創建 Pinecone 索引

前往 [Pinecone Console](https://app.pinecone.io/) 並創建索引：

- **索引名稱**：`factgate-facts`
- **維度**：`1536`（用於 OpenAI text-embedding-3-small）
- **度量**：`cosine`
- **雲端**：任何可用區域

#### 3. 填充索引事實資料

```javascript
const PineconeRAGAdapter = require('./examples/pinecone-rag-adapter');

const adapter = new PineconeRAGAdapter({
  pineconeApiKey: process.env.PINECONE_API_KEY,
  indexName: 'factgate-facts',
  openaiApiKey: process.env.OPENAI_API_KEY
});

// 新增單一事實
await adapter.addFact('水在海平面上 100°C 時沸騰。', {
  source: '物理教科書',
  confidence: 1.0
});

// 批次新增事實
await adapter.addFactsBatch([
  {
    text: 'Python 由 Guido van Rossum 在 1991 年創建。',
    source: 'Wikipedia',
    metadata: { category: 'technology' }
  },
  {
    text: '用肉眼無法從太空中看到中國長城。',
    source: 'NASA',
    metadata: { category: 'science' }
  },
  {
    text: 'Marie Curie 是第一位獲得諾貝爾獎的女性。',
    source: 'Nobel Prize Official Website',
    metadata: { category: 'history' }
  }
]);
```

#### 4. 與 FactGate 一起使用

```javascript
const FactGate = require('factgate');
const PineconeRAGAdapter = require('./examples/pinecone-rag-adapter');

// 初始化適配器
const ragAdapter = new PineconeRAGAdapter({
  pineconeApiKey: process.env.PINECONE_API_KEY,
  indexName: 'factgate-facts',
  openaiApiKey: process.env.OPENAI_API_KEY,
  similarityThreshold: 0.85  // 被視為已驗證的最小相似度
});

// 使用 RAG 創建 FactGate 實例
const factgate = new FactGate({
  adapters: [
    'contradiction-detector',  // 內建
    'pattern-validator',       // 內建
    ragAdapter                 // 遠端 RAG
  ]
});

// 驗證聲明
const result = await factgate.verify('水在 100 攝氏度時沸騰嗎？');
console.log(result);
```

### 配置選項

```javascript
const adapter = new PineconeRAGAdapter({
  // 必填
  pineconeApiKey: 'your-api-key',
  indexName: 'your-index-name',
  openaiApiKey: 'your-openai-key',

  // 可選
  embeddingModel: 'text-embedding-3-small',  // OpenAI embedding 模型
  topK: 5,                                    // 要檢索的結果數量
  similarityThreshold: 0.8,                   // 驗證的最小相似度
  timeout: 5000,                              // 請求超時時間（毫秒）
  cacheMaxSize: 100                           // 最大快取結果數
});
```

### API 參考

#### verify(claim, context)

根據 Pinecone 知識庫驗證聲明。

**參數：**
- `claim` (string)：要驗證的聲明
- `context` (object, 可選)：額外的上下文

**回傳：**
```javascript
{
  sourceId: 'pinecone-rag',
  verdict: 'verified' | 'uncertain' | 'contradicted',
  confidence: 0.92,  // 0-1 範圍
  reasoning: '與已驗證事實的相似度高 (92.3%)...',
  details: {
    bestMatch: {
      fact: '水在海平面上 100°C 時沸騰。',
      source: '物理教科書',
      similarity: 0.923
    },
    allMatches: [...],
    threshold: 0.8
  },
  timestamp: '2025-10-25T10:30:00.000Z'
}
```

#### isAvailable()

檢查 Pinecone 索引是否可訪問。

**回傳：** `Promise<boolean>`

#### addFact(fact, metadata)

向索引新增單一事實。

**參數：**
- `fact` (string)：事實文本
- `metadata` (object)：額外的元資料（來源、信心度等）

**回傳：** `Promise<{success: boolean, error?: string}>`

#### addFactsBatch(facts)

批次新增多個事實。

**參數：**
```javascript
[
  {
    text: '事實文本',
    source: '來源名稱',
    metadata: { ... }
  },
  // ...
]
```

**回傳：** `Promise<{success: boolean, count?: number, error?: string}>`

#### getStats()

取得適配器統計資訊。

**回傳：**
```javascript
{
  totalQueries: 42,
  cacheHits: 12,
  errors: 0,
  cacheSize: 15,
  cacheHitRate: '28.57%'
}
```

### 成本考量

**OpenAI Embeddings：**
- 模型：`text-embedding-3-small`
- 成本：約 $0.02 / 1M tokens
- 平均聲明：約 20 tokens
- 每 $1 約可進行 50,000 次驗證

**Pinecone：**
- 免費版：1 個索引，100K 向量
- Starter：$70/月，1000 萬向量
- 參見 [Pinecone 定價](https://www.pinecone.io/pricing/)

**成本最佳化：**
- 為重複查詢啟用快取
- 填充時使用批次操作
- 透過 `getStats()` 監控使用情況

### 效能

**預期回應時間：**
- 快取查詢：<10ms
- Embedding 生成：100-300ms
- Pinecone 查詢：50-200ms
- **總計：150-500ms**

**最佳化提示：**
1. 使用快取（預設啟用）
2. 根據需求調整 `topK`（較低 = 較快）
3. 高流量使用連接池
4. 考慮 Pinecone 的讀取副本

### 故障排除

#### "No matching facts found"（未找到匹配的事實）
- 確保您的索引已填充事實
- 檢查 embedding 模型是否匹配（索引和查詢必須相同）
- 驗證索引維度（text-embedding-3-small 為 1536）

#### "Embedding generation failed"（Embedding 生成失敗）
- 檢查 OpenAI API 金鑰是否有效
- 驗證 API 配額未超額
- 檢查網路連線

#### "Index not found"（未找到索引）
- 驗證索引名稱正確
- 確保已在 Pinecone 控制台中創建索引
- 檢查 API 金鑰是否有權訪問該索引

#### 相似度分數低
- 索引中的事實可能與查詢差異太大
- 考慮降低 `similarityThreshold`
- 向知識庫新增更多樣化的事實
- 重新措辭查詢以匹配事實用語

### 替代 RAG 系統

相同的適配器模式適用於其他向量資料庫：

- **Weaviate**：參見 [Weaviate 適配器範例](weaviate-rag-adapter.js)
- **Qdrant**：參見 [Qdrant 適配器範例](qdrant-rag-adapter.js)
- **Chroma**：參見 [Chroma 適配器範例](chroma-rag-adapter.js)
- **自定義**：實作 `FactSourceAdapter` 介面

### 授權

MIT

### 支援

- GitHub Issues：[FactGate Issues](https://github.com/AsiaOstrich/FactGate/issues)
- 文檔：[FactGate Docs](../docs/)

---

**🌏 English** / [Examples](README.md)