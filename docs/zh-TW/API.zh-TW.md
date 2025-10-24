# API 參考

> **🚧 開發狀態**：此 API 規格基於設計文件。實作細節可能隨開發進度而變化。

## 概述

FactGate 透過 Model Context Protocol (MCP) 提供事實查證功能。本文件描述與 FactGate 互動的完整 API 介面。

## 目錄

- [MCP 伺服器 API](#mcp-伺服器-api)
- [JavaScript/Node.js API](#javascriptnodejs-api)
- [適配器介面](#適配器介面)
- [資料結構](#資料結構)
- [錯誤處理](#錯誤處理)

## MCP 伺服器 API

### verify

根據配置的事實來源驗證聲明。

**方法**: `verify`

**參數**:

| 參數 | 類型 | 必填 | 描述 |
|------|------|------|------|
| `claim` | string | 是 | 要驗證的聲明 |
| `adapters` | string[] | 否 | 要使用的特定適配器（預設：全部） |
| `strategy` | string | 否 | 鏈接策略：`all`, `any`, `majority`（預設：`all`） |
| `context` | object | 否 | 驗證的額外上下文 |

**回傳**: `AggregatedResult`

**範例請求**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "verify",
  "params": {
    "claim": "Python 由 Guido van Rossum 在 1991 年創建。",
    "adapters": ["contradiction-detector", "pattern-validator"],
    "strategy": "all"
  }
}
```

**範例回應**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "claim": "Python 由 Guido van Rossum 在 1991 年創建。",
    "overall": "verified",
    "confidence": 0.92,
    "sources": [
      {
        "sourceId": "contradiction-detector",
        "verdict": "verified",
        "confidence": 0.95,
        "reasoning": "未檢測到矛盾",
        "timestamp": "2025-10-25T10:30:00.000Z"
      },
      {
        "sourceId": "pattern-validator",
        "verdict": "verified",
        "confidence": 0.89,
        "reasoning": "聲明結構合乎邏輯且可驗證",
        "timestamp": "2025-10-25T10:30:00.100Z"
      }
    ],
    "combinedReasoning": "所有驗證器都同意。聲明具體、可驗證且不包含矛盾。",
    "processingTime": 150
  }
}
```

### getAdapters

列出所有可用的適配器。

**方法**: `getAdapters`

**參數**: 無

**回傳**: 適配器資訊陣列

**範例回應**:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": [
    {
      "name": "contradiction-detector",
      "type": "built-in",
      "description": "檢測聲明中的邏輯矛盾",
      "available": true
    },
    {
      "name": "pattern-validator",
      "type": "built-in",
      "description": "根據邏輯模式驗證聲明",
      "available": true
    },
    {
      "name": "confidence-scorer",
      "type": "built-in",
      "description": "基於具體性評分聲明信心度",
      "available": true
    }
  ]
}
```

### getAdapterStatus

檢查所有適配器的健康狀態。

**方法**: `getAdapterStatus`

**參數**: 無

**回傳**: 適配器名稱到狀態的對應物件

## JavaScript/Node.js API

### FactGate 類別

與 FactGate 互動的主要類別。

#### 建構函式

```typescript
constructor(config?: FactGateConfig)
```

**參數**:

```typescript
interface FactGateConfig {
  adapters?: (string | FactSourceAdapter)[];
  strategy?: 'all' | 'any' | 'majority';
  timeout?: number; // 毫秒
  fallbackStrategy?: 'fail' | 'partial' | 'ignore';
}
```

**範例**:

```javascript
const FactGate = require('factgate');

// 預設配置（所有內建適配器）
const factgate1 = new FactGate();

// 自定義配置
const factgate2 = new FactGate({
  adapters: ['contradiction-detector', 'pattern-validator'],
  strategy: 'majority',
  timeout: 5000,
  fallbackStrategy: 'partial'
});

// 使用自定義適配器
const factgate3 = new FactGate({
  adapters: [
    'contradiction-detector',
    new CustomWikipediaAdapter()
  ]
});
```

#### verify()

驗證聲明。

```typescript
async verify(
  claim: string,
  options?: VerifyOptions
): Promise<AggregatedResult>
```

**參數**:

```typescript
interface VerifyOptions {
  adapters?: string[];
  strategy?: 'all' | 'any' | 'majority';
  context?: VerificationContext;
}

interface VerificationContext {
  previousClaims?: string[];
  domain?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}
```

**範例**:

```javascript
// 簡單驗證
const result = await factgate.verify(
  "地球繞著太陽轉。"
);

// 使用選項
const result = await factgate.verify(
  "水在海平面上 100°C 時沸騰。",
  {
    adapters: ['contradiction-detector', 'confidence-scorer'],
    strategy: 'all',
    context: {
      domain: 'science',
      language: 'zh-TW'
    }
  }
);
```

#### registerAdapter()

註冊自定義適配器。

```typescript
registerAdapter(adapter: FactSourceAdapter): void
```

**範例**:

```javascript
const customAdapter = new MyCustomAdapter();
factgate.registerAdapter(customAdapter);
```

#### unregisterAdapter()

移除適配器。

```typescript
unregisterAdapter(adapterName: string): void
```

#### getAdapters()

取得已註冊適配器列表。

```typescript
getAdapters(): AdapterInfo[]
```

#### getAdapterStatus()

檢查適配器健康狀態。

```typescript
async getAdapterStatus(): Promise<Record<string, AdapterStatus>>
```

## 適配器介面

自定義適配器必須實作 `FactSourceAdapter` 介面。

### FactSourceAdapter 介面

```typescript
interface FactSourceAdapter {
  // 適配器識別
  name: string;
  description: string;

  // 主要驗證方法
  verify(
    claim: string,
    context?: VerificationContext
  ): Promise<VerificationResult>;

  // 健康檢查
  isAvailable(): Promise<boolean>;
}
```

### 實作自定義適配器

**最小範例**:

```javascript
class SimpleAdapter {
  constructor() {
    this.name = 'simple-adapter';
    this.description = '一個簡單的範例適配器';
  }

  async verify(claim, context) {
    // 您的驗證邏輯
    const isValid = claim.length > 10;

    return {
      sourceId: this.name,
      verdict: isValid ? 'verified' : 'uncertain',
      confidence: isValid ? 0.8 : 0.3,
      reasoning: `聲明長度: ${claim.length} 字元`,
      timestamp: new Date()
    };
  }

  async isAvailable() {
    return true;
  }
}
```

**完整範例（含錯誤處理）**:

```javascript
class RobustAdapter {
  constructor(config) {
    this.name = 'robust-adapter';
    this.description = '生產就緒的適配器範例';
    this.config = config;
  }

  async verify(claim, context) {
    try {
      // 驗證輸入
      if (!claim || typeof claim !== 'string') {
        throw new Error('無效的聲明輸入');
      }

      // 處理前檢查可用性
      if (!await this.isAvailable()) {
        return this.unavailableResult();
      }

      // 執行驗證
      const result = await this.performVerification(claim, context);

      // 驗證結果
      this.validateResult(result);

      return result;
    } catch (error) {
      console.error(`${this.name} 錯誤:`, error);
      return this.errorResult(error);
    }
  }

  async performVerification(claim, context) {
    // 您的自定義驗證邏輯
    return {
      sourceId: this.name,
      verdict: 'uncertain',
      confidence: 0.5,
      reasoning: '驗證邏輯尚未實作',
      timestamp: new Date()
    };
  }

  async isAvailable() {
    try {
      // 檢查依賴、API、資料庫等
      return true;
    } catch {
      return false;
    }
  }

  unavailableResult() {
    return {
      sourceId: this.name,
      verdict: 'uncertain',
      confidence: 0,
      reasoning: '適配器目前不可用',
      timestamp: new Date()
    };
  }

  errorResult(error) {
    return {
      sourceId: this.name,
      verdict: 'uncertain',
      confidence: 0,
      reasoning: `驗證期間發生錯誤: ${error.message}`,
      details: { error: error.message },
      timestamp: new Date()
    };
  }

  validateResult(result) {
    const required = ['sourceId', 'verdict', 'confidence', 'reasoning', 'timestamp'];
    for (const field of required) {
      if (!(field in result)) {
        throw new Error(`缺少必填欄位: ${field}`);
      }
    }

    if (result.confidence < 0 || result.confidence > 1) {
      throw new Error('信心度必須介於 0 和 1 之間');
    }

    if (!['verified', 'contradicted', 'uncertain'].includes(result.verdict)) {
      throw new Error('無效的判定值');
    }
  }
}
```

## 資料結構

### AggregatedResult

回傳給客戶端的最終結果。

```typescript
interface AggregatedResult {
  claim: string;                       // 原始聲明
  overall: 'verified' | 'contradicted' | 'uncertain';  // 最終判定
  confidence: number;                  // 0-1 範圍
  sources: VerificationResult[];       // 每個適配器的結果
  combinedReasoning: string;           // 聚合說明
  processingTime: number;              // 毫秒
  issues?: Issue[];                    // 發現的可選問題
  metadata?: Record<string, unknown>;  // 可選元資料
}
```

### VerificationResult

來自單一適配器的結果。

```typescript
interface VerificationResult {
  sourceId: string;                    // 適配器名稱
  verdict: 'verified' | 'contradicted' | 'uncertain';
  confidence: number;                  // 0-1 範圍
  reasoning: string;                   // 說明
  details?: Record<string, unknown>;   // 可選的額外資料
  timestamp: Date;                     // 驗證發生時間
}
```

### Issue

驗證期間發現的特定問題。

```typescript
interface Issue {
  type: string;                        // 問題類型（例如 'contradiction', 'logical-fallacy'）
  message: string;                     // 人類可讀的描述
  severity: 'low' | 'medium' | 'high'; // 問題嚴重性
  location?: string;                   // 聲明中的位置（可選）
  suggestion?: string;                 // 修正方法（可選）
}
```

### AdapterInfo

關於適配器的資訊。

```typescript
interface AdapterInfo {
  name: string;                        // 適配器識別符
  type: 'built-in' | 'custom';         // 適配器類型
  description: string;                 // 功能描述
  available: boolean;                  // 當前可用性
  version?: string;                    // 可選版本
}
```

### AdapterStatus

適配器的健康狀態。

```typescript
interface AdapterStatus {
  available: boolean;                  // 適配器能否運作？
  responseTime: number;                // 最後回應時間（毫秒）
  lastCheck: Date;                     // 狀態檢查時間
  error?: string;                      // 不可用時的錯誤訊息
}
```

## 錯誤處理

### 錯誤類型

FactGate 對不同故障場景拋出類型化錯誤：

```typescript
class FactGateError extends Error {
  code: string;
  details?: unknown;
}
```

**錯誤代碼**:

| 代碼 | 描述 | 處理方式 |
|------|------|----------|
| `INVALID_CLAIM` | 聲明為 null、空或無效類型 | 呼叫前驗證輸入 |
| `ADAPTER_NOT_FOUND` | 請求的適配器不存在 | 檢查可用適配器 |
| `ADAPTER_UNAVAILABLE` | 適配器關閉或無法連線 | 使用備用策略 |
| `VERIFICATION_TIMEOUT` | 驗證超過超時時間 | 增加超時或最佳化適配器 |
| `INVALID_CONFIGURATION` | 無效的 FactGate 配置 | 檢查配置格式 |
| `ALL_ADAPTERS_FAILED` | 沒有適配器能夠驗證 | 檢查適配器可用性 |

### 錯誤處理範例

**基本 Try-Catch**:

```javascript
try {
  const result = await factgate.verify(claim);
  console.log('結果:', result);
} catch (error) {
  if (error.code === 'ADAPTER_UNAVAILABLE') {
    console.log('適配器關閉，使用備用');
    // 使用備用邏輯
  } else {
    console.error('驗證失敗:', error.message);
  }
}
```

**使用備用策略**:

```javascript
const factgate = new FactGate({
  adapters: ['contradiction-detector', 'pattern-validator', 'confidence-scorer'],
  fallbackStrategy: 'partial' // 即使某些適配器失敗也繼續
});

const result = await factgate.verify(claim);

if (result.sources.length < 3) {
  console.warn('某些適配器失敗');
  console.log('可用結果:', result.sources.map(s => s.sourceId));
}
```

**自定義錯誤處理器**:

```javascript
class SafeFactGate {
  constructor() {
    this.factgate = new FactGate();
  }

  async verify(claim) {
    try {
      return await this.factgate.verify(claim);
    } catch (error) {
      return {
        claim: claim,
        overall: 'uncertain',
        confidence: 0,
        sources: [],
        combinedReasoning: `驗證失敗: ${error.message}`,
        processingTime: 0,
        error: error.code
      };
    }
  }
}
```

## 效能考量

### 回應時間預期

基於設計規格：

- **內建驗證器**：每個適配器 < 500ms
- **鏈接驗證**：線性擴展（無明顯額外開銷）
- **基於網路的適配器**：可變（實作超時）

### 最佳化提示

1. **盡可能使用特定適配器**:
   ```javascript
   // 較快：僅使用需要的適配器
   await factgate.verify(claim, { adapters: ['contradiction-detector'] });

   // 較慢：使用所有適配器
   await factgate.verify(claim);
   ```

2. **對重複聲明實作快取**:
   ```javascript
   const cache = new Map();
   const cacheKey = claim.toLowerCase().trim();

   if (cache.has(cacheKey)) {
     return cache.get(cacheKey);
   }

   const result = await factgate.verify(claim);
   cache.set(cacheKey, result);
   return result;
   ```

3. **對多個聲明使用批次驗證**:
   ```javascript
   const results = await Promise.all(
     claims.map(claim => factgate.verify(claim))
   );
   ```

## 參見

- [快速開始指南](QUICKSTART.zh-TW.md) - 開始使用 FactGate
- [使用範例](EXAMPLES.zh-TW.md) - 實用範例
- [架構](ARCHITECTURE.zh-TW.md) - 系統設計
- [開發指南](DEVELOPMENT.zh-TW.md) - 貢獻

---

**🌏 English** / [API Reference](../API.md)