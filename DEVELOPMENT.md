# NS Turing — 开发文档

> Adobe Photoshop UXP 插件 | v0.1.0 | 最后更新：2026-06-15

---

## 1. 项目概述

**NS Turing** 是一款 Photoshop UXP 面板插件，支持用户在 PS 内调用 AI 图像生成模型（当前使用 Google Gemini），根据画布内容、上传参考图和选中图层自动生成图片，并置入为智能对象图层。

### 1.1 支持的模型

| 模型 ID | 供应商 | API Key | 状态 |
|---------|--------|---------|------|
| `gemini-3-pro-image-preview` | Google Gemini | 已配置（硬编码） | ✅ 可用 |
| `gemini-3.1-flash-image-preview` | Google Gemini | 已配置 | ✅ 可用 |
| `gpt-image-2` | OpenAI | 未配置 | ⚠️ 需配置 |

### 1.2 核心功能流程

```
用户输入 Prompt
   ↓
收集参考图（画布 / 上传 / 图层 → 顺序拼接）
   ↓
API 分发 → Gemini 生成
   ↓
返回 base64 PNG[]
   ↓
addImagesAsSmartObjects → 置入 PS 文档
```

---

## 2. 项目结构

```
manifest.json              # UXP 插件清单
index.html                 # 面板 HTML 入口
style.css                  # 面板样式
main.js                    # 启动脚本

js/
├── app.js                 # 应用控制器（生成流程编排）
├── config.js              # 默认配置
├── state.js               # 响应式状态管理
├── storage.js             # 本地持久化存储
├── photoshop.js           # ★ Photoshop 交互核心

├── api/
│   ├── dispatcher.js      # API 路由分发
│   ├── provider.js        # Provider 抽象基类
│   ├── openai.js          # OpenAI 适配器
│   └── gemini.js          # Gemini 适配器

├── ui/
│   ├── prompt.js          # 提示词输入框
│   ├── references.js      # 参考图管理（上传/切换）
│   ├── layers-picker.js   # 图层选择器
│   ├── model-selector.js  # 模型切换
│   ├── settings.js        # 设置面板（API Key 等）
│   ├── progress.js        # 生成进度条
│   └── panel.js           # 面板生命周期

└── utils/
    ├── dom.js             # DOM 工具
    └── image.js           # 图片大小验证
```

---

## 3. 核心模块详述

### 3.1 `photoshop.js` — Photoshop 交互核心

**三个关键函数**：

#### `exportLayerAsBase64(layerId)` （第 280 行）

导出单个图层为 base64 PNG。经过 7 轮迭代最终采用 **DOM 切换 + targetEnum duplicate + 容器 resize** 方案。

**三 Modal 分离策略**（避免 PS 内部 `_handleDocumentEvent` 事件队列损坏）：

```
Modal 1 → Modal 2 → Modal 3
（创建+复制） （纯导出） （纯清理）
```

每个 modal 只有单一职责，PS 在 modal 之间处理内部事件队列。

#### `addImagesAsSmartObjects(base64Array)` （第 550 行）

将生成的图片置入文档。流程：解码 base64 → 写临时文件 → `open` → resize → `duplicate(targetEnum)` → `close` → `newPlacedLayer`。

#### `captureCanvasAsBase64()` （第 63 行）

导出整个画布为 PNG。使用 `saveAs.png()` 的 DOM API。

**UXP 平台关键约束（踩坑记录）**：

| 约束 | 说明 |
|------|------|
| `executeAsModal` | 所有修改 PS 状态的操作必须在此内 |
| `DataView` | UXP 沙箱中 `DataView` 构造函数不可用，直接用 `Uint8Array[index]` |
| `batchPlay make` | 无法创建新文档，必须用 `batchPlay open` 打开微型 PNG 作为容器 |
| `batchPlay paste` | UXP 中命令不可用 |
| `batchPlay select` | 文档切换不可靠，改用 DOM API `ps.app.activeDocument = doc` |
| `batchPlay duplicate` 多级 `_target` | UXP 不支持数组格式 |
| 1×1 容器裁剪 | 大尺寸图层复制到小容器时被裁剪为 1 像素，必须先 resize |
| `saveAs.png()` + 文档生命周期同 modal | 触发 PS 内部事件异常弹窗 |
| 图层可见性操作 | `set visible` 在 `executeAsModal` 中触发 PS 内部异常 |

---

### 3.2 `app.js` — 应用控制器

生成流程编排：

```
handleGenerate()
  ├── 校验：prompt 非空、文档已打开
  ├── collectReferenceImages() — 顺序收集三种参考源
  │     ├── 画布（canvasAsRef）→ captureCanvasAsBase64()
  │     ├── 上传图（uploadedRefs）
  │     └── 选中图层（layersAsRef）→ exportLayerAsBase64()
  ├── 验证图片大小（maxImageSizeMB: 20MB）
  ├── dispatch() → AI 生成
  └── addImagesAsSmartObjects() → 置入文档
```

**Prompt 空格处理**：`prompt.js` 中不 trim 输入（支持英文空格断词），仅在 `app.js` L74 提交时 trim 首尾。

---

### 3.3 API 层

**分发机制**（`dispatcher.js`）：
- 根据 `model.id` 前缀或定义自动匹配 Provider
- Provider 按需懒加载（`getProviderInstance`）
- API 请求封装为 `generateImage({ prompt, referenceImages, model, apiKey, ... })`

**Gemini 适配**（`gemini.js`）：遵循 Gemini vision API 规范，base64 图片直接传入 `inlineData`。

---

### 3.4 配置系统

`config.js` 提供默认配置，运行时可通过 `settings.js` 面板修改并持久化到 `config.json`：

```js
providers: [{ type, apiKey, apiUrl }]  // 服务商配置
models: [{ id, name, provider }]        // 可选模型
selectedModel                           // 默认模型
maxReferenceImages: 14                  // 最大参考图数
maxImageSizeMB: 20                      // 单图最大
```

---

## 4. 已解决的 Bug

### Bug #1：图层参考图导出弹窗 "无法完成请求，因为程序错误"

**根因**：`saveAs.png()`、`open`、`close`、`duplicate` 在同一个 `executeAsModal` 中执行，PS 内部 `_handleDocumentEvent` 异步事件处理器因 `close` 事件触发时文档已被销毁。

**7 轮迭代**：

| 轮次 | 方案 | 结果 | 关键发现 |
|------|------|------|----------|
| v1 | 可见性操作同 modal | ❌ 事件队列损坏 | 任何状态变更 + `saveAs.png()` 同 modal 都不行 |
| v2 | open + multi-level `_target` 同 modal | ⚠️ 无弹窗/内容空 | 多级 `_target` UXP 不支持 |
| v3 | duplicate 整文档同 modal | ❌ 弹窗 | 文档生命周期混乱 |
| v4 | 剪贴板：select+copy / open+paste | ❌ paste 不可用 | UXP 无 paste 命令 |
| v5 | 可见性三 modal | ❌ 可见性异常 | 可见性操作本身触发事件 |
| v6 | DOM 切换 + targetEnum（无 resize）| ⚠️ 纯色图 | 1×1 容器裁剪内容 |
| **v7** | **DOM 切换 + targetEnum + resize 三 modal** | ✅ | 完整方案 |

**最终正确流程**：

```
① open 1×1 PNG        → 容器活跃
② imageSize resize    → 容器匹配原始文档尺寸（关键！）
③ ps.app.activeDocument = orig    → DOM API 切回原始文档
④ batchPlay select 目标图层
⑤ batchPlay duplicate(targetEnum) → 复制到容器文档
⑥ ps.app.activeDocument = container → DOM API 切回容器
⑦ [Modal 2] saveAs.png
⑧ [Modal 3] close 容器
```

### Bug #2：Prompt 不支持空格输入

**原因**：`prompt.js` 的 `input` 事件中调用 `el.value.trim()`，每次按键都裁掉尾部空格。  
**修复**：移除 `input` 事件的 `.trim()`，仅在 `app.js` 提交时 trim。

---

## 5. 已知问题与待办

| 优先级 | 项 | 说明 |
|--------|---|------|
| P2 | OpenAI 模型不可用 | `config.js` 中 OpenAI provider `apiKey` 为空，需在设置面板配置 |
| P3 | 控制台 PS 内部异常 | `_handleDocumentEvent` 的 "文档 4106 does not exist" 为 PS 内部无害错误，不影响功能 |
| P3 | `[DP] SELECT called with no target name` | UXP 内部日志，不影响功能 |

---

## 6. 开发环境

- **开发工具**：UDT (UXP Developer Tool) 加载插件到 PS
- **调试**：UDT 控制台查看 `console.log`
- **PS 版本要求**：≥ 23.0.0
- **权限**：`localFileSystem: fullAccess`、`network: all domains`

---

## 7. 技术备忘

### 跨文档图层复制（UXP 安全方案）

```
前置：容器文档尺寸必须匹配源文档（否则裁剪）
① open 微型 PNG 作为容器文档
② imageSize resize 容器到源文档尺寸
③ ps.app.activeDocument = sourceDoc    ← DOM API 切换
④ batchPlay select 目标图层
⑤ batchPlay duplicate { _target: targetEnum, to: containerDocId }
⑥ ps.app.activeDocument = containerDoc  ← DOM API 切回
```

### 避免 PS 弹窗的铁律

> **`saveAs.png()` 绝不能与文档生命周期操作（open / close / duplicate）在同一个 `executeAsModal` 中。**

违反此规则 → "无法完成请求，因为程序错误" 弹窗。
