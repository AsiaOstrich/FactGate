# FactGate 範例

本目錄包含 FactGate 的範例實作和使用場景。

## 內容

- [Pinecone RAG 適配器](#pinecone-rag-適配器) - 將 FactGate 連接到 Pinecone 向量資料庫
- [自製 RAG 系統](#自製-rag-系統) - 從零開始建立自己的 RAG 後端

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
- **自製**：參見下方 [自製 RAG 系統](#自製-rag-系統)

---

## 自製 RAG 系統

從零開始建立自己的 RAG (Retrieval-Augmented Generation) 後端。這讓您能完全掌控事實查證基礎設施、資料和成本。

### 何時使用自製 RAG vs 托管服務

**使用自製 RAG 的時機：**
- 需要完全控制資料和基礎設施
- 希望避免廠商鎖定
- 有嚴格的資料隱私要求（醫療、金融、政府）
- 希望將持續成本降到最低（無月費）
- 需要大幅客製化 RAG 管線
- 處理敏感或專有資訊

**使用托管 RAG (Pinecone 等) 的時機：**
- 希望更快上市
- 不想管理基礎設施
- 需要開箱即用的全球擴展性
- 資料隱私要求允許雲端託管
- 需要專業支援

### 架構概觀

自製 RAG 系統包含兩個部分：

1. **後端伺服器** ([custom-rag-server.js](custom-rag-server.js))
   - 提供搜尋、健康檢查和事實管理的 HTTP API
   - 向量資料庫（ChromaDB、LanceDB、FAISS）
   - Embedding 生成（OpenAI、本地模型）

2. **客戶端適配器** ([custom-rag-adapter.js](custom-rag-adapter.js))
   - 實作 `FactSourceAdapter` 介面
   - 透過 HTTP 與後端通訊
   - 處理快取、重試、錯誤處理

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   FactGate      │  HTTP   │  自製 RAG        │         │  向量資料庫      │
│   + 適配器      ├────────►│  後端伺服器      ├────────►│   (ChromaDB)     │
│                 │         │                  │         │                  │
└─────────────────┘         └──────────────────┘         └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  OpenAI API      │
                            │  (Embeddings)    │
                            └──────────────────┘
```

### 快速開始

#### 1. 安裝依賴

```bash
# 後端依賴
npm install express chromadb openai cors body-parser

# 適配器依賴（如果已安裝 Pinecone 範例則已具備）
npm install axios
```

#### 2. 啟動 ChromaDB（向量資料庫）

ChromaDB 是開源向量資料庫。有兩種選擇：

**選項 A：Docker（推薦）**
```bash
docker pull chromadb/chroma
docker run -p 8000:8000 chromadb/chroma
```

**選項 B：Python**
```bash
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

#### 3. 配置環境變數

```bash
# 必填
export OPENAI_API_KEY="your-openai-api-key"

# 可選
export PORT=3000
export RAG_API_KEY="your-secret-api-key"  # 用於保護後端
export CHROMA_URL="http://localhost:8000"
```

#### 4. 啟動 RAG 後端伺服器

```bash
node examples/custom-rag-server.js
```

您應該會看到：
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

#### 5. 填充事實資料

建立一個腳本來新增事實（例如 `populate-facts.js`）：

```javascript
const CustomRAGAdapter = require('./examples/custom-rag-adapter');

const adapter = new CustomRAGAdapter({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.RAG_API_KEY
});

async function populateFacts() {
  // 批次新增事實
  const result = await adapter.addFactsBatch([
    {
      text: '水在海平面上 100°C 時沸騰。',
      source: '物理教科書',
      metadata: { category: 'science', verified: true }
    },
    {
      text: 'Python 由 Guido van Rossum 在 1991 年創建。',
      source: 'Wikipedia',
      metadata: { category: 'technology' }
    },
    {
      text: '用肉眼無法從太空中看到中國長城。',
      source: 'NASA',
      metadata: { category: 'science', verified: true }
    },
    {
      text: 'Marie Curie 是第一位獲得諾貝爾獎的女性。',
      source: 'Nobel Prize Official Website',
      metadata: { category: 'history' }
    },
    {
      text: '光合作用將光能轉換為化學能。',
      source: '生物教科書',
      metadata: { category: 'biology', verified: true }
    }
  ]);

  console.log('已新增事實：', result);
}

populateFacts();
```

執行它：
```bash
node populate-facts.js
```

#### 6. 與 FactGate 一起使用

```javascript
const FactGate = require('factgate');
const CustomRAGAdapter = require('./examples/custom-rag-adapter');

// 初始化適配器
const ragAdapter = new CustomRAGAdapter({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.RAG_API_KEY,
  similarityThreshold: 0.85,
  retryAttempts: 3
});

// 建立 FactGate 實例
const factgate = new FactGate({
  adapters: [
    'contradiction-detector',  // 內建
    'pattern-validator',       // 內建
    ragAdapter                 // 自製 RAG
  ]
});

// 驗證聲明
const result = await factgate.verify('水在 100 攝氏度時沸騰嗎？');
console.log(result);

// 檢查適配器統計
console.log(ragAdapter.getStats());
```

### 配置選項

#### 後端伺服器 (custom-rag-server.js)

```javascript
const server = new CustomRAGServer({
  port: 3000,                              // 伺服器埠號
  openaiApiKey: 'your-openai-key',         // Embedding 所需（必填）
  ragApiKey: 'your-secret-key',            // 認證用 API 金鑰（可選）
  chromaUrl: 'http://localhost:8000',      // ChromaDB URL
  collectionName: 'factgate-facts',        // 集合名稱
  embeddingModel: 'text-embedding-3-small' // OpenAI embedding 模型
});

await server.start();
```

#### 客戶端適配器 (custom-rag-adapter.js)

```javascript
const adapter = new CustomRAGAdapter({
  // 必填
  baseUrl: 'http://localhost:3000',        // 後端 URL

  // 可選
  apiKey: 'your-secret-key',               // API 金鑰（如果後端需要）
  topK: 5,                                  // 要檢索的結果數量
  similarityThreshold: 0.8,                 // 驗證的最小相似度
  timeout: 5000,                            // 請求超時時間（毫秒）
  retryAttempts: 3,                         // 失敗時重試次數
  retryDelay: 1000,                         // 重試之間的延遲（毫秒）
  cacheMaxSize: 100                         // 最大快取結果數
});
```

### API 參考

#### 後端端點

自製 RAG 伺服器提供以下端點：

**POST /api/search**
```javascript
// 請求
{
  "query": "水在 100°C 時沸騰",
  "topK": 5,
  "context": {}
}

// 回應
{
  "query": "水在 100°C 時沸騰",
  "matches": [
    {
      "id": "fact-123",
      "text": "水在海平面上 100°C 時沸騰。",
      "similarity": 0.95,
      "distance": 0.05,
      "source": "物理教科書",
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
// 請求
{
  "text": "新事實文本",
  "metadata": { "source": "Wikipedia" }
}

// 回應
{
  "success": true,
  "id": "fact-123456",
  "message": "事實新增成功"
}
```

**POST /api/facts/batch**
```javascript
// 請求
{
  "facts": [
    { "text": "事實 1", "source": "來源 A", "metadata": {} },
    { "text": "事實 2", "source": "來源 B", "metadata": {} }
  ]
}

// 回應
{
  "success": true,
  "count": 2,
  "ids": ["fact-123", "fact-456"],
  "message": "已成功新增 2 個事實"
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

#### 適配器方法

與 Pinecone 適配器相同：

- `verify(claim, context)` - 驗證聲明
- `isAvailable()` - 檢查後端健康狀況
- `addFact(fact, metadata)` - 新增單一事實
- `addFactsBatch(facts)` - 批次新增事實
- `getStats()` - 取得適配器統計資訊
- `getBackendInfo()` - 取得後端資訊
- `clearCache()` - 清除結果快取

### 成本考量

**OpenAI Embeddings：**
- 模型：`text-embedding-3-small`
- 成本：約 $0.02 / 1M tokens
- 平均聲明：約 20 tokens
- 每 $1 約可進行 50,000 次驗證

**ChromaDB：**
- **免費且開源**
- 自行託管，無月費
- 在一般硬體上可擴展到數百萬個向量

**基礎設施成本：**
- **開發環境**：免費（本地筆記型電腦/桌上型電腦）
- **生產環境**：約 $20-50/月（小型雲端 VM + 儲存）
  - 範例：DigitalOcean Droplet ($20/月) + Block Storage ($10/月)
  - 範例：AWS EC2 t3.medium (~$30/月) + EBS ($10/月)

**成本比較（每月 100 萬次驗證）：**
- **托管服務 (Pinecone)**：~$70/月（starter）+ $0.20（embeddings）= **$70.20**
- **自製 RAG**：~$30/月（基礎設施）+ $0.20（embeddings）= **$30.20**
- **節省**：約 $40/月，或 **減少 57%**

### 效能

**預期回應時間：**
- 快取查詢：<10ms
- 後端搜尋（包含 embedding）：150-500ms
- 含重試邏輯：最多 1500ms（失敗時）

**最佳化提示：**
1. **啟用快取**（內建、自動）
2. **將後端部署在適配器附近**（減少網路延遲）
3. **使用本地 embedding 模型**（消除 OpenAI API 呼叫）
   - 範例：`sentence-transformers/all-MiniLM-L6-v2`
   - 更快、免費、私密，但品質稍低
4. **針對資料集大小調整 ChromaDB**
5. **高流量使用連接池**
6. **透過 `/api/stats` 端點監控**

### 替代向量資料庫

您可以將 ChromaDB 替換為其他開源向量資料庫：

#### LanceDB

```bash
npm install vectordb
```

優點：無伺服器、嵌入式、非常快速
缺點：較新、社群較小

#### FAISS (Facebook AI Similarity Search)

```bash
npm install faiss-node
```

優點：非常快速、經過實戰考驗、可擴展至數十億
缺點：無原生 Node.js 支援，需要 Python 綁定

#### Qdrant（開源）

```bash
docker run -p 6333:6333 qdrant/qdrant
```

優點：生產就緒、優秀的過濾功能、基於 Rust
缺點：比 ChromaDB 更複雜

#### Milvus

```bash
docker-compose up -d  # 參見 Milvus 文檔
```

優點：企業級、高度可擴展
缺點：設置更複雜、資源使用較重

### 使用本地 Embedding 模型

為消除 OpenAI API 呼叫和成本，使用本地 embedding 模型：

```javascript
// 安裝 Transformers.js
npm install @xenova/transformers

// 在 custom-rag-server.js 中，替換 OpenAI embedding 生成：
const { pipeline } = require('@xenova/transformers');

class CustomRAGServer {
  async initialize() {
    // 載入本地 embedding 模型
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

**取捨：**
- 優點：免費、私密、更快（無 API 呼叫）、可離線工作
- 缺點：品質略低於 OpenAI 模型、需要更多 CPU/記憶體

### 部署

#### Docker 部署

建立 `Dockerfile`：
```dockerfile
FROM node:18-alpine

# 安裝依賴
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# 複製應用程式
COPY examples/custom-rag-server.js ./
COPY examples/custom-rag-adapter.js ./

# 暴露埠號
EXPOSE 3000

# 啟動伺服器
CMD ["node", "custom-rag-server.js"]
```

建立 `docker-compose.yml`：
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

部署：
```bash
docker-compose up -d
```

#### 雲端部署

**DigitalOcean / Linode / Vultr：**
```bash
# 1. 建立 Droplet/Instance（Ubuntu 22.04、2GB RAM）
# 2. SSH 連接伺服器
ssh root@your-server-ip

# 3. 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. 複製您的儲存庫（或上傳 docker-compose.yml）
git clone your-repo
cd your-repo

# 5. 啟動服務
docker-compose up -d

# 6. 檢查健康狀況
curl http://localhost:3000/api/health
```

**AWS / GCP / Azure：**
- 部署在 EC2 / Compute Engine / Azure VM
- 使用托管容器服務（ECS、Cloud Run、Container Instances）
- 考慮無伺服器選項（Lambda + API Gateway + 托管 ChromaDB 替代方案）

### 安全考量

1. **API 金鑰認證**
   ```javascript
   // 後端
   const server = new CustomRAGServer({
     ragApiKey: process.env.RAG_API_KEY  // 認證所需
   });

   // 適配器
   const adapter = new CustomRAGAdapter({
     apiKey: process.env.RAG_API_KEY
   });
   ```

2. **生產環境使用 HTTPS**
   - 使用反向代理（nginx、Caddy）
   - 取得 SSL 憑證（Let's Encrypt）
   - 絕不透過 HTTP 傳送 API 金鑰

3. **速率限制**
   ```javascript
   npm install express-rate-limit

   const rateLimit = require('express-rate-limit');

   app.use(rateLimit({
     windowMs: 15 * 60 * 1000, // 15 分鐘
     max: 100 // 每個 IP 在時間窗口內最多 100 個請求
   }));
   ```

4. **輸入驗證**
   - 驗證所有輸入參數
   - 清理使用者輸入
   - 實作請求大小限制

### 故障排除

#### "後端不可用"
- 檢查 ChromaDB 是否執行：`curl http://localhost:8000/api/v1/heartbeat`
- 檢查後端伺服器是否執行：`curl http://localhost:3000/api/health`
- 驗證防火牆規則允許連接
- 檢查 Docker 容器日誌：`docker logs <container-id>`

#### "連接被拒絕"
- 適配器配置中的後端 URL 不正確
- 後端未在正確的埠號上監聽
- 網路防火牆阻擋請求
- Docker 使用 `0.0.0.0` 而非 `localhost`

#### "Embedding 生成失敗"
- OpenAI API 金鑰無效或遺失
- API 配額已超額
- 網路連線問題
- 考慮切換到本地 embeddings

#### "未找到匹配的事實"
- 資料庫是空的，請先填充事實
- 索引和查詢之間的 embedding 模型不匹配
- 查詢與儲存的事實差異太大

#### 回應時間過長
- 後端伺服器過載（擴充資源）
- ChromaDB 需要調整（查看文檔）
- 網路延遲（將後端部署在適配器附近）
- 在適配器中啟用快取

### 監控

新增監控以追蹤系統健康狀況：

```javascript
// 在 custom-rag-server.js 中
const prometheus = require('prom-client');

const searchCounter = new prometheus.Counter({
  name: 'rag_searches_total',
  help: '搜尋總次數'
});

const searchDuration = new prometheus.Histogram({
  name: 'rag_search_duration_seconds',
  help: '搜尋持續時間（秒）'
});

// 暴露指標端點
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

使用 Prometheus + Grafana 監控，或使用內建的 `/api/stats` 端點。

### 比較：自製 vs 托管 RAG

| 功能 | 自製 RAG | Pinecone | Weaviate Cloud |
|------|---------|----------|----------------|
| **設置時間** | ~2 小時 | ~30 分鐘 | ~30 分鐘 |
| **每月成本** | $30-50 | $70+ | $25+ |
| **資料控制** | 完全 | 有限 | 有限 |
| **擴展性** | 手動 | 自動 | 自動 |
| **隱私** | 高 | 中 | 中 |
| **維護** | 自行管理 | 托管 | 托管 |
| **客製化** | 無限 | 有限 | 中等 |
| **支援** | 社群 | 專業 | 專業 |

**建議：**
- **原型/MVP**：使用托管服務（更快啟動）
- **生產環境（隱私敏感）**：使用自製 RAG
- **生產環境（規模）**：取決於團隊規模和專業知識

### 授權

MIT

### 支援

- GitHub Issues：[FactGate Issues](https://github.com/AsiaOstrich/FactGate/issues)
- 文檔：[FactGate Docs](../docs/)

---

**🌏 English** / [Examples](README.md)