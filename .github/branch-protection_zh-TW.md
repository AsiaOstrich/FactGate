# 分支保護規則

本文件描述 FactGate 倉庫的建議分支保護規則。

## Master 分支保護

### 建議設定

要配置分支保護，請訪問：
**https://github.com/AsiaOstrich/FactGate/settings/branches**

### 保護規則

1. **✅ 合併前需要 Pull Request 審查**
   - 必需的審查批准數：1
   - 有新提交時撤銷過時的審查：✅
   - 需要程式碼擁有者的審查：⚠️（如果有 CODEOWNERS 文件）

2. **✅ 合併前需要狀態檢查通過**
   - 合併前需要分支保持最新：✅
   - 狀態檢查：（隨著 CI/CD 配置逐步添加）

3. **✅ 合併前需要解決對話**
   - 所有 PR 對話必須在合併前解決

4. **✅ 限制誰可以推送到匹配的分支**
   - 只有倉庫管理員可以直接推送到 master
   - 僅用於緊急熱修復

5. **✅ 不允許繞過上述設定**
   - 管理員必須遵循相同的規則

### 配置步驟

1. 導航到倉庫 Settings → Branches
2. 點擊「Add branch protection rule」
3. 設定分支名稱模式：`master`
4. 啟用上述保護規則
5. 儲存變更

### 緊急熱修復流程

對於需要立即修復的關鍵生產問題：

1. 管理員直接推送到 master（僅限緊急情況）
2. 創建後續 PR 記錄熱修復
3. 透過適當管道通知團隊
4. 記錄事件和改進措施

### 最佳實踐

- **始終使用 Pull Request** 進行正常開發
- **保持 PR 專注** 於單一功能或修復
- **請求審查** 來自相關團隊成員
- **及時回應反饋**
- **保持 master 隨時可部署**

## 相關文檔

- [開發指南](../DEVELOPMENT.md) - Git 工作流程和編碼標準
- [貢獻指南](../CONTRIBUTING.md) - 如何為專案做貢獻
- [Pull Request 模板](pull_request_template.md) - PR 提交指南

---

🌏 **English Version** / [英文版本](branch-protection.md)
