# NS Turing — AI Image Generation for Photoshop

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

A Photoshop UXP panel plugin that integrates AI image generation directly into your workflow. Generate images via text prompt (text-to-image) or use your canvas and reference images as input (image-to-image). Results are automatically placed as Smart Object layers.

### Features

- **Text-to-Image**: Describe what you want, AI generates it
- **Image-to-Image**: Use canvas, uploaded images, or selected layers as visual references
- **Multi-Provider**: Supports OpenAI (gpt-image-2) and Google Gemini (gemini-3-pro-image-preview, etc.)
- **Provider Management**: Cherry Studio-style — add multiple API providers, each with their own key, URL, and model list
- **Auto-Placement**: Generated images are automatically inserted as Smart Object layers into the active document
- **Reference Sources**: Canvas / local uploads / layer selection — up to 10 references total
- **PS Theme Aware**: Automatically adapts to Photoshop's light/dark theme

### Requirements

| Dependency | Version |
|------------|---------|
| Photoshop | ≥ 23.0.0 |
| UXP Developer Tool | Latest |

**You also need your own API key** — see [API Key Setup](#api-key-setup) below.

### Installation

> **Note**: The plugin is distributed as a `.ccx` file. You need the free [UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/devtool/) to install it.

1. Download `ns-turing-v0.1.0.ccx` from [GitHub Releases](https://github.com/NeoStudio-AI/plugin-ns-turing/releases)
2. Open **UXP Developer Tool** (UDT)
3. Click **Install Plugin** → select the `.ccx` file
4. In Photoshop: **Plugins** menu → **NS Turing**

### API Key Setup

This plugin does **NOT** include any API keys. You must provide your own:

| Provider | Get API Key From | Default Endpoint |
|----------|-----------------|------------------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `https://api.openai.com` |
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `https://generativelanguage.googleapis.com` |

1. Open the plugin panel → click the ⚙️ settings icon
2. Add a provider → choose type → enter your API Key and URL
3. Click "Fetch Models" to populate the model list
4. Select which models to enable → Save

### Supported Models

| Model | Provider | Type |
|-------|----------|------|
| gpt-image-2 | OpenAI | Text-to-Image + Image-to-Image |
| gemini-3-pro-image-preview | Google Gemini | Text-to-Image + Image-to-Image |
| gemini-3.1-flash-image-preview | Google Gemini | Text-to-Image + Image-to-Image |

> More models can be added by configuring additional providers in Settings.

### Reference Image Order (Image-to-Image)

When using image-to-image, references are sent to the API in a fixed order:

| Position | Source | Notes |
|----------|--------|-------|
| Image 1 | Canvas | Always first (if "Use canvas as reference" is checked) |
| Image 2–N | Uploaded images | User-uploaded files |
| Image N+1– | Layer images | Selected layers |

You can refer to images by position in your prompt, e.g.: *"Use Image 1 (the canvas scene) as the background, and replace the character with the person in Image 2."*

### Privacy

- This plugin does **NOT** collect or transmit any user data
- Your API keys are stored **locally** in Photoshop's plugin data directory
- All API requests go **directly** to the provider endpoints you configure
- No telemetry, no analytics, no third-party servers

### License

MIT © 2026 NeoStudio

---

<a name="chinese"></a>
## 中文

一款 Photoshop UXP 面板插件，在 PS 内直接调用 AI 模型生成图片。支持文生图 / 图生图，生成结果自动置入为智能对象图层。

### 功能

- **文生图**：输入提示词，AI 直接生成图片
- **图生图**：以画布、上传图片、选中图层为参考，生成新图片
- **多模型支持**：OpenAI (gpt-image-2)、Google Gemini (gemini-3-pro-image-preview 等)
- **服务商管理**：类 Cherry Studio 风格，可添加多个 API 服务商，各自配置 Key/URL/模型
- **自动置入**：生成的图片自动作为智能对象图层置入当前文档
- **参考图来源**：画布 / 本地上传 / 图层选择，上限 10 张
- **主题跟随**：自动适配 Photoshop 深色/浅色主题

### 环境要求

| 依赖 | 版本 |
|------|------|
| Photoshop | ≥ 23.0.0 |
| UXP Developer Tool | 最新版 |

**还需要自己的 API Key** — 详见下方 [API Key 配置](#api-key-配置)。

### 安装

> 插件以 `.ccx` 文件分发，需使用免费的 [UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/devtool/) 安装。

1. 从 [GitHub Releases](https://github.com/NeoStudio-AI/plugin-ns-turing/releases) 下载 `ns-turing-v0.1.0.ccx`
2. 打开 **UXP Developer Tool** (UDT)
3. 点击 **Install Plugin** → 选择 `.ccx` 文件
4. Photoshop 菜单 → **插件** → **NS Turing**

### API Key 配置

本插件**不内置任何 API Key**，需要自行获取：

| 服务商 | 获取地址 | 默认接口地址 |
|--------|---------|-------------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `https://api.openai.com` |
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `https://generativelanguage.googleapis.com` |

1. 打开插件面板 → 点击 ⚙️ 设置图标
2. 添加服务商 → 选择接口类型 → 填入 API Key 和接口地址
3. 点击"获取模型列表"拉取可用模型
4. 勾选要启用的模型 → 保存

### 支持模型

| 模型 | 提供商 | 类型 |
|------|--------|------|
| gpt-image-2 | OpenAI | 文生图 + 图生图 |
| gemini-3-pro-image-preview | Google Gemini | 文生图 + 图生图 |
| gemini-3.1-flash-image-preview | Google Gemini | 文生图 + 图生图 |

> 可在设置中配置更多服务商来添加其他模型。

### 图生图参考图顺序

参考图以固定顺序传给 AI 模型，可在 prompt 中通过位置指代：

| 位置 | 来源 | 说明 |
|------|------|------|
| Image 1 | 画布 | 始终第一张（勾选"画布作为参考图"时） |
| Image 2 ~ N | 上传参考图 | 用户上传的文件 |
| Image N+1 ~ | 图层参考图 | 选中的图层 |

例如 prompt 中可写：*"第一张参考图是场景画布，请将画布中的人物替换为第二张参考图中的角色。"*

### Prompt 示例

```
角色替换（画布场景 + 上传角色参考图）：

第一张参考图是场景画布，第二张是目标角色。
请完成角色替换：
1. 严格保留第一张参考图（画布）的场景、背景、构图、光影
2. 将画布中的人物替换为第二张参考图中的人物
3. 面部特征、发型、肤色、服装以第二张参考图为准
4. 不添加新物体，不改变场景色调
```

### 隐私说明

- 本插件**不收集**任何用户数据
- API Key 仅存储在 PS 插件本地数据目录中
- 所有 API 请求**直连**你配置的服务商端点
- 无遥测、无统计、无第三方服务器

### 许可证

MIT © 2026 NeoStudio
