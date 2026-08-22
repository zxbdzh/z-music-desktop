<p align="center"><a href="https://github.com/zxbdzh/z-music-desktop"><img width="200" src="doc/images/icon.png" alt="z-music-desktop logo"></a></p>

<h1 align="center">z-music-desktop</h1>

<p align="center">
  <a href="https://github.com/zxbdzh/z-music-desktop/releases"><img src="https://img.shields.io/github/release/zxbdzh/z-music-desktop" alt="Release version"></a>
  <a href="https://github.com/zxbdzh/z-music-desktop/actions/workflows/release.yml"><img src="https://github.com/zxbdzh/z-music-desktop/actions/workflows/release.yml/badge.svg" alt="Build status"></a>
  <a href="https://electronjs.org/releases/stable"><img src="https://img.shields.io/github/package-json/dependency-version/zxbdzh/z-music-desktop/dev/electron/main" alt="Electron version"></a>
  <a href="https://github.com/zxbdzh/z-music-desktop/releases"><img src="https://img.shields.io/github/downloads/zxbdzh/z-music-desktop/latest/total" alt="Downloads"></a>
  <a href="https://github.com/zxbdzh/z-music-desktop/blob/main/LICENSE"><img src="https://img.shields.io/github/license/zxbdzh/z-music-desktop" alt="License"></a>
</p>

<p align="center">基于 Electron 与 Vue 的独立桌面音乐客户端</p>

## 项目定位

`z-music-desktop` 是由 zxbdzh 独立维护、独立规划和独立发布的衍生项目，不是上游项目的官方版本。桌面客户端持续维护中，Android 客户端正在同一仓库内建设。

新独立仓库以当前代码快照作为首个提交。此前的 Git 历史、Issue、Pull Request 与 Release 保留在 [z-music-desktop-legacy-fork](https://github.com/zxbdzh/z-music-desktop-legacy-fork) 供查阅。

本项目基于以下 Apache-2.0 项目发展：

- [ikunshare/ikun-music-desktop](https://github.com/ikunshare/ikun-music-desktop)
- [lyswhut/lx-music-desktop](https://github.com/lyswhut/lx-music-desktop)

具体来源与署名见 [NOTICE](NOTICE)。

## 下载与反馈

- [正式版本](https://github.com/zxbdzh/z-music-desktop/releases)
- [问题反馈](https://github.com/zxbdzh/z-music-desktop/issues)
- [开发计划](https://github.com/zxbdzh/z-music-desktop/milestones)

第三方音乐服务需要由用户自行配置。本项目不提供、不托管音乐内容，也不对第三方服务的可用性作保证。

## 兼容说明

为保证已有安装、用户数据、自动更新和第三方 OAuth 回调继续工作，桌面应用暂时保留历史 `appId`、用户数据目录和 `lxmusic://` 深链协议。这些兼容标识不代表项目仍属于原 Fork 网络，后续变更会提供显式迁移路径。

## 品牌资源

项目使用独立的 `Z + 声波` 标志。批准母版、生成提示词、多平台派生说明与校验命令见 [品牌资源文档](docs/brand/README.md)。

## 许可证

源代码按 [Apache License 2.0](LICENSE) 发布。分发修改版本时，请保留许可证、现有版权与署名信息，并明确标注所做修改。项目名称和第三方名称的使用不代表原作者或上游维护者对本项目背书。
