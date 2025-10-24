# 為 FactGate 做貢獻

感謝您有興趣為 FactGate 做貢獻！本文件提供專案貢獻指南。

## 目錄

- [行為準則](#行為準則)
- [開始使用](#開始使用)
- [開發工作流程](#開發工作流程)
- [Pull Request 流程](#pull-request-流程)
- [提交訊息格式](#提交訊息格式)
- [翻譯指南](#翻譯指南)
- [問題與支援](#問題與支援)

## 行為準則

參與此專案即表示您同意維護尊重和協作的環境。在所有互動中保持友善、專業和體貼。

## 開始使用

### 先決條件

- Node.js 20.19.0 或更高版本
- npm 套件管理器
- Git

### 設定

1. **Fork 倉庫**
   ```bash
   # 在 GitHub 上點擊「Fork」
   ```

2. **Clone 您的 fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/FactGate.git
   cd FactGate
   ```

3. **添加 upstream 遠端**
   ```bash
   git remote add upstream https://github.com/AsiaOstrich/FactGate.git
   ```

4. **安裝依賴**
   ```bash
   npm install
   ```

## 開發工作流程

我們遵循 **GitHub Flow** 工作流程。詳細指南請參閱我們的[開發指南](DEVELOPMENT.zh-TW.md)，包括：

- 程式碼風格和命名慣例
- Git 分支策略
- 提交訊息慣例
- 測試需求

### 快速工作流程

1. **創建 feature 分支**
   ```bash
   git checkout master
   git pull upstream master
   git checkout -b feature/your-feature-name
   ```

2. **進行變更**
   - 遵循 [DEVELOPMENT.zh-TW.md](DEVELOPMENT.zh-TW.md) 中的編碼標準
   - 為新功能撰寫測試
   - 根據需要更新文檔

3. **提交變更**
   ```bash
   git add <files>
   git commit -m "feat(scope): 描述"
   ```

4. **保持分支更新**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

5. **推送到您的 fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **創建 Pull Request**
   - 前往 GitHub 上的原始倉庫
   - 點擊「New Pull Request」
   - 選擇您的分支
   - 填寫 PR 模板

## Pull Request 流程

### 提交前

- [ ] 程式碼遵循專案風格指南
- [ ] 完成自我審查
- [ ] 為複雜邏輯添加註解
- [ ] 更新文檔（如適用）
- [ ] 測試已新增/更新並通過
- [ ] 提交訊息遵循 Conventional Commits

### PR 模板

創建 PR 時，我們的模板會引導您提供：
- 變更摘要
- 變更類型
- 執行的測試
- 檢查清單完成情況

### 審查流程

1. **自動化檢查**在您的 PR 上運行（當配置 CI 時）
2. **維護者審查** - 至少需要一個批准
3. **處理反饋** - 進行請求的變更
4. **合併** - 維護者在批准後會合併

## 提交訊息格式

我們遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 類型

| 類型 | 描述 | 範例 |
|------|------|------|
| `feat` | 新功能 | `feat(adapters): 新增 Wikipedia 適配器` |
| `fix` | 錯誤修復 | `fix(validation): 處理 null 聲明` |
| `docs` | 文檔 | `docs: 更新安裝指南` |
| `style` | 程式碼格式 | `style: 修正縮排` |
| `refactor` | 程式碼重構 | `refactor(core): 簡化驗證邏輯` |
| `perf` | 效能改善 | `perf(cache): 最佳化查找` |
| `test` | 測試更新 | `test(adapters): 新增單元測試` |
| `chore` | 建置/工具 | `chore: 更新依賴` |

### 範圍

可選但建議使用。指示影響程式碼庫的哪個部分：
- `adapters` - 適配器系統
- `validators` - 內建驗證器
- `core` - 核心驗證邏輯
- `docs` - 文檔
- `config` - 配置

### 範例

```bash
# 好的提交訊息
feat(adapters): 新增可插拔適配器介面
fix(validation): 處理空聲明的邊界情況
docs: 為 README 新增中文翻譯
test(adapters): 為註冊表新增整合測試

# 不好的提交訊息（避免使用）
更新程式碼
修復錯誤
變更
進行中
```

## 翻譯指南

我們歡迎翻譯！FactGate 使用鏡像結構支援多種語言。

### 結構

所有翻譯都放在 `docs/zh-TW/`（或相應的語言代碼）下：

```
docs/
└── zh-TW/           # 繁體中文
    ├── README.zh-TW.md
    ├── DEVELOPMENT.zh-TW.md
    └── openspec/
        └── ...      # 鏡像英文結構
```

### 新增翻譯

1. **創建語言目錄**
   ```bash
   mkdir -p docs/zh-TW/
   ```

2. **翻譯文件**
   - 保持與英文版本相同的結構
   - 中文文件使用 `.zh-TW.md` 後綴
   - 維護格式和程式碼範例

3. **更新 README.md**
   - 在文檔區塊中添加您翻譯的連結

4. **提交 PR**
   - 使用提交訊息：`docs: 新增 [語言] 翻譯 [文件]`

### 翻譯同步

#### 對於 PR 作者

當修改英文文檔時：

1. **檢查翻譯**：查找 `docs/zh-TW/` 中的對應文件
2. **更新翻譯**：如果可以，在同一個 PR 中更新中文版本
3. **建立追蹤 Issue**：如果無法更新翻譯，請建立 Issue：
   - 標題：`[Translation] Update zh-TW for [filename]`
   - 標籤：`translation`、`documentation`
   - 連結到修改英文版本的 PR

#### 對於審核者

審核文檔 PR 時，請確認：

- [ ] 檢查 `docs/zh-TW/` 中是否存在對應翻譯
- [ ] 確認翻譯已更新或已建立追蹤 Issue
- [ ] 確保兩種語言版本維持相同的技術準確性

#### 翻譯狀態追蹤

- 我們使用帶有 `translation` 標籤的 GitHub Issues 來追蹤過期的翻譯
- 查看 [translation issues](https://github.com/AsiaOstrich/FactGate/labels/translation) 以了解待處理的更新

#### 可接受的更新延遲

- **小修正**（錯字、格式）：可延遲翻譯最多 7 天
- **重大更新**（新章節、重要變更）：應在同一個 PR 中翻譯
- **新功能/文檔**：必須同時包含英文和中文版本

## 問題與支援

### 提問前

- 檢查現有的 [Issues](https://github.com/AsiaOstrich/FactGate/issues)
- 閱讀[開發指南](DEVELOPMENT.zh-TW.md)
- 審查[專案上下文](openspec/project.zh-TW.md)

### 如何提問

1. **對於錯誤**：使用[錯誤報告模板](../../.github/ISSUE_TEMPLATE/bug_report_zh-TW.md)
2. **對於功能**：使用[功能請求模板](../../.github/ISSUE_TEMPLATE/feature_request_zh-TW.md)
3. **對於問題**：開啟一般 issue 並提供清楚的描述

## 專案結構

```
FactGate/
├── .github/              # GitHub 模板和工作流程
├── docs/                 # 多語言文檔
│   └── zh-TW/           # 繁體中文翻譯
├── openspec/            # OpenSpec 規格驅動開發
│   ├── changes/         # 變更提案
│   └── specs/           # 功能規格
├── DEVELOPMENT.md       # 開發指南
├── CONTRIBUTING.md      # 貢獻指南
└── README.md            # 專案概述
```

## 認可

貢獻者會在以下地方獲得認可：
- Git 提交歷史
- Pull Request 致謝
- 發布說明（如適用）

感謝您為 FactGate 做貢獻！🎉

---

🌏 [English Version / 英文版本](../../CONTRIBUTING.md)
