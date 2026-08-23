# z-music-desktop Android

这是 z-music-desktop 的 Android 壳层，使用 Vue 3 + Vite + Capacitor 8。当前阶段提供 Cover Pulse 移动端导航、空状态和平台接口边界；不会在这里复制桌面端的音源、音质选择或播放 URL 获取逻辑。

## 环境

- Node 22.22.0
- pnpm 10.34.5
- JDK 21（执行 Android Gradle 构建时）
- Android SDK 36（执行 Android Gradle 构建时）

原生构建基线固定为 Gradle 8.14.3、AGP 8.13.0、minSdk 24、compile/target SDK 36、Media3 1.11.0。没有 Android SDK 时仍可运行 Web 构建和边界测试。

## 开发

从仓库根目录执行以下命令。Windows、Linux 和 macOS 使用相同的命令名：

```shell
pnpm android:install
pnpm android:test
pnpm android:typecheck
pnpm android:sync
```

`android:install` 对根 `pnpm-lock.yaml` 执行 `--ignore-scripts` frozen install（只提供共享源码的 TypeScript/Vite 配置依赖），随后对 `apps/android/pnpm-lock.yaml` 执行独立 frozen install；Android job 不重建 Electron native 模块。仓库不维护 npm lockfile，也不在质量门禁中运行会改写依赖树的 `npm install`。两个 `package.json` 和 CI 使用同一 Node/pnpm 工具链。`android:sync` 会先构建 Web 资源，再同步 Capacitor Android 工程，避免同步过期的 `dist` 内容。单独调试某一步时仍可使用 `android:build:web` 和 `android:cap:sync`。

Gradle 单元测试和 debug APK 也从仓库根目录执行：

```shell
pnpm android:gradle:unit
pnpm android:gradle:debug
pnpm android:scan:apk
```

Gradle 脚本只接受 `:app:testDebugUnitTest` 和 `:app:assembleDebug` 两个任务，在 Windows 调用 `gradlew.bat`，在 Linux 和 macOS 调用 `./gradlew`。debug APK 输出到 `apps/android/android/app/build/outputs/apk/debug/app-debug.apk`。`android:scan:apk` 会验证 ZIP/CRC/APK 结构并扫描全部打包条目，发现 Electron/Node 运行时引用、Browser mock/开发地址、作者默认服务地址或明文凭据时失败。CI 上传 APK、Gradle 测试报告、扫描报告与 SHA-256，artifact 名称固定为 `z-music-desktop-android-debug`。

本地 Web 预览仍可在子目录启动：

```shell
pnpm --dir apps/android dev
```

## 平台边界

页面只依赖 `src/platform/contracts.ts` 中的以下接口：

`SettingsStore`、`SecureCredentialStore`、`HttpClient`、`FilePicker`、`DownloadStore`、`Lifecycle`、`Share`、`PlayerBridge`。

`src/platform/browser.ts` 只用于 Vite 开发预览，通过 `import.meta.env.DEV` 的动态导入与生产入口隔离。生产包在真实原生 adapter 完成前使用显式 unavailable adapter，不会把设置或凭据写入 `localStorage`，也不会使用内存下载或 mock player。原生实现应通过 `providePlatform()` 注入，不得从页面导入 Electron 或 Node API。

## 导航与数据范围

一级入口固定为：首页、发现、音乐库、播客、报告、设置。网易云等第三方服务只属于服务连接和报告/账号/云盘/评论能力，不作为独立一级目的地。音乐库位置筛选为：全部、本地、云端、WebDAV。
