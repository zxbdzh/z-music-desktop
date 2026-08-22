# z-music-desktop 品牌资源

本目录保存已批准的独立品牌母版和可复现记录。

## 核心文件

- `logo-master.png`：由 `gpt-image-2` 生成并由维护者批准的 1024×1024 暖白底母版。
- `logo-mark.png`：从母版技术性去除暖白背景得到的透明标记；不包含程序性重画。
- `logo-generation-prompt.md`：维护者批准的规范原意提示词。
- `logo-generation-request-prompt.txt`：中转站实际收到的逐字提示词。Windows PowerShell 调用改变了其中少量非 ASCII 标点，因此两份版本同时保留。
- `logo-generation-response.json`：已去除请求标识的生成响应记录，包含模型、参数、源文件路径及两份提示词哈希。
- `generated-assets.json`：母版与透明标记的 SHA-256，以及各平台派生尺寸。

## 视觉语义

标志由一个珊瑚红 `Z` 和斜向中段的负空间声波组成。小尺寸优先读取 `Z`，大尺寸再呈现音乐语义。

- 主色：`#FF3F5F`
- 中性色：`#171A1C`
- 暖白背景：`#FFFDFB`

## 重新生成平台资产

先安装项目依赖，并确保 `ffmpeg` 位于 `PATH`：

```bash
pnpm install --frozen-lockfile
pnpm brand:generate
pnpm brand:check
```

`brand:generate` 只执行背景去除、缩放、画布填充和图标容器封装，不重画核心 Logo，也不会再次调用图片生成服务。

它会更新：

- README Logo：`doc/images/icon.png`
- GitHub Social Preview：`.github/social-preview.png`
- Windows、macOS、Linux 图标：`resources/icons/`
- Android legacy、round、adaptive launcher 与 splash 资源

## GitHub Social Preview

GitHub 仓库没有独立头像字段。`.github/social-preview.png` 是仓库 Social Preview 的上传源文件；GitHub 个人或组织头像不属于本项目品牌资源。
