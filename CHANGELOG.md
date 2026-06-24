# Changelog

所有版本变更记录在此文件。详细发布说明见 `docs/RELEASE-vX.Y.Z.md`。

---

## [v0.2.0] - 2026-06-23

**架构重构 + UI 升级**

### 重大变更

- 渲染层重构：vanilla JS → React 18 + Webpack 5
- UI 控件全面 Spectrum 化（sp-textfield / sp-textarea / sp-picker / sp-checkbox / sp-button）
- 引入 API 服务商管理界面（添加 / 编辑 / 删除 / 配置）
- 删除二次确认（用状态导航替代 `window.confirm()`，UXP CEF 不支持弹窗）

### 新增

- API 服务商 CRUD 完整流程
- API Key 明文 / 密文切换（眼睛图标）
- 接口类型选择器（sp-picker 统一所有下拉）
- 模型选择器（sp-picker + 切换服务商自动加载）

### 修复

- API 服务商配置重启后丢失
- sp-checkbox 在 UXP CEF 中渲染错位
- 多个 UI 元素垂直对齐 1-2px 偏移
- 模型列表在服务商切换后未刷新
- SVG icon fill="none" 渲染异常
- flex `gap` 在 UXP CEF 中不生效

完整发布说明：[docs/RELEASE-v0.2.0.md](docs/RELEASE-v0.2.0.md)
GitHub Release：https://github.com/NeoStudio-AI/plugin-ns-turing/releases/tag/v0.2.0

---

## [v0.1.0] - 2026-05

**首次发布**

### 功能

- 文生图 / 图生图
- 多服务商：Google Gemini（gemini-3-pro-image-preview / gemini-3.1-flash-image-preview）+ OpenAI（gpt-image-2）
- 三级参考图来源：画布 / 上传 / 图层
- 生成结果自动置入为智能对象图层
- 深色 / 浅色主题适配

GitHub Release：https://github.com/NeoStudio-AI/plugin-ns-turing/releases/tag/v0.1.0

---

## 版本命名规则

- **主版本号（Major）**：不兼容的重大变更
- **次版本号（Minor）**：新增功能（含 UI 重构）
- **修订号（Patch）**：Bug 修复

当前：**0.2.0**（次版本，0.x 阶段表示仍在开发中，1.0 为正式版）
