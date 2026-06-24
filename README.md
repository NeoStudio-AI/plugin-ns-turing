# NS Turing - AI Image Generation for Photoshop

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

A Photoshop UXP panel plugin that integrates AI image generation directly into your workflow. Generate images via text prompt (text-to-image) or use your canvas and reference images as input (image-to-image). Results are automatically placed as Smart Object layers.

> Current version: **v0.2.0** (React 18 + Spectrum Web Components rewrite)

### Features

- **Text-to-Image**: Describe what you want, AI generates it
- **Image-to-Image**: Use canvas, uploaded images, or selected layers as visual references
- **Multi-Provider Management**: Add multiple API providers (OpenAI, Google Gemini), each with their own key, URL, and model list
- **Auto-Placement**: Generated images are automatically inserted as Smart Object layers into the active document
- **Reference Sources**: Canvas / local uploads / layer selection - up to 10 references total
- **PS Theme Aware**: Automatically adapts to Photoshop's light/dark theme

### Requirements

| Dependency | Version |
|------------|---------|
| Photoshop | >= 24.4.0 |
| UXP Developer Tool | Latest |

**You also need your own API key** - see [API Key Setup](#api-key-setup) below.

### Installation

> **Note**: The plugin is distributed as a `.ccx` file. You need the free [UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/devtool/) to install it.

1. Download `NS-Turing-v0.2.0.ccx` from [GitHub Releases](https://github.com/NeoStudio-AI/plugin-ns-turing/releases/tag/v0.2.0)
2. Open **UXP Developer Tool** (UDT)
3. Click **Add Plugin** -> select the `.ccx` file
4. In Photoshop: **Plugins** menu -> **NS Turing**

### API Key Setup

This plugin does **NOT** include any API keys. You must provide your own:

| Provider | Get API Key From | Default Endpoint |
|----------|------------------|------------------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `https://api.openai.com` |
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `https://generativelanguage.googleapis.com` |

1. Open the plugin panel -> click the gear icon
2. Go to **API Provider Management** -> **+ Add Provider**
3. Enter name -> select type -> save
4. Click the new provider card -> enter API Key and URL
5. Click **Fetch Model List** -> enable desired models -> **Save**

### Supported Models

| Model | Provider | Type |
|-------|----------|------|
| `gpt-image-2` | OpenAI | Text-to-Image + Image-to-Image |
| `gemini-3-pro-image-preview` | Google Gemini | Text-to-Image + Image-to-Image |
| `gemini-3.1-flash-image-preview` | Google Gemini | Text-to-Image + Image-to-Image |

> More models can be added by configuring additional providers.

### Reference Image Order (Image-to-Image)

When using image-to-image, references are sent to the API in a fixed order:

| Position | Source |
|----------|--------|
| Image 1 | Canvas (if "Use canvas as reference" is checked) |
| Image 2-N | Uploaded images |
| Image N+1- | Selected layers |

### Privacy

- This plugin does **NOT** collect or transmit any user data
- Your API keys are stored **locally** in Photoshop's plugin data directory
- All API requests go **directly** to the provider endpoints you configure
- No telemetry, no analytics, no third-party servers

### License

MIT (c) 2026 NeoStudio

---

<a name="chinese"></a>
## 中文

一款 Photoshop UXP 面板插件，在 PS 内直接调用 AI 模型生成图片。支持文生图 / 图生图，生成结果自动置入为智能对象图层。

> 当前版本：**v0.2.0**（React 18 + Spectrum Web Components 重构）

### 功能

- **文生图**：输入提示词，AI 直接生成图片
- **图生图**：以画布、上传图片、选中图层为参考，生成新图片
- **多服务商管理**：可添加多个 API 服务商（OpenAI / Google Gemini），各自配置 Key / URL / 模型
- **自动置入**：生成的图片自动作为智能对象图层置入当前文档
- **参考图来源**：画布 / 本地上传 / 图层选择，上限 10 张
- **主题跟随**：自动适配 Photoshop 深色/浅色主题

### 环境要求

| 依赖 | 版本 |
|------|------|
| Photoshop | >= 24.4.0 |
| UXP Developer Tool | 最新版 |

**还需要自己的 API Key** - 详见下方 [API Key 配置](#api-key-配置)。

### 安装

> 插件以 `.ccx` 文件分发，需使用免费的 [UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/devtool/) 安装。

1. 从 [GitHub Releases](https://github.com/NeoStudio-AI/plugin-ns-turing/releases/tag/v0.2.0) 下载 `NS-Turing-v0.2.0.ccx`
2. 打开 **UXP Developer Tool** (UDT)
3. 点击 **Add Plugin** -> 选择 `.ccx` 文件
4. Photoshop 菜单 -> **插件** -> **NS Turing**

### API Key 配置

本插件**不内置任何 API Key**，需要自行获取：

| 服务商 | 获取地址 | 默认接口地址 |
|--------|---------|-------------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `https://api.openai.com` |
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `https://generativelanguage.googleapis.com` |

1. 打开插件面板 -> 点击右上角齿轮图标
2. 进入「API 服务商管理」-> 「+ 添加服务商」
3. 输入名称 -> 选择接口类型 -> 保存
4. 点击服务商卡片 -> 填入 API Key 和接口地址
5. 点击「获取模型列表」-> 勾选启用模型 -> 保存

### 支持模型

| 模型 | 提供商 | 类型 |
|------|--------|------|
| `gpt-image-2` | OpenAI | 文生图 + 图生图 |
| `gemini-3-pro-image-preview` | Google Gemini | 文生图 + 图生图 |
| `gemini-3.1-flash-image-preview` | Google Gemini | 文生图 + 图生图 |

> 可在服务商管理中配置更多服务商来添加其他模型。

### 图生图参考图顺序

参考图以固定顺序传给 AI 模型：

| 位置 | 来源 |
|------|------|
| Image 1 | 画布（勾选"画布作为参考图"时）|
| Image 2 ~ N | 上传参考图 |
| Image N+1 ~ | 图层参考图 |

### 隐私说明

- 本插件**不收集**任何用户数据
- API Key 仅存储在 PS 插件本地数据目录中
- 所有 API 请求**直连**你配置的服务商端点
- 无遥测、无统计、无第三方服务器

### 许可证

MIT (c) 2026 NeoStudio
