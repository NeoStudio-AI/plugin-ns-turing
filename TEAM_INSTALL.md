# NS Turing — 团队测试指南

> Photoshop UXP 插件 | v0.1.0

---

## 1. 安装步骤

### 前提条件
- **Photoshop 版本**：≥ 23.0.0（2022 年 10 月及之后版本）
- **系统**：Windows / macOS

### 安装方式：手动放置到插件目录（推荐）

> ⚠️ CCX 文件不能直接拖入 PS 窗口，PS 会将其误识别为图片文件。

**Windows**:
1. 关闭 Photoshop
2. 将 `ns-turing-v0.1.0.ccx` 后缀改为 `.zip`
3. 解压到 `%APPDATA%\Adobe\UXP\Plugins\External\ns-turing\`
   （完整路径如 `C:\Users\你的用户名\AppData\Roaming\Adobe\UXP\Plugins\External\ns-turing\`）
4. 确保解压后 `ns-turing\` 目录下直接有 `manifest.json`（不要多一层嵌套）
5. 启动 Photoshop → **增效工具 → NS Turing**

**macOS**:
1. 关闭 Photoshop
2. 将 `.ccx` 改名为 `.zip` 并解压
3. 放入 `~/Library/Application Support/Adobe/UXP/Plugins/External/ns-turing/`
4. 启动 Photoshop

### 方式二：UDT 加载（开发调试用）
1. 下载 [UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/devtool/)
2. 添加插件目录
3. 点击"加载"

---

## 2. API Key 配置

插件默认**不内置** API Key，每个使用者需要自行配置。

### 获取 API Key
| 服务商 | 获取地址 | 说明 |
|--------|---------|------|
| OpenAI | https://platform.openai.com/api-keys | 需注册并充值 |
| Google Gemini | https://aistudio.google.com/apikey | 免费额度可用 |

### 配置步骤
1. 打开 NS Turing 面板
2. 点击右上角 **齿轮图标** ⚙ → 打开设置面板
3. 在对应服务商的 **API Key** 输入框中粘贴密钥
4. （可选）如需代理/中转，修改 **API URL**
5. 点击眼睛图标可切换密钥可见性

---

## 3. 功能测试清单

### 3.1 基础文生图
- [ ] 输入 prompt（如 "一只猫"）→ 点击"生成"
- [ ] 生成结果自动置入当前文档为智能对象图层
- [ ] 多次生成正常，图层不混乱

### 3.2 参考图模式
- [ ] **画布参考**：勾选"使用当前画布作为参考图" → 生成基于画布的变体
- [ ] **上传参考**：点击"上传参考图"选择图片 → prompt 描述改动 → 生成
- [ ] **图层参考**：选中一个图层 → 勾选"选择图层作为参考" → 生成
- [ ] 多种参考源可同时使用（顺序：画布 → 上传 → 图层）

### 3.3 模型切换
- [ ] Gemini 模型：`Gemini 3 Pro Image` / `Gemini 3.1 Flash Image`
- [ ] OpenAI 模型：`GPT-image-2`（需配置 Key）
- [ ] 切换模型后生成正常，不串号

### 3.4 主题适配
- [ ] 深色 PS 主题下：图标为白色，文字为浅色，UI 清晰可读
- [ ] 浅色 PS 主题下：图标为深色，文字为深色，UI 清晰可读

### 3.5 边界场景
- [ ] 无文档打开时点击生成 → 应提示"请先打开或新建一个文档"
- [ ] 空 prompt 点击生成 → 应提示输入 prompt
- [ ] 超大参考图（> 20MB）→ 应提示图片过大
- [ ] 无 API Key 时生成 → 应提示配置错误

---

## 4. 已知问题

| 问题 | 影响 | 状态 |
|------|------|------|
| PS 控制台偶发 `_handleDocumentEvent` 内部日志 | 无功能影响 | 已知，PS 内部无害日志 |
| 部分 SVG 图标无抗锯齿 | 视觉轻微锯齿 | CEF 渲染限制，不影响使用 |

---

## 5. 反馈方式

请通过以下渠道提交测试反馈：

- **群聊**：[团队微信群]
- **文档**：[飞书/腾讯文档链接]
- **格式**：`[Bug/建议] 问题描述 + 截图 + 复现步骤`

### 反馈模板
```
问题类型：Bug / UI问题 / 功能建议
严重程度：高 / 中 / 低
描述：
复现步骤：
截图：
PS版本：
系统：
```
