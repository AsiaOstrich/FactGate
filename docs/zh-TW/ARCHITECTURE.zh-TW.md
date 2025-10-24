# 架構

> **🚧 開發狀態**：本文件描述基於設計規格的計劃架構。實作正在進行中。

## 概述

FactGate 被設計為一個模組化、可擴展的事實查證系統，透過 Model Context Protocol (MCP) 運作。架構優先考慮簡潔性、可擴展性和效能。

## 目錄

- [系統架構](#系統架構)
- [核心組件](#核心組件)
- [資料流](#資料流)
- [設計原則](#設計原則)
- [可擴展性](#可擴展性)
- [效能考量](#效能考量)
- [安全性](#安全性)

## 系統架構

### 高階概覽

```
┌─────────────────────────────────────────────────────────┐
│                   FactGate 系統                          │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │            MCP 伺服器介面                           │  │
│  │     (處理協定通訊)                                  │  │
│  └────────────────────────────────────────────────────┘  │
│                        │                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │          驗證引擎                                  │  │
│  │    (編排適配器與聚合)                              │  │
│  └────────────────────────────────────────────────────┘  │
│                        │                                  │
│         ┌──────────────┼──────────────┐                   │
│         ▼              ▼              ▼                   │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │  內建       │ │  內建        │ │   自定義     │     │
│  │  矛盾檢測器 │ │  模式驗證器  │ │   適配器     │     │
│  │             │ │              │ │ (使用者實作) │     │
│  └─────────────┘ └──────────────┘ └──────────────┘     │
│         │              │              │                   │
│         └──────────────┼──────────────┘                   │
│                        ▼                                  │
│           ┌─────────────────────────┐                   │
│           │  信心度聚合器            │                   │
│           │  (組合結果)              │                   │
│           └─────────────────────────┘                   │
│                        │                                  │
│                        ▼                                  │
│           ┌─────────────────────────┐                   │
│           │  結果格式化器            │                   │
│           │  (結構化輸出)            │                   │
│           └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### 組件層

1. **協定層**：MCP 伺服器介面處理通訊
2. **編排層**：驗證引擎協調適配器
3. **適配器層**：可插拔事實來源（內建和自定義）
4. **聚合層**：信心度評分和結果組合
5. **輸出層**：結構化結果格式化

## 核心組件

### 1. MCP 伺服器介面

**職責**：處理與客戶端的 MCP 協定通訊。

**主要功能**：
- 解析傳入的 MCP 請求
- 路由到驗證引擎
- 根據 MCP 規格格式化回應
- 處理協定層級錯誤

**技術**：Node.js、MCP SDK

### 2. 驗證引擎

**職責**：編排跨多個適配器的驗證。

**主要功能**：
- 載入和管理註冊的適配器
- 並行化驗證呼叫
- 處理超時和失敗
- 聚合結果

**設計模式**：編排器 + 策略

**介面**：
```typescript
class VerificationEngine {
  async verify(
    claim: string,
    options?: VerifyOptions
  ): Promise<AggregatedResult>

  registerAdapter(adapter: FactSourceAdapter): void
  unregisterAdapter(name: string): void
  getAdapters(): AdapterInfo[]
}
```

**關鍵演算法**：
- **並行執行**：使用 `Promise.all()` 並發適配器呼叫
- **超時管理**：`Promise.race()` 與超時 promise
- **錯誤隔離**：每個適配器使用 try-catch 防止級聯失敗

### 3. 適配器註冊表

**職責**：管理事實來源適配器的生命週期。

**主要功能**：
- 註冊/取消註冊適配器
- 驗證適配器介面合規性
- 追蹤適配器可用性和健康狀況
- 提供適配器元資料

### 4. 內建適配器

#### 矛盾檢測器

**目的**：識別聲明中的邏輯矛盾。

**方法**：
- 顯式矛盾的模式匹配（"是 X" 與 "不是 X"）
- 時間一致性檢查
- 內部聲明一致性

**回應時間**：<200ms

**範例**：
```javascript
const claim = "太陽從西邊升起，從東邊落下。";
// 檢測與已知天文事實的矛盾
```

#### 模式驗證器

**目的**：檢測邏輯謬誤和有問題的模式。

**方法**：
- 維護謬誤模式庫
- 將聲明與已知有問題的結構匹配
- 基於模式強度的信心度

**檢測的模式**：
- 循環推理
- 虛假二分法
- 滑坡謬誤
- 相關性-因果性混淆
- 倉促概括

**回應時間**：<250ms

#### 信心度評分器

**目的**：評估聲明品質和可驗證性。

**方法**：
- 具體性分析
- 可證偽性評估
- 模糊性檢測
- 時空具體性

**因素**：
- **高信心度**：具體、可驗證、可證偽
- **低信心度**：模糊、不可證偽、過於籠統

**回應時間**：<150ms

### 5. 信心度聚合器

**職責**：將多個適配器的結果組合成最終判定。

**策略**：

1. **加權平均**（預設）：
   ```
   confidence = Σ(適配器信心度 × 適配器權重) / Σ(適配器權重)
   ```

2. **多數投票**：
   ```
   verdict = 最常見(適配器判定)
   confidence = 計數(多數) / 總適配器數
   ```

3. **悲觀**（最低信心度獲勝）：
   ```
   confidence = min(適配器信心度)
   verdict = 最負面判定
   ```

4. **樂觀**（最高信心度獲勝）：
   ```
   confidence = max(適配器信心度)
   verdict = 最正面判定
   ```

**配置**：
```typescript
const engine = new VerificationEngine({
  aggregationStrategy: 'weighted-average',
  adapterWeights: {
    'contradiction-detector': 0.4,
    'pattern-validator': 0.3,
    'confidence-scorer': 0.3
  }
});
```

### 6. 結果格式化器

**職責**：為客戶端消費構建結果結構。

**輸出格式**：
```typescript
interface AggregatedResult {
  claim: string
  overall: 'verified' | 'contradicted' | 'uncertain'
  confidence: number  // 0-1
  sources: VerificationResult[]
  combinedReasoning: string
  processingTime: number
  issues?: Issue[]
  metadata?: Record<string, unknown>
}
```

## 資料流

### 驗證請求流程

```
1. MCP 客戶端發送驗證請求
   │
   ▼
2. MCP 伺服器接收並解析請求
   │
   ▼
3. 驗證引擎接收聲明
   │
   ├─> 從註冊表載入已註冊的適配器
   │
   ├─> 為每個適配器創建驗證 promise
   │   ├─> 適配器 1: ContradictionDetector.verify(claim)
   │   ├─> 適配器 2: PatternValidator.verify(claim)
   │   └─> 適配器 3: ConfidenceScorer.verify(claim)
   │
   ├─> 使用超時並行執行
   │   └─> Promise.race([
   │         Promise.all(adapterPromises),
   │         timeoutPromise
   │       ])
   │
   ├─> 收集結果
   │   ├─> 成功：加入結果陣列
   │   └─> 失敗：記錄錯誤，繼續處理其他適配器
   │
   ├─> 聚合結果
   │   ├─> 計算加權信心度
   │   ├─> 確定整體判定
   │   └─> 組合所有來源的推理
   │
   ├─> 格式化結果
   │   └─> 創建 AggregatedResult 結構
   │
   ▼
4. 回傳給 MCP 客戶端
```

### 適配器執行流程

```
Adapter.verify(claim, context)
   │
   ├─> 1. 驗證輸入
   │      └─> 檢查聲明是非空字串
   │
   ├─> 2. 檢查可用性
   │      └─> isAvailable()
   │         ├─> 可用：繼續
   │         └─> 不可用：回傳不確定結果
   │
   ├─> 3. 執行驗證邏輯
   │      └─> 適配器特定實作
   │
   ├─> 4. 計算信心度
   │      └─> 基於發現的 0-1 範圍
   │
   ├─> 5. 生成推理
   │      └─> 人類可讀的解釋
   │
   ├─> 6. 構建結果結構
   │      └─> VerificationResult 物件
   │
   └─> 7. 回傳結果
```

## 設計原則

### 1. 簡潔優先

**原則**：預設使用簡單、經過驗證的模式，而非複雜的解決方案。

**應用**：
- 單檔實作，直到複雜度需要拆分
- 沒有明確理由不使用框架
- 偏好可讀程式碼而非巧妙最佳化
- 目標每次變更 <100 行

### 2. 可插拔架構

**原則**：在不修改核心程式碼的情況下實現可擴展性。

**應用**：
- 定義良好的適配器介面
- 用於動態載入的註冊表模式
- 沒有硬編碼的適配器依賴
- 自定義適配器與內建適配器平等對待

**優點**：
- 使用者可以新增自己的事實來源
- 易於隔離測試適配器
- 社群可以建立適配器生態系統
- 無需 fork 即可自定義

### 3. 優雅失敗

**原則**：即使組件失敗，系統也應保持功能。

**應用**：
- 每個適配器錯誤隔離
- 部分失敗的備用策略
- 帶有恢復建議的清晰錯誤訊息
- 降級操作優於完全失敗

**範例**：
```javascript
// 如果一個適配器失敗，其他適配器繼續
try {
  results.push(await adapter.verify(claim));
} catch (error) {
  logger.warn(`適配器 ${adapter.name} 失敗:`, error);
  // 繼續處理其他適配器
}

// 如果有可用結果則回傳部分結果
if (results.length > 0) {
  return aggregateResults(results, { partial: true });
}
```

### 4. 設計效能

**原則**：架構應該在不需要複雜最佳化的情況下實現良好效能。

**應用**：
- 預設並行適配器執行
- 超時強制防止慢速適配器阻塞其他適配器
- 內建適配器設計為 <500ms 回應
- 多層級快取機會

**效能目標**：
- 內建適配器：每個 <500ms
- 總驗證：3 個適配器 <1s
- 並發請求：透過 Node.js 非同步支援

### 5. 可觀察和可除錯

**原則**：系統行為應易於理解和除錯。

**應用**：
- 結果中的詳細推理
- 處理時間追蹤
- 適配器層級結果可見性
- 帶有上下文的清晰錯誤訊息

## 可擴展性

### 新增自定義適配器

**要求**：
1. 實作 `FactSourceAdapter` 介面
2. 回傳 `VerificationResult` 格式
3. 優雅地處理錯誤
4. 實作 `isAvailable()` 檢查

**整合點**：
```javascript
// 1. 創建適配器
class MyAdapter implements FactSourceAdapter {
  name = 'my-adapter';
  description = '我的自定義事實來源';

  async verify(claim, context) {
    // 實作
  }

  async isAvailable() {
    // 健康檢查
  }
}

// 2. 向 FactGate 註冊
const factgate = new FactGate();
factgate.registerAdapter(new MyAdapter());

// 3. 立即使用
await factgate.verify(claim);
```

### 擴展點

1. **自定義聚合策略**
   ```typescript
   class CustomAggregator implements AggregationStrategy {
     aggregate(results: VerificationResult[]): AggregatedResult
   }
   ```

2. **結果格式化器**
   ```typescript
   class CustomFormatter implements ResultFormatter {
     format(result: AggregatedResult): FormattedOutput
   }
   ```

3. **快取層**
   ```typescript
   class CustomCache implements CacheStrategy {
     get(key: string): AggregatedResult | null
     set(key: string, value: AggregatedResult): void
   }
   ```

## 效能考量

### 可擴展性

**當前規模**：單伺服器部署
- **預期負載**：<1000 次驗證/分鐘
- **並發請求**：由 Node.js 事件迴圈處理
- **記憶體**：<100MB 基線 + 適配器開銷

**未來擴展選項**：
- 水平擴展：負載平衡器後的多個 FactGate 實例
- 適配器快取：Redis/Memcached 用於重複聲明
- 非同步處理：用於批次驗證的訊息佇列

### 最佳化機會

1. **聲明快取**
   - 快取鍵：標準化聲明文字
   - TTL：可配置（預設 1 小時）
   - 命中率：典型工作負載預期 20-30%

2. **適配器結果快取**
   - 每個適配器快取
   - 穩定來源的較長 TTL
   - 需要失效策略

3. **並行執行**
   - 預設已實作
   - 無需額外最佳化

4. **延遲適配器載入**
   - 按需載入自定義適配器
   - 減少啟動時間

## 安全性

### 威脅模型

**範圍內**：
- 惡意輸入聲明（注入嘗試）
- 資源耗盡（透過慢速適配器的 DoS）
- 不受信任的自定義適配器

**範圍外**（由 MCP/部署處理）：
- 網路安全（TLS、認證）
- 存取控制
- 速率限制

### 安全措施

1. **輸入驗證**
   ```javascript
   function validateClaim(claim) {
     if (typeof claim !== 'string') {
       throw new Error('聲明必須是字串');
     }
     if (claim.length > MAX_CLAIM_LENGTH) {
       throw new Error('聲明超過最大長度');
     }
     // 額外的淨化
   }
   ```

2. **超時強制**
   - 防止慢速適配器阻塞系統
   - 預設：每個適配器 5 秒
   - 每個適配器可配置

3. **適配器沙箱化**
   - 自定義適配器在相同處理程序中執行（信任模型）
   - 未來：考慮工作執行緒進行隔離
   - 錯誤不會使主處理程序崩潰

4. **資源限制**
   ```javascript
   const limits = {
     maxAdapters: 10,
     maxClaimLength: 10000,
     maxConcurrentVerifications: 100,
     adapterTimeout: 5000
   };
   ```

## 參見

- [API 參考](API.zh-TW.md) - 完整 API 文檔
- [快速開始](QUICKSTART.zh-TW.md) - 入門指南
- [使用範例](EXAMPLES.zh-TW.md) - 使用範例
- [開發指南](DEVELOPMENT.zh-TW.md) - 貢獻

---

**🌏 English** / [Architecture](../ARCHITECTURE.md)