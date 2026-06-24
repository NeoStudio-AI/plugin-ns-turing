# NS Turing v0.2.0 - Release Notes

**Release Date**: 2026-06-23
**Minimum Photoshop**: 24.4.0
**Plugin ID**: `com.neostudio.turing`

---

## Highlights

v0.2.0 is a **major architecture refactor + UI upgrade**:

- Rendering layer rebuilt from vanilla JS to **React 18**
- UI controls migrated from native HTML to **Spectrum Web Components**
- Added **API Provider Management** interface (add / edit / delete / configure)

All existing features preserved. **No changes to user workflow.**

---

## New Features

### API Provider Management (gear icon -> API Provider Management)

- **Add provider**: Support OpenAI / Google Gemini
- **Edit provider**: Modify name / switch type
- **Delete provider**: With secondary confirmation (prevent accidents)
- **Configure provider**: Set API Key, API URL, enable/disable models
- **Multiple providers**: Support multiple OpenAI / Gemini providers with independent keys and model lists

### UI Controls Upgraded

| Before | After |
|---|---|
| Native `<select>` | `<sp-picker>` Spectrum dropdown (unified visual) |
| Native `<input>` | `<sp-textfield>` / `<sp-textarea>` Spectrum input |
| Native `<input type="checkbox">` | `<sp-checkbox>` Spectrum checkbox |
| Eye icon for API key | Support show / hide API key |

---

## Architecture Upgrade

| Layer | v0.1.0 | v0.2.0 |
|---|---|---|
| Rendering | Native DOM | React 18 + Webpack 5 |
| State | Custom state.js | useReducer + Context |
| UI Controls | Native HTML | Spectrum Web Components |
| Build | None (ES Module) | Webpack 5 + SWC + Babel |
| Bundle | Single file | bundle.js + layered modules |

---

## Bug Fixes

- API provider list lost on restart (now persisted to config.json)
- Delete provider had no confirmation (now has confirmation page)
- Checkbox rendering offset in UXP CEF
- Multiple UI element vertical alignment issues
- Model selector not refreshing on provider switch

---

## Installation

1. Download `NS-Turing-v0.2.0.ccx` (~460KB)
2. Open UXP Developer Tool
3. Click "Add Plugin" -> select .ccx file
4. After loading: Photoshop -> Plugins menu -> NS Turing

Or double-click .ccx to install directly (on configured UXP systems).

---

## First-Time Setup

1. Open plugin panel, click gear icon (top-right)
2. Go to "API Provider Management"
3. Click "+ Add Provider"
4. Enter name (e.g. "My OpenAI"), select type, save
5. Click the newly added provider card
6. Fill in API Key and API URL
7. Click "Fetch Model List" -> check models to enable
8. Click "Save Configuration"

---

## Known Issues

- OpenAI provider requires user to provide own API Key (no built-in default Key)
- Icons do not update in real-time when PS theme switches; reopen the panel
- PS internal `_handleDocumentEvent` warnings occasionally appear in console (harmless)

---

## Upgrade from v0.1.0

**Direct over-install** works. v0.1.0 API Key configurations (in settings panel) are preserved.

---

## License

MIT (c) NeoStudio
# NS Turing v0.2.0 — 发布说明

**发布日期**：2026-06-23
**最低 Photoshop 版本**：24.4.0
**插件 ID**：`com.neostudio.turing`

---

## 🎯 升级重点

v0.2.0 是一次**底层架构重构 + UI 全面升级**：

- 渲染层从 vanilla JS 重构为 **React 18**
- UI 组件从原生 HTML 控件全面替换为 **Spectrum Web Components**
- 引入 API 服务商管理界面（添加 / 编辑 / 删除 / 配置）

升级后所有功能保持不变，**用户操作习惯无需调整**。

---

## 🆕 新增功能

### API 服务商管理（齿轮图标 → API 服务商管理）

- **添加服务商**：支持 OpenAI / Google Gemini 等类型
- **编辑服务商**：修改名称 / 切换类型
- **删除服务商**：带二次确认（避免误删）
- **配置服务商**：分别设置 API Key / API 地址 / 选择可用模型
- **多服务商并存**：可配置多个 OpenAI / Gemini 服务商，独立 Key 独立模型列表

### UI 控件升级

| 之前 | 现在 |
|---|---|
| 原生 `<select>` 下拉 | `<sp-picker>` Spectrum 下拉（视觉统一） |
| 原生 `<input>` 输入 | `<sp-textfield>` / `<sp-textarea>` Spectrum 输入 |
| 原生 `<input type="checkbox">` | `<sp-checkbox>` Spectrum 复选框 |
| 眼睛图标切换密钥明文 | 支持查看 / 隐藏 API 密钥 |

---

## 🔧 架构升级

| 层 | v0.1.0 | v0.2.0 |
|---|---|---|
| 渲染 | 原生 DOM | React 18 + Webpack 5 |
| 状态 | 自建 state.js | useReducer + Context |
| UI 控件 | 原生 HTML | Spectrum Web Components |
| 构建 | 无（ES Module） | Webpack 5 + SWC + Babel |
| 包大小 | 单文件 | bundle.js + 分层模块 |

---

## 🐛 已修复

- API 服务商列表在重启后丢失（之前未持久化，现已写入 config.json）
- 删除服务商无确认（已加二次确认页）
- 复选框在 UXP CEF 中渲染错位
- 多个 UI 元素垂直对齐异常
- 模型选择器在服务商切换后未刷新

---

## 📦 安装方法

1. 下载 `NS-Turing-v0.2.0.ccx`（约 460KB）
2. 打开 UXP Developer Tool
3. 点击 "Add Plugin" → 选择 .ccx 文件
4. 加载后在 Photoshop → 插件菜单 → NS Turing

或双击 .ccx 文件直接安装（已配置好 UXP 的系统）。

---

## ⚙️ 首次使用配置

1. 打开插件面板，点击右上角齿轮图标
2. 进入「API 服务商管理」
3. 点击「+ 添加服务商」
4. 输入名称（如 "My OpenAI"），选择类型，保存
5. 点击刚添加的服务商卡片
6. 填入 API Key 和 API 地址
7. 点击「获取模型列表」→ 勾选要启用的模型
8. 点击「保存配置」

---

## 🐛 已知问题

- OpenAI 提供商需要用户自己配置 API Key（无内置默认 Key）
- 主题切换时已加载的图标不会实时跟随，需重新打开面板
- 控制台偶现 PS 内部 `_handleDocumentEvent` 异常日志，不影响功能

---

## 🔄 从 v0.1.0 升级

**直接覆盖安装**即可。v0.1.0 的 API Key 配置（在设置面板里）会保留下来。

---

## 📝 许可证

MIT © NeoStudio
