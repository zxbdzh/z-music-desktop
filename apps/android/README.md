# z-music-desktop Android

这是 z-music-desktop 的 Android 壳层，使用 Vue 3 + Vite + Capacitor 8。当前阶段提供 Cover Pulse 移动端导航、空状态和平台接口边界；不会在这里复制桌面端的音源、音质选择或播放 URL 获取逻辑。

## 环境

- Node 22
- pnpm 10+
- JDK 21（执行 Android Gradle 构建时）
- Android SDK 36（执行 Android Gradle 构建时）

原生构建基线固定为 Gradle 8.14.3、AGP 8.13.0、minSdk 24、compile/target SDK 36、Media3 1.11.0。没有 Android SDK 时仍可运行 Web 构建和边界测试。

## 开发

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

首次生成 Android 工程（需要联网，不需要在生成阶段安装 SDK）：

```powershell
pnpm cap:add
pnpm cap:sync
```

有 Android SDK 后构建 debug 包：

```powershell
pnpm android:assembleDebug
```

## 平台边界

页面只依赖 `src/platform/contracts.ts` 中的以下接口：

`SettingsStore`、`SecureCredentialStore`、`HttpClient`、`FilePicker`、`DownloadStore`、`Lifecycle`、`Share`、`PlayerBridge`。

`src/platform/browser.ts` 只用于 Web 预览和测试。安全凭据在 Android Keystore adapter 完成前会明确返回不可用错误，避免把凭据落到明文存储。原生实现应通过 `providePlatform()` 注入，不得从页面导入 Electron 或 Node API。

## 导航与数据范围

一级入口固定为：首页、发现、音乐库、播客、报告、设置。网易云等第三方服务只属于服务连接和报告/账号/云盘/评论能力，不作为独立一级目的地。音乐库位置筛选为：全部、本地、云端、WebDAV。
