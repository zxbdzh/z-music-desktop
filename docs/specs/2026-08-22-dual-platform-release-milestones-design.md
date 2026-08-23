# z-music-desktop 双端发布里程碑设计

- 状态：已批准，待 GitHub 落地
- 规划基线：`8237bae0453cdb3aae629026216332b330384494`
- 独立仓库根提交：`ea8d828452b0097d50c804c74df76ff9a89c5fed`
- 规划终点：Desktop 1.5 与 Android 1.0 均达到可发布门禁
- 时间表达：无截止日期，按依赖和退出门禁推进
- Issue 策略：基于当前 `main` 现状重建，不复制归档仓库的过时状态

## 1. 目标

本设计把当前代码快照转化为一条可以持续执行、逐项验收并最终发布的双端路线图。规划不把“代码已经存在”等同于“产品已经完成”，也不把归档 Fork 中的旧 Issue 原样复制到新仓库。每个新工作项必须对应当前 `main` 上仍存在的实现缺口或正式验收缺口。

规划完成后，GitHub 应具备：

- 7 个无截止日期的发布里程碑；
- 1 个不归属里程碑的总路线图 Issue；
- 38 个里程碑工作项，其中现有已关闭 Issue #1 计入 Desktop RC，另新建 37 个里程碑 Issue；
- 加上 1 个新建的总路线图 Issue，GitHub 实际新增 Issue 为 38 个，纳入本规划治理的 Issue 总数为 39 个；
- 可查询的优先级、领域、状态、规格完整度和原生依赖；
- Desktop 1.5 与 Android 1.0 两条可并行、可独立发布的关键路径；
- 只以合并 PR、自动化门禁和可复现证据关闭工作项的治理规则。

## 2. 当前基线

### 2.1 已具备

- 独立仓库只有一个无父根提交及其后续正常提交，当前 `main` 为 `8237bae`。
- 桌面端已包含 Cover Pulse 视觉基础、语义 token、首页、收敛后的导航、统一音乐库、设置分组、Notice/Dialog 基础设施、网易云用户配置、共享控件可访问性测试和 QA fixture/schema。
- Issue #1 已通过 PR #2 合并并关闭，提供了第一个可审计的 Issue 到 PR 到门禁到关闭闭环。
- Android 已包含 Capacitor 8.5.0、Gradle 8.14.3、AGP 8.13.0、SDK 24/36、Media3 1.11.0 依赖、Vue 壳层、平台契约、Browser 预览 adapter 和边界测试。
- Android 与桌面可共享 `src/common/mobile` 中的纯类型、规范化逻辑和可恢复结果模型。
- GitHub 工作流文件已存在，QA evidence schema、fixture catalog、脱敏器和校验器已进入仓库。

### 2.2 真实缺口

- GitHub Actions 仍全局禁用；`APIFOX_ACCESS_TOKEN` 和 `PUSHPLUS_TOKEN` 尚未补录，`main` 也尚未建立基于成功检查的保护规则。
- 当前质量工作流只覆盖桌面；根 `package.json` 没有 Android 的可重复命令，Android CI、Gradle 单测、debug APK 和 APK 静态扫描尚未形成门禁。
- `pnpm lint` 虽为 0 errors，仍有 233 个 warning；其中包含生成的第三方静态代码和第一方源码问题，尚未建立“生成代码隔离、第一方零 warning、禁止新增 warning”的规则。
- QA 证据框架没有一条真实产品验收 manifest，文档仍引用已禁用的旧自动化工具，必须统一改为 `agent-browser` 和 Android 设备工具链。
- 桌面设置页完成了分组但没有跨设置搜索；残余阻塞式 Dialog、页面异步状态、窗口矩阵和真实 Electron 验收仍需收口。
- 旧打包工作流仍有 `ikun-music-desktop` artifact 名称、`beta` 分支假设和过时平台矩阵。
- Android 生产入口仍注入 `createBrowserPlatform()`；原生层只有 `MainActivity` 和示例测试，没有真实 Android adapter、Keystore、MediaSessionService 或 ExoPlayer 真相源。
- Android 原型当前使用 6 项底栏，与批准的 4 项一级导航冲突；页面主要是静态原型，尚未形成真实搜索、播放、音乐库和恢复闭环。

## 3. 固定决策

### 3.1 发布与版本

- 桌面首个独立稳定版本为 **Desktop 1.5 / v1.5.0**，延续现有 `1.4.5` 升级序列，禁止降回 `1.0.0`。
- Android 独立使用 **1.0.0** 版本线；Android 包版本不要求与桌面同步。
- 签名密钥、商店账号和发布审批属于外部发布步骤，不写入仓库；仓库必须提供可复现产物和安全的签名注入点。
- Desktop 1.5 与 Android 1.0 可独立发布，任一轨道不等待另一轨道；共享代码变更必须通过双端适用的回归门禁。

### 3.2 支持矩阵

- Desktop 1.5 的阻塞平台为 Windows 10/11 x64，交付 Setup 与便携包。
- macOS x64/arm64 和 Linux x64 保留无 Secrets 构建与 best-effort 产物，不进入完整交互阻塞矩阵。
- Windows 7、Windows x86/arm64、Linux arm64/armv7l 不作为 Desktop 1.5 发布承诺；相关脚本可保留，但失败不得伪装为稳定版阻塞项。
- Android 支持 `minSdk 24`、`compileSdk/targetSdk 36`，最终自动化矩阵固定 API 24、35、36。
- Android 最终宽度矩阵为 320/360/390/412dp，覆盖横竖屏、浅深主题、字体放大和 reduced motion。

### 3.3 Android 产品边界

- 一级底栏固定为：首页、发现、音乐库、设置。
- Now Playing 从迷你播放器进入，不是第五个 Tab。
- 播客和听歌报告通过首页、内容入口或服务入口进入，不占底栏。
- Android 使用同仓库第二客户端架构，不把 Electron 直接打进 APK。
- Android 播放由单一 Media3 `MediaSessionService` / ExoPlayer 作为真相源，Web UI 只通过 `PlayerBridge` 同步。
- Music Source 协议、音质选择和可播放 URL 解析保持兼容；不复制一套 Android 私有音源协议。
- Browser adapter 只允许 Web 预览和测试，生产 Android bundle 必须注入真实原生 adapter。

## 4. 里程碑结构

| ID | GitHub Milestone | 发布结果 | 直接前置 |
| --- | --- | --- | --- |
| M0 | Repository Ready | 仓库门禁可执行、可保护、可留证 | 无 |
| M1 | Desktop RC | 当前桌面 UX 收口为 Windows RC | M0 |
| M2 | Desktop 1.5 | Windows 10/11 x64 可发布稳定版 | M1 |
| M3 | Android Native Foundation | Browser 原型转为真实 Android 运行时 | M0 |
| M4 | Android Alpha | 可安装、可后台播放的核心音乐闭环 | M3 |
| M5 | Android Beta | 扩展内容、权限恢复和双语完成 | M4 |
| M6 | Android 1.0 | 完整设备、安全和发布矩阵通过 | M5 |

主依赖链：

```text
M0 -> M1 -> M2
 |
 +--> M3 -> M4 -> M5 -> M6
```

M0 完成后桌面和 Android 双轨并行。跨里程碑依赖用于决定工作项何时可进入 `status:ready`；调查和规格澄清可以提前进行，但不能绕过前置门禁声明完成。

## 5. 标签与状态模型

### 5.1 必备标签

每个 Issue 恰有一个 `area:*`、一个 `status:*` 和 `spec:complete`。可执行工作项恰有一个 `priority:*`；总路线图与 `release-blocker` 不使用 priority 伪装执行顺序。

- 优先级：`priority:P0`、`priority:P1`、`priority:P2`
- 领域：`area:project`、`area:quality`、`area:desktop`、`area:shared`、`area:android`
- 状态：`status:pending`、`status:blocked`、`status:ready`、`status:in-progress`、`status:review`、`status:done`
- 类型：`type:roadmap`、`release-blocker`
- 规格：`spec:complete`

### 5.2 状态语义

- `pending`：规格完整，但尚未到计划窗口且不存在需要表达的硬依赖。
- `blocked`：存在未完成的原生依赖或外部前置条件。
- `ready`：依赖已满足，可由一个执行者领取。
- `in-progress`：存在正在实施的分支或 PR 前工作。
- `review`：实现与本地门禁完成，正在 PR 审查或等待合并。
- `done`：PR 已合并，验收证据完整，Issue 已关闭。

## 6. M0 - Repository Ready

**结果**：任何新 PR 都能在无私密值的情况下执行确定性双端检查；需要 Secret 的外部回归被明确隔离；`main` 只接受满足必需检查的合并。

**非目标**：M0 不实现桌面或 Android 产品功能，不要求签名发布包，不以一次性本地日志替代 CI。

| Stable ID | 新 Issue 标题 | Priority | Area | 初始状态 | 原生依赖 |
| --- | --- | --- | --- | --- | --- |
| M0-01 | `chore(actions): 安全恢复 Actions、Secrets 与 main 分支保护` | P0 | quality | blocked | M0-02, M0-03, M0-04；环境所有者补录 `APIFOX_ACCESS_TOKEN`，或显式保持外部 schedule disabled |
| M0-02 | `chore(tooling): 建立根级双端命令与 Android CI/APK 扫描` | P0 | quality | ready | 无 |
| M0-03 | `chore(lint): 隔离生成代码并禁止新增 warning` | P1 | quality | ready | 无 |
| M0-04 | `test(evidence): 将 fixture、schema、脱敏与产品证据校验接入 CI` | P1 | quality | ready | 无 |
| M0-05 | `test(repository): 验收双端仓库执行基线` | - | quality | blocked | M0-01, M0-02, M0-03, M0-04 |

M0-01 必须先修复 Secret 边界再启用 Actions：

- `PUSHPLUS_TOKEN` 只提供通知，缺失时通知步骤跳过，不得让构建失败。
- `APIFOX_ACCESS_TOKEN` 只用于受保护 Environment 下的外部契约回归；普通 PR 始终运行无 Secret verifier。
- 外部回归在 Token 缺失时必须显式 `skipped` 或保持 schedule disabled，不得伪装为产品质量失败；这两种状态都不阻塞 M0 关闭，只有“已启用且缺 Token”属于失败配置。
- 必需检查名称稳定后再配置 `main` 分支保护；不得提前要求一个尚不存在的 check。

M0-02 至少完成以下基线：

- 固定 Node 22 与 pnpm 10，声明根 `pnpm-lock.yaml` 和 `apps/android/pnpm-lock.yaml` 的所有权；CI 不运行会改写依赖树的 `npm install`，现有 `package-lock.json` 要么经兼容审计后删除，要么明确只读用途。
- 提供根级命令覆盖 Android frozen install、test、typecheck、Web build、Capacitor sync、Linux `./gradlew test`、debug APK、静态安全扫描和 artifact 上传。
- Windows/macOS/Linux setup action 使用同一 Node/pnpm 版本和缓存键，不混用 pnpm 9、pnpm 10 与隐式 npm 安装。

M0-03 将第三方生成文件从第一方 lint 预算中隔离，记录现有第一方 warning 并令新增 warning 失败。M0-04 必须提交一条由当前 commit、真实 fixture 和已脱敏 artifact 构成的示例 manifest，并把文档中的旧自动化工具统一为 `agent-browser`。

**退出门禁 M0-05**：从干净 checkout 在 GitHub Actions 中通过桌面 lint/test/build、Android test/typecheck/build/sync/Gradle/APK scan、brand check、fixture/evidence 校验；`main` 分支保护要求这些无 Secret 检查；仓库级 Actions 为 enabled。

## 7. M1 - Desktop RC

**结果**：当前已进入 `main` 的桌面体验不再只是综合候选实现，而是按真实窗口、真实状态和用户工作流逐项验收的 Windows RC。

**非目标**：不重写播放内核、Music Source 协议、下载或同步业务，不新增后端依赖，不把 RC 门禁变成新功能容器。

| Stable ID | Issue | Priority | Area | 初始状态 | 原生依赖 |
| --- | --- | --- | --- | --- | --- |
| M1-01 | 现有 #1 `test(a11y): 补齐共享控件真实键盘序列回归` | P0 | desktop | done | 无 |
| M1-02 | `fix(shell): 验收并收口导航、全局搜索、首页、发现与音乐库` | P0 | desktop | blocked | M0-05 |
| M1-03 | `feat(settings): 增加跨设置搜索、结果定位与键盘导航` | P1 | desktop | blocked | M0-05 |
| M1-04 | `refactor(feedback): 迁移残余阻塞式反馈并统一异步页面状态` | P1 | desktop | blocked | M0-05, M1-01 |
| M1-05 | `test(player): 验收播放栏、Now Playing 与听歌报告工作流` | P1 | desktop | blocked | M0-05, M1-01 |
| M1-06 | `test(theme): 验收品牌、主题、长文本、窗口约束与 reduced motion` | P1 | desktop | blocked | M0-05 |
| M1-07 | `test(desktop-rc): 建立 Windows Electron 自动化矩阵并验收 RC` | - | desktop | blocked | M1-01, M1-02, M1-03, M1-04, M1-05, M1-06 |

M1-02 对当前导航、首页和音乐库做现状审计，只有被真实 fixture 或窗口验收证明的缺口才修改代码。M1-03 搜索设置名称、关键词和说明，支持键盘选择并定位到具体设置；不只是过滤左侧分组。M1-04 按“普通结果用 Inline/Notice、真实选择或破坏性操作用 Dialog”分类 28 个候选调用点，并为 loading、empty、partial、error、permission-denied、success 建立一致恢复路径。M1-05 关注播放状态一致性，不重新设计播放器。M1-06 同时验证新 Logo 的派生一致性和旧主题兼容。

**退出门禁 M1-07**：在 Windows Electron 对 828x540、900x600、1080x720、1440x900，默认浅色/深色与两个自定义主题，普通/reduced motion，短/长中文英文以及全部 fixture 状态执行 `agent-browser` 自动化和必要人工复核。每个矩阵单元产出通过 schema 的 evidence manifest；同一提交通过 M0 全部门禁。

## 8. M2 - Desktop 1.5

**结果**：交付版本严格大于历史 `1.4.5` 的 Windows 10/11 x64 独立稳定版，保持既有用户升级、数据和深链兼容。

**非目标**：不承诺 Win7、Windows x86/arm64 或 Linux arm64/armv7l；macOS/Linux 构建失败单独跟踪，不阻塞 Windows 首发，除非失败来自共享源码回归。

| Stable ID | 新 Issue 标题 | Priority | Area | 初始状态 | 原生依赖 |
| --- | --- | --- | --- | --- | --- |
| M2-01 | `test(compat): 验证旧 appId、数据目录、lxmusic 深链与升级路径` | P0 | desktop | blocked | M1-07 |
| M2-02 | `chore(packaging): 收口 Windows x64 品牌产物、SHA-256 与跨平台构建` | P0 | desktop | blocked | M1-07 |
| M2-03 | `test(desktop-release): 执行 Windows 10/11 x64 安装与交互发布矩阵` | P0 | desktop | blocked | M2-01, M2-02 |
| M2-04 | `release(desktop): 验收 Desktop 1.5 候选、说明与回滚方案` | - | desktop | blocked | M2-03 |

M2-01 必须覆盖从历史 1.4.5 用户数据升级、全新安装、便携版、`cn.toside.music.desktop`、历史数据目录、`lxmusic://` 和 OAuth 回调；不机械重命名兼容标识。M2-02 将 workflow、artifact、安装包显示名和 Release 元数据统一为 `z-music-desktop`，Windows x64 生成 Setup 与便携包并输出 SHA-256；macOS x64/arm64 与 Linux x64 执行 best-effort build。M2-03 在 Windows 10 和 Windows 11 各完成安装、升级、卸载/保留数据、启动、更新检查和核心交互。

**退出门禁 M2-04**：版本为 `1.5.0`，Release Notes 明确独立项目、上游来源、兼容标识与已知限制；LICENSE/NOTICE 入包；候选产物与证据绑定同一 commit；回滚说明不依赖删除用户数据；没有未接受的桌面 P0/P1 缺陷。

## 9. M3 - Android Native Foundation

**结果**：Android 生产构建不再运行 Browser mock；共享业务只依赖冻结的 PlatformServices，所有真实平台能力有 Android 实现或明确、可恢复的 unsupported 结果。

**非目标**：不在本里程碑实现完整音乐页面、后台播放或扩展内容，不一次封装全部 Electron API。

| Stable ID | 新 Issue 标题 | Priority | Area | 初始状态 | 原生依赖 |
| --- | --- | --- | --- | --- | --- |
| M3-01 | `refactor(android-platform): 冻结 PlatformServices 与生产运行时选择` | P0 | android | blocked | M0-05 |
| M3-02 | `feat(android-storage): 实现 Preferences 与 Android Keystore 持久化` | P0 | android | blocked | M3-01 |
| M3-03 | `feat(android-system): 实现原生 HTTP、生命周期、链接、分享与文件选择` | P0 | android | blocked | M3-01 |
| M3-04 | `feat(android-shell): 收敛四项底栏、系统返回与状态恢复` | P1 | android | blocked | M3-01 |
| M3-05 | `test(android-foundation): 验收原生 adapter、进程恢复与 APK 安全边界` | - | android | blocked | M3-02, M3-03, M3-04 |

M3-01 保留 `SettingsStore`、`SecureCredentialStore`、`HttpClient`、`FilePicker`、`DownloadStore`、`Lifecycle`、`Share`、`PlayerBridge` 八个接口，但要统一稳定结果模型、取消/超时、离线、401/403、服务器错误和 unsupported 语义。生产入口按 Capacitor runtime 明确注入 Android adapter；测试必须证明 APK 不会选择 `createBrowserPlatform()`、`localStorage` 凭据或内存下载实现。

M3-02 普通设置使用 Capacitor Preferences 或等价持久化；Cookie、密码、token 只进入 Android Keystore 支持的安全存储。错误和日志不得包含凭据。M3-03 为用户显式配置的 HTTPS 或 loopback HTTP 提供网络能力；非 loopback HTTP 被拒绝，Network Security Config 不得全局开启 cleartext。链接、剪贴板、分享、文件选择和生命周期使用 Android 能力。M3-04 删除播客/报告底栏项，固定首页、发现、音乐库、设置，并覆盖系统返回、深链、旋转和进程重建后的路由恢复。

**退出门禁 M3-05**：真实 adapter 契约测试、Android Web build/cap sync、Gradle unit test 和 debug APK 通过；API 35 模拟器证明设置持久化、一个远程请求、一个外链/分享和进程恢复；APK 扫描排除 Electron/Node、Browser mock、开发服务器、明文凭据和作者默认服务地址。

## 10. M4 - Android Alpha

**结果**：从干净 checkout 生成可安装 debug APK，并通过模拟器和真机证明“搜索 -> 播放 -> Now Playing -> 音乐库 -> 设置 -> 回访恢复”的核心音乐闭环及后台播放。

**非目标**：Alpha 不要求网易云账号/报告、播客、WebDAV、下载、本地导入或完整双语矩阵。

| Stable ID | 新 Issue 标题 | Priority | Area | 初始状态 | 原生依赖 |
| --- | --- | --- | --- | --- | --- |
| M4-01 | `refactor(shared-core): 提取 Alpha 媒体、队列、音乐库与设置核心` | P0 | shared | blocked | M3-05 |
| M4-02 | `feat(android-source): 复用 Music Source 完成搜索与可播放 URL` | P0 | shared | blocked | M3-05 |
| M4-03 | `feat(android-media3): 实现 MediaSessionService、ExoPlayer 与 PlayerBridge` | P0 | android | blocked | M3-05, M4-01, M4-02 |
| M4-04 | `feat(android-core-ui): 实现首页、发现、搜索、迷你播放器与 Now Playing` | P1 | android | blocked | M4-01, M4-02, M4-03 |
| M4-05 | `feat(android-library): 实现音乐库、Alpha 设置与回访恢复` | P1 | android | blocked | M4-01, M4-03 |
| M4-06 | `test(android-alpha): 验收核心闭环、后台播放与可安装 debug APK` | - | android | blocked | M4-04, M4-05 |

M4-01 只提取被桌面和 Android 两个真实消费者使用的纯领域能力，不移动 Electron、Capacitor、UI 或传输实现。M4-02 保持现有 Music Source 脚本、音质选择和 URL 解析兼容；Android 接收最终可播放地址，不建立第二套协议。M4-03 使用固定 Media3 1.11.0 和唯一 ExoPlayer 队列，覆盖播放/暂停、上一首/下一首、seek、队列、前台服务、通知、锁屏、蓝牙/耳机、音频焦点、网络错误和进程恢复。Android 13+ 通知权限拒绝必须可恢复。

M4-04 的 Now Playing 只从迷你播放器打开。M4-05 的 Alpha 设置只包含真实 Android 有效项；桌面专属托盘、桌面歌词、全局快捷键和自动更新不得出现。

**退出门禁 M4-06**：API 35 模拟器覆盖 360/390dp、一次横屏、浅深主题、字体放大、系统返回、旋转、网络中断和通知权限拒绝；至少一台 API 24+ 真机完成 30 分钟后台播放、锁屏控制、音频焦点和耳机拔出。CI 上传 APK、测试报告和 evidence artifact；同一提交通过桌面回归门禁。

## 11. M5 - Android Beta

**结果**：Alpha 核心之上交付账号/报告与设备内容能力，覆盖权限拒绝、网络中断、任务恢复和简中/英文，不改变单一播放真相源。

**非目标**：不增加 Android Auto、投屏、无缝接续或任意目录扫描；不绕过 scoped storage 和临时 URI 权限。

| Stable ID | 新 Issue 标题 | Priority | Area | 初始状态 | 原生依赖 |
| --- | --- | --- | --- | --- | --- |
| M5-01 | `feat(android-netease): 接入用户配置网易云与听歌报告` | P1 | android | blocked | M4-06 |
| M5-02 | `feat(android-podcast): 迁移播客与长音频` | P1 | android | blocked | M4-06 |
| M5-03 | `feat(android-webdav): 适配安全浏览与流式播放` | P1 | android | blocked | M4-06 |
| M5-04 | `feat(android-device-content): 实现 scoped-storage 下载、本地导入与分享` | P1 | android | blocked | M4-06 |
| M5-05 | `feat(android-i18n): 建立简中、英文与系统语言回退` | P1 | android | blocked | M4-06 |
| M5-06 | `test(android-beta): 验收扩展内容、权限拒绝与任务恢复` | - | android | blocked | M5-01, M5-02, M5-03, M5-04, M5-05 |

M5-01 复用共享网易云 URL 校验，不携带作者服务地址；未配置、不可达、登录失效和接口不兼容是不同状态。M5-02 复用 Media3 队列并持久化长音频进度。M5-03 的凭据只进入 Keystore，临时 URI 和日志必须脱敏。M5-04 合并下载、本地导入和分享，是因为三者共享 scoped storage、SAF、FileProvider 和 URI 生命周期；实现和测试仍按子能力分层。M5-05 覆盖所有 Android 用户可见字符串，不要求桌面语言结构重写。

**退出门禁 M5-06**：每个内容域至少覆盖成功、空、离线、权限拒绝、进程恢复和不可恢复错误；简中/英文及未知系统语言回退通过；下载和导入任务不会因旋转或 WebView 重建丢失；APK 与 evidence 不含 Cookie、token、私有 URI 或默认服务地址。

## 12. M6 - Android 1.0

**结果**：同一候选 commit 通过完整设备、媒体、可访问性、安全和发布矩阵，形成可签名、可分发的 Android 1.0 产物。

**非目标**：签名密钥、商店账号和审批不进入仓库；不在最终门禁中实现新功能。

| Stable ID | 新 Issue 标题 | Priority | Area | 初始状态 | 原生依赖 |
| --- | --- | --- | --- | --- | --- |
| M6-01 | `test(android-api): 建立 API 24、35、36 自动化设备矩阵` | P0 | quality | blocked | M5-06 |
| M6-02 | `test(android-media): 完成真机后台播放与系统媒体恢复矩阵` | P0 | quality | blocked | M5-06 |
| M6-03 | `test(android-a11y): 完成 TalkBack、布局、字体与主题矩阵` | P1 | quality | blocked | M5-06 |
| M6-04 | `security(android): 审计 APK、权限、凭据、许可与发布产物` | P0 | quality | blocked | M5-06 |
| M6-05 | `release(android): 验收 Android 1.0 候选与同提交桌面回归` | - | android | blocked | M6-01, M6-02, M6-03, M6-04 |

M6-01 自动化覆盖 API 24、35、36。M6-02 至少记录一台 API 24+ 真机的 30 分钟后台播放、通知/锁屏、蓝牙/耳机、暂时/永久音频焦点丢失、网络切换、旋转和进程回收。M6-03 覆盖 TalkBack、48dp 触控目标、320/360/390/412dp、横竖屏、浅深主题、字体放大和 reduced motion。M6-04 检查最小权限、cleartext 策略、调试标志、开发服务器、凭据、私有 URI、许可证和依赖清单。

**退出门禁 M6-05**：版本为 Android `1.0.0`；CI 生成可安装候选 APK、测试报告、SBOM/依赖与许可清单、SHA-256 和 evidence artifact；全部矩阵有明确 PASS/FAIL；没有未接受的 Android P0/P1 缺陷；同一 commit 的桌面 lint/test/build 通过。签名注入设计已验证，但仓库中不存在私钥。

## 13. 总路线图 Issue

新建一个不归属任何 Milestone 的控制性 Issue：

`roadmap: 交付 Desktop 1.5 与 Android 1.0`

它只拥有以下内容：

- 七个里程碑的产品结果、固定版本和支持矩阵；
- 七个 `release-blocker` 的链接与状态；
- 两条主依赖链和跨端回归规则；
- 外部发布步骤：Secrets、签名密钥和商店审批；
- 当前 release candidate commit 和最终发布链接。

它不拥有生产代码，不使用 priority，不作为开发分配单元。初始标签固定为 `area:project`、`type:roadmap`、`status:blocked`、`spec:complete`，不使用 `release-blocker`。建议将七个 blocker 设为其 GitHub sub-issue；普通工作项只归属各自 Milestone，并通过原生依赖连接 blocker。

## 14. 原生依赖图

每个 Milestone 恰有一个 `release-blocker`：

- M0-05 `test(repository)`
- M1-07 `test(desktop-rc)`
- M2-04 `release(desktop)`
- M3-05 `test(android-foundation)`
- M4-06 `test(android-alpha)`
- M5-06 `test(android-beta)`
- M6-05 `release(android)`

跨里程碑原生依赖：

- M1-02、M1-03、M1-04、M1-05、M1-06 依赖 M0-05。
- M2-01、M2-02 依赖 M1-07。
- M3-01 依赖 M0-05。
- M4-01、M4-02 依赖 M3-05。
- M5-01 至 M5-05 依赖 M4-06。
- M6-01 至 M6-04 依赖 M5-06。

同一里程碑内部依赖以各表格为准。GitHub 原生 dependency 是唯一权威机器关系；正文中的 `Blocked by` 只作为人类可读镜像，创建后必须校验两者一致。

允许并行的执行组：

- M0-02、M0-03、M0-04 可并行；M0-01 在无 Secret 检查稳定后收口。
- M1-02 至 M1-06 在 M0 完成后可并行。
- M2-01 与 M2-02 可并行，之后进入 M2-03。
- M3-02、M3-03、M3-04 在 M3-01 契约冻结后可并行。
- M4-01 与 M4-02 可并行；M4-03 完成后 M4-04 与 M4-05 可并行。
- M5-01 至 M5-05 在 Alpha 后可并行。
- M6-01 至 M6-04 在 Beta 后可并行。

## 15. Issue 与 PR 治理

### 15.1 规格与领取

- 每个 Issue 正文必须包含 Result、Current baseline、Scope、Non-goals、Acceptance、Evidence 和 Dependencies。
- Stable ID 写入 Issue 正文并保持永久不变，GitHub 编号只在创建后回填映射。
- 只有 `status:ready` 可以被自动执行领取；`blocked`、`pending`、roadmap 和 blocker 不得使用可执行标记。
- 开始工作时先将 Issue 改为 `in-progress` 并评论分支名；创建 PR 后改为 `review`。

### 15.2 关闭标准

- 原则上一个 Issue 对应一个 PR；若一个 PR 不可避免地触及多个 Issue，只能关联一个主 Issue，其他 Issue 在各自验收完成前保持 Open。
- 本地提交、未推送分支、临时截图、代理口头报告或综合提交标题都不能关闭 Issue。
- 关闭必须同时满足：PR 合并、Issue Acceptance 逐项通过、证据可复现、没有未说明的失败。
- `Closes #N` 只在 PR 已具备完整关闭证据时使用；否则使用 `Refs #N`。
- blocker 只拥有矩阵、命令、产物与结论。发现功能缺陷时回到所属 Issue 修复，blocker 不夹带产品实现。
- 合并后 Issue 改为唯一 `status:done`；若自动关闭失败，由治理任务补关闭并记录原因。

### 15.3 质量要求

每个 PR 至少运行受影响的定向测试和 M0 必需检查。涉及共享核心、平台契约、播放状态、主题、路由、设置或构建配置时，扩大到双端相应门禁。测试覆盖随风险增加，不用快照数量替代行为断言。

验收证据必须包含 commit、前置条件、目标平台/设备、操作路径、fixture、观察结果、PASS/FAIL、脱敏日志或截图及 SHA-256。大文件进入稳定命名的 CI artifact；仓库提交 manifest 和必要的小型脱敏证据。

## 16. GitHub 落地顺序

用户书面批准本规格后，按以下事务顺序执行：

1. 确认 `origin/main` 仍包含本规格基线；若主线前进，只重审受影响范围，不自动覆盖新变更。
2. 创建/更新全部标签及说明，先不创建 Issue。
3. 创建 7 个无截止日期 Milestone，写入结果与退出门禁。
4. 创建总路线图 Issue并记录其编号。
5. 按 M0 到 M6 顺序创建 37 个新 Issue；现有 #1 只赋予 M1 Milestone，不重建。
6. 将 Stable ID 到 GitHub Issue 编号映射回填到路线图评论和本地生成的治理清单。
7. 连接同里程碑及跨里程碑的 GitHub 原生依赖。
8. 将七个 blocker 作为总路线图的 sub-issue；不把全部 38 项平铺为总路线图子项。
9. 校验每个 Issue 恰有一个 status、一个 area、`spec:complete`，可执行项恰有一个 priority，blocker 无 priority。
10. 校验 7 个 Milestone、38 个里程碑工作项、7 个 blocker、37 个新建 Open 里程碑 Issue、1 个新建 Open 总路线图 Issue和现有已关闭 #1 的计数。
11. 只将 M0-02、M0-03、M0-04 标记为 `status:ready`；其余新任务按表格保持 `blocked`。
12. 在路线图 Issue 发布创建摘要、关键路径和首批可执行项。

创建过程必须可重试：每一步通过 Stable ID 或精确标题检测已存在资源，禁止网络 EOF 后盲目重复创建。任何中断都先读取远端状态，再从第一个未完成步骤恢复。

## 17. 完整性断言

批准版本必须满足以下机器可检查断言：

- Milestone：7。
- 里程碑工作项：38。
- 新建里程碑 Issue：37。
- 新建总路线图 Issue：1。
- GitHub 实际新增 Issue：38。
- 纳入本规划治理的 Issue 总数：39。
- 复用已关闭 Issue：1（GitHub #1，Stable ID M1-01）。
- 总路线图 Issue 不计入 38 个里程碑工作项。
- release blocker：7，每个 Milestone 恰有一个。
- 工作项分布：M0=5、M1=7、M2=4、M3=5、M4=6、M5=6、M6=5。
- 初始 `ready`：3（M0-02、M0-03、M0-04）。
- 初始 `done`：1（M1-01）。
- 初始 `blocked`：34 个里程碑工作项，加 1 个总路线图 Issue；全部治理 Issue 中共 35。
- 版本：Desktop 1.5.0、Android 1.0.0；不存在 Desktop 1.0 发布承诺。
- Desktop 阻塞平台：Windows 10/11 x64；不存在 Win7 阻塞要求。
- Android 底栏：四项；不存在播客或报告底栏项。

## 18. 风险与缓解

- **Actions/Secret 循环阻塞**：先让无 Secret 检查稳定，再启用 Actions 和保护；通知 Secret 永不阻塞质量。
- **已有代码被误判完成**：每个现状项仍需独立 Acceptance 与 evidence；不以综合提交替代验收。
- **Android 原型被误用为生产 adapter**：入口和 APK 静态扫描同时禁止 Browser mock；只靠代码注释不算边界。
- **Media3 与 Web 队列形成双真相源**：M4-03 明确单一原生队列和双向 PlayerBridge，删除第二套生产状态。
- **Beta 内容横向扩张**：M5 只接入已存在的桌面领域，不新增推荐、投屏或 Android Auto。
- **门禁 Issue 吸收功能修复**：缺陷必须回所属功能 Issue；blocker 仅在同一候选 commit 重跑。
- **桌面版本倒退**：Desktop 固定 1.5.0，兼容测试覆盖从 1.4.5 升级。
- **平台承诺失控**：Windows 10/11 x64 是唯一 Desktop 1.5 完整阻塞平台，其余明确 best-effort。
- **无日期导致长期停滞**：每次只从 `ready` 中领取最高优先级项；每个 blocker 关闭时才开启下一里程碑的首批任务。

## 19. 成功定义

项目规划完成不等于两个产品发布。规划本身的成功标准是 GitHub 资源与本规格一致、依赖可查询、首批任务可执行且没有虚假完成状态。

Desktop 1.5 成功意味着 Windows 10/11 x64 安装、升级、核心交互、兼容和发布证据在同一 commit 上通过，Release 产物保留 Apache-2.0 与 NOTICE。Android 1.0 成功意味着 API 24/35/36、核心与扩展内容、Media3 后台播放、TalkBack、布局、安全和可发布 APK 在同一 commit 上通过，同时共享代码没有破坏桌面。

完成 M2 与 M6 后关闭总路线图 Issue；签名与商店审批作为该 Issue 的外部发布清单记录，但不改变仓库门禁结论。
