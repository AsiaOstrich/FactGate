# 快速開始指南

> **🚧 開發狀態**：FactGate 目前正在積極開發中。本指南描述基於設計規格的計劃用法。某些功能可能尚未完全實作。

## 概述

FactGate 是一個 MCP（Model Context Protocol）伺服器，透過提供即時事實查證和驗證功能來防止 AI 幻覺。它可以與 Claude 和其他 AI 系統整合，根據可靠的知識來源驗證生成的內容。

## 先決條件

- **Node.js**：版本 20.19.0 或更高
- **npm**：套件管理器（隨 Node.js 一起提供）
- **基本 MCP 知識**：熟悉 Model Context Protocol（可選但有幫助）

## 安裝

### 1. Clone 倉庫

```bash
git clone https://github.com/AsiaOstrich/FactGate.git
cd FactGate
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 驗證安裝

```bash
# 檢查 Node.js 版本
node --version  # 應該 >= 20.19.0

# 驗證依賴
npm list --depth=0
```

## 基本配置

### MCP 伺服器設定

FactGate 作為 MCP 伺服器運行。在您的 MCP 客戶端（例如 Claude Desktop）中配置它：

**範例 `claude_desktop_config.json`：**

```json
{
  "mcpServers": {
    "factgate": {
      "command": "node",
      "args": ["/path/to/FactGate/index.js"],
      "env": {}
    }
  }
}
```

### 適配器配置（計劃中）

FactGate 使用可插拔適配器來根據不同來源驗證資訊：

```javascript
// factgate.config.js（範例配置）
module.exports = {
  adapters: [
    {
      name: 'contradiction-detector',
      type: 'built-in',
      enabled: true
    },
    {
      name: 'pattern-validator',
      type: 'built-in',
      enabled: true
    },
    {
      name: 'confidence-scorer',
      type: 'built-in',
      enabled: true
    }
  ],
  // 鏈接多個適配器以進行全面驗證
  chainStrategy: 'all' // 或 'any', 'majority'
}
```

## 第一次驗證

### 使用內建驗證器

FactGate 包含三個無需外部依賴即可運作的內建驗證器：

#### 1. 矛盾檢測

檢查聲明是否與已知事實或先前陳述矛盾。

**範例 MCP 請求：**

```json
{
  "method": "verify",
  "params": {
    "claim": "地球是平的並繞著太陽轉。",
    "adapters": ["contradiction-detector"]
  }
}
```

**預期回應：**

```json
{
  "verified": false,
  "confidence": 0.05,
  "issues": [
    {
      "type": "contradiction",
      "message": "聲明包含內部矛盾：'平的'與'繞著太陽轉'矛盾",
      "severity": "high"
    }
  ],
  "sources": ["contradiction-detector"],
  "reasoning": "該聲明主張地球是平的，這與所描述的軌道力學矛盾。"
}
```

#### 2. 模式驗證

根據常見邏輯模式和結構驗證聲明。

**範例 MCP 請求：**

```json
{
  "method": "verify",
  "params": {
    "claim": "所有獨角獸都是隱形的，因此獨角獸不存在。",
    "adapters": ["pattern-validator"]
  }
}
```

**預期回應：**

```json
{
  "verified": false,
  "confidence": 0.3,
  "issues": [
    {
      "type": "logical-fallacy",
      "message": "檢測到循環推理",
      "severity": "medium"
    }
  ],
  "sources": ["pattern-validator"]
}
```

#### 3. 信心評分

基於聲明結構、具體性和可驗證性評估信心水平。

**範例 MCP 請求：**

```json
{
  "method": "verify",
  "params": {
    "claim": "有些人認為有時候事情會發生。",
    "adapters": ["confidence-scorer"]
  }
}
```

**預期回應：**

```json
{
  "verified": true,
  "confidence": 0.95,
  "issues": [
    {
      "type": "low-specificity",
      "message": "聲明過於模糊而無法證偽",
      "severity": "low"
    }
  ],
  "sources": ["confidence-scorer"],
  "reasoning": "雖然技術上是正確的，但該聲明缺乏具體可驗證的細節。"
}
```

### 鏈接多個驗證器

組合多個適配器以進行全面驗證：

**範例 MCP 請求：**

```json
{
  "method": "verify",
  "params": {
    "claim": "Python 是由 Guido van Rossum 在 1991 年發明的。",
    "adapters": ["contradiction-detector", "pattern-validator", "confidence-scorer"],
    "strategy": "all"
  }
}
```

**預期回應：**

```json
{
  "verified": true,
  "confidence": 0.92,
  "issues": [],
  "sources": ["contradiction-detector", "pattern-validator", "confidence-scorer"],
  "reasoning": "所有驗證器都同意。聲明具體、可驗證且不包含矛盾。",
  "details": {
    "contradiction-detector": { "passed": true, "confidence": 0.95 },
    "pattern-validator": { "passed": true, "confidence": 0.90 },
    "confidence-scorer": { "passed": true, "confidence": 0.91 }
  }
}
```

## 與 Claude 整合

### 在 Claude Desktop 中

配置為 MCP 伺服器後，FactGate 可以直接在 Claude 對話中使用：

**使用者**：「中國長城從太空中可見是真的嗎？」

**Claude**：讓我使用 FactGate 驗證這個說法...

*[Claude 呼叫 FactGate MCP 伺服器]*

**FactGate 回應**：
```json
{
  "verified": false,
  "confidence": 0.2,
  "issues": [
    {
      "type": "common-misconception",
      "message": "這是一個經常被揭穿的迷思",
      "severity": "medium"
    }
  ],
  "reasoning": "雖然廣為流傳，但這個說法與太空人和太空機構的驗證資訊矛盾。"
}
```

**Claude**：「根據事實查證，這實際上是一個常見的迷思。用肉眼無法從太空中看到長城，這已經得到太空人和 NASA 的證實。」

### 程式化整合

在您自己的應用程式中使用 FactGate：

```javascript
// Node.js 整合範例
const FactGate = require('factgate');

const factgate = new FactGate({
  adapters: ['contradiction-detector', 'pattern-validator']
});

async function validateClaim(claim) {
  const result = await factgate.verify(claim);

  if (result.confidence < 0.5) {
    console.warn(`低信心度 (${result.confidence}): ${claim}`);
    console.log('問題:', result.issues);
  }

  return result;
}

// 使用
validateClaim("水在海平面上 100°C 時沸騰。")
  .then(result => console.log('驗證:', result));
```

## 常見使用案例

### 1. AI 內容驗證

在向使用者展示之前驗證 AI 生成的內容：

```javascript
const aiResponse = await getAIResponse(prompt);
const verification = await factgate.verify(aiResponse);

if (verification.confidence > 0.8) {
  return aiResponse; // 高信心度
} else {
  return aiResponse + "\n\n⚠️ 注意：此資訊應該被驗證。";
}
```

### 2. 即時事實查證

在對話期間檢查聲明：

```javascript
function checkClaim(userMessage) {
  // 從使用者訊息中提取聲明
  const claims = extractClaims(userMessage);

  // 驗證每個聲明
  return Promise.all(
    claims.map(claim => factgate.verify(claim))
  );
}
```

### 3. 內容審核

標記可能的虛假資訊：

```javascript
async function moderateContent(content) {
  const result = await factgate.verify(content);

  if (result.issues.some(i => i.severity === 'high')) {
    return { approved: false, reason: '包含高嚴重性問題' };
  }

  return { approved: true };
}
```

## 效能預期

基於設計規格：

- **內建驗證器**：< 500ms 回應時間
- **鏈接適配器**：線性擴展（無明顯降級）
- **並發請求**：支援（Node.js 非同步模型）

## 故障排除

### 安裝問題

**問題**：`npm install` 失敗

**解決方案**：
```bash
# 清除 npm 快取
npm cache clean --force

# 重試安裝
rm -rf node_modules package-lock.json
npm install
```

### 版本問題

**問題**：「Node.js 版本過舊」

**解決方案**：
```bash
# 檢查當前版本
node --version

# 更新 Node.js（使用 nvm）
nvm install 20.19.0
nvm use 20.19.0
```

### MCP 連線問題

**問題**：Claude Desktop 無法連線到 FactGate

**解決方案**：
1. 驗證 `claude_desktop_config.json` 路徑正確
2. 檢查 Node.js 是否在您的 PATH 中
3. 更改配置後重啟 Claude Desktop
4. 檢查日誌：`~/Library/Logs/Claude/`（macOS）

## 下一步

- **閱讀 [API 文檔](API.zh-TW.md)** 以獲取詳細的端點參考
- **探索[使用範例](EXAMPLES.zh-TW.md)** 以了解進階場景
- **審查[架構](ARCHITECTURE.zh-TW.md)** 以了解系統設計
- **查看[開發指南](DEVELOPMENT.zh-TW.md)** 如果您想做出貢獻

## 獲取幫助

- **Issues**：[GitHub Issues](https://github.com/AsiaOstrich/FactGate/issues)
- **討論**：[GitHub Discussions](https://github.com/AsiaOstrich/FactGate/discussions)
- **文檔**：查看 `docs/` 目錄以獲取更多指南

---

**🌏 English** / [Quick Start Guide](../QUICKSTART.md)