# NS Turing v0.2.0

**NS Turing** 是一款专为 Adobe Photoshop 设计的 AI 图像生成 UXP 面板插件，将文生图与图生图工作流深度整合到 PS 中，让设计师无需离开 PS 即可使用 AI 生成图像。

---

## ✨ 核心功能

- **双模式生成**：文生图（Text-to-Image）与图生图（Image-to-Image）完整支持
- **多服务商支持**：内置 Google Gemini（`gemini-3-pro-image-preview` / `gemini-3.1-flash-image-preview`）和 OpenAI（`gpt-image-2`）适配器，支持独立 Key / URL / 模型配置
- **三级参考图来源**：画布截图 → 上传文件 → 选中图层，三源按序拼接为多帧参考图
- **Smart Object 输出**：生成结果自动置入为智能对象图层，可无损变换
- **深色 / 浅色主题**：完整适配 PS 双主题，UI 无违和感

---

## 🆕 v0.2.0 相比 v0.1.0 的变化

### 架构升级：React 18 重构

| 模块 | v0.1.0 | v0.2.0 |
|---|---|---|
| 渲染层 | 原生 DOM 操作（vanilla JS） | React 18 + Webpack |
| 状态管理 | 自建 state.js | React useReducer + Context |
| UI 组件 | 原生 HTML 控件 | Spectrum Web Components（sp-*） |
| 构建 | 无 | Webpack 5 + SWC |
| 包大小 | 单文件 ES module | bundle.js + 分层模块 |

### UI 组件全面 Spectrum 化

为提升 UXP CEF 兼容性，将原生 HTML 控件统一替换为 Spectrum Web Components：

| 原生 | 替代 |
|---|---|
| `<button>` | `<span role="button" tabIndex={0}>` |
| `<input type="text">` | `<sp-textfield>` |
| `<input type="checkbox">` | `<sp-checkbox>` + 整行 click 兜底 |
| `<select>` | `<sp-picker>` + `<sp-menu>` |
| `<textarea>` | `<sp-textarea>` |

### 新增功能

- **API 服务商管理界面**：完整的 CRUD 操作（添加 / 编辑 / 删除 / 配置）
- **删除二次确认**：用状态导航替代 `window.confirm()`（UXP CEF 不支持弹窗）
- **接口类型选择器**：使用 `sp-picker` 统一所有下拉控件
- **模型选择器**：使用 `sp-picker` + `<sp-menu>`，支持服务商切换后自动加载模型列表
- **密钥显示/隐藏切换**：API 密钥输入框支持眼睛图标切换明文
- **图标双主题适配**：dark / light SVG 双套，根据 PS 主题自动切换

---

## 🧩 技术架构

| 层 | 技术 |
|---|---|
| 平台 | Adobe UXP（Photoshop >= 24.4.0） |
| UI 框架 | React 18.2.0 + Spectrum Web Components |
| 构建工具 | Webpack 5 + SWC |
| 运行时 | Node.js 18 / 20 / 21+ |
| 图像处理 | sharp 0.34.5（多平台多架构） |
| AI 服务 | Google Gemini / OpenAI |
| 插件 ID | `com.neostudio.turing` |
| 最低 PS 版本 | 24.4.0 |

---

## 📦 安装

1. 下载 `NS-Turing-v0.2.0.ccx`（约 460KB）
2. 使用 UXP Developer Tool 加载或双击安装
3. 在设置面板（齿轮图标）配置 API Key 即可使用

---

## 🎨 UI 设计与交互规范

详细规范见 [`docs/DESIGN_CHECKLIST.md`](docs/DESIGN_CHECKLIST.md)。

---

## 🐛 已知问题

- OpenAI 模型需在设置面板自行配置 API Key
- 控制台偶现 PS 内部 `_handleDocumentEvent` 异常日志，不影响功能
- 主题切换时已加载的图标不会实时跟随，需重新打开面板（待优化）

---

## 📝 许可证

MIT © NeoStudio# NS Turing v0.1.0

**NS Turing** 是一款专为 Adobe Photoshop 设计的 AI 图像生成 UXP 面板插件，将文生图与图生图工作流深度整合到 PS 中，让设计师无需离开 PS 即可使用 AI 生成图像。

---

## ✨ 核心功能

- **双模式生成**：文生图（Text-to-Image）与图生图（Image-to-Image）完整支持
- **多服务商支持**：内置 Google Gemini（`gemini-3-pro-image-preview` / `gemini-3.1-flash-image-preview`）和 OpenAI（`gpt-image-2`）适配器，支持独立 Key/URL/模型配置
- **三级参考图来源**：画布截图 → 上传文件 → 选中图层，三源按序拼接为多帧参考图
- **Smart Object 输出**：生成结果自动置入为智能对象图层，可无损变换
- **深色/浅色主题**：完整适配 PS 双主题，UI 无违和感

## 🧩 技术架构

| 层 | 技术 |
|---|---|
| 平台 | Adobe UXP（Photoshop >= 23.0.0） |
| 运行时 | Node.js 18 / 20 / 21+ |
| 图像处理 | sharp 0.34.5（多平台多架构） |
| AI 服务 | Google Gemini / OpenAI |
| 插件 ID | `com.neostudio.turing` |

## 📦 安装

1. 下载 `NS-Turing-v0.1.0.ccx`
2. 使用 UXP Developer Tool 加载或双击安装
3. 在设置面板配置 API Key 即可使用

## 🐛 已知问题

- OpenAI 模型需在设置面板自行配置 API Key
- 控制台偶现 PS 内部 `_handleDocumentEvent` 异常日志，不影响功能

## 📝 许可证

MIT © NeoStudio
