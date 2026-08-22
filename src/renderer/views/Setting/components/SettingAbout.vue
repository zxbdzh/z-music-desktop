<template lang="pug">
dt#about {{ $t('setting__about') }}
dd
  .p.small
    | z-music-desktop 是由 zxbdzh 独立维护的开源项目：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/zxbdzh/z-music-desktop')") https://github.com/zxbdzh/z-music-desktop
  .p.small
    | 本项目基于 Apache-2.0 项目&nbsp;
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/ikunshare/ikun-music-desktop')") ikun-music-desktop
    | &nbsp;与&nbsp;
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/lyswhut/lx-music-desktop')") lx-music-desktop
    | &nbsp;发展，完整署名见仓库 NOTICE。
  .p.small
    | 最新版本与问题反馈：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/zxbdzh/z-music-desktop/releases')") GitHub Releases
    | &nbsp;/&nbsp;
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/zxbdzh/z-music-desktop/issues')") GitHub Issues
  br
  .p.small 本软件完全免费，不提供、不托管音乐内容；第三方服务需要由用户自行配置。
  .p.small
    strong 本项目没有客服或其他所谓“官方账号”
    | ，请仅从上述仓库核对发布信息。

  .p.small
    | 你已签署本软件的
    base-btn(min @click="handleShowPact") 许可协议
    | ，Apache-2.0 许可证与来源说明可在
    strong.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/zxbdzh/z-music-desktop#许可证')") 仓库主页
    | 查看。
  br

  .p.small
    | Maintainer:&nbsp;
    strong zxbdzh
</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { isShowPact } from '@renderer/store'
import { openUrl, clipboardWriteText } from '@common/utils/electron'

export default {
  name: 'SettingAbout',
  setup() {
    const handleShowPact = () => {
      isShowPact.value = true
    }
    return {
      openUrl,
      clipboardWriteText,
      handleShowPact,
    }
  },
}
</script>
