# 项目开发规范

## Git 提交规则
- **只有在用户明确指令时**才进行 `git commit` 和 `git push`
- 不要自动提交代码

## 开发流程规范
- **开发功能前先不着急动代码**
- 先明确需求
- 再思考可能的实现方案
- 等待用户确认后再进行代码修改

## 国际化规范
- 所有用户可见的文字都需要国际化
- 使用 `addon/locale/` 目录下的 `.ftl` 文件管理字符串
- 通过 `getString()` 函数获取本地化字符串

## 代码规范
- 使用英文注释
- 保持代码简洁，去除冗余代码和调试日志

## 已实现功能

### 阅读历史渲染功能 (Reading History Display)
**文件**: `src/modules/readingHistory.ts`
**方法**: `renderHistoryTable(panel, win)`

**实现方案**: 使用 Library Tab + VirtualizedTable

**功能特性**:
1. **Library Tab 注册**: 在左侧栏添加"阅读历史" Tab（与"我的文库"同级）
2. **表格渲染**: 使用 VirtualizedTable 显示历史记录，包含三列：
   - 标题 (title)
   - 作者 (authors)
   - 捕获时间 (captureTime)
3. **历史捕获**: 自动捕获打开的 PDF 并存储历史记录
4. **通知提示**: 捕获历史时显示 ProgressWindow 提示

**数据来源**:
- `HistoryStorage.getInstance().getAll()` 返回 `ReadingHistoryEntry[]`
- 每条记录包含: `id`, `captureTime`, `item` (ItemInfo)
- ItemInfo 包含: `id`, `title`, `authors`, `year`, `publication`, `doi`, `abstract`

**修改记录**:
- 2025-02-24: 实现基础 Library Tab 功能
- 2025-02-24: 使用 VirtualizedTable 显示历史记录
- 2025-02-24: 移除底部固定按钮，改用 Library Tab
