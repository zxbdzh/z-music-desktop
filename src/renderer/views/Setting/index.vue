<template>
  <div :class="$style.main">
    <div class="scroll" :class="$style.toc">
      <SettingsSearch
        :items="searchItems"
        :label="t('setting_search_label')"
        :placeholder="t('setting_search_placeholder')"
        :clear-label="t('setting_search_clear')"
        :empty-label="t('setting_search_empty')"
        @select="handleSearchSelect"
      />
      <ul :class="$style.tocList" role="tablist" aria-label="设置分组" aria-orientation="vertical">
        <li v-for="group in tocGroups" :key="group.id" :class="$style.tocGroup" role="presentation">
          <span :class="$style.groupLabel">{{ group.title }}</span>
          <ul :class="$style.groupItems">
            <li v-for="item in group.items" :key="item.id" :class="$style.tocListItem" role="presentation">
              <button
                :id="`setting-tab-${item.id}`"
                type="button"
                :class="[$style.tocH2, { [$style.active]: avtiveComponentName == item.id }]"
                role="tab"
                :aria-selected="avtiveComponentName == item.id"
                :aria-controls="`setting-panel-${item.id}`"
                :tabindex="avtiveComponentName == item.id ? 0 : -1"
                :aria-label="item.title"
                @click="toggleTab(item.id)"
                @keydown="handleTabKeydown($event, item.id)"
              >
                <transition name="list-active">
                  <svg-icon
                    v-if="avtiveComponentName == item.id"
                    name="angle-right-solid"
                    :class="$style.activeIcon"
                  />
                </transition>
                {{ item.title }}
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </div>
    <div
      :id="`setting-panel-${avtiveComponentName}`"
      ref="dom_content_ref"
      class="scroll"
      :class="$style.setting"
      role="tabpanel"
      :aria-labelledby="`setting-tab-${avtiveComponentName}`"
      tabindex="-1"
    >
      <dl>
        <component :is="avtiveComponentName" />
        <!-- <SettingBasic />
        <SettingPlay />
        <SettingPlayDetail />
        <SettingDesktopLyric />
        <SettingSearch />
        <SettingList />
        <SettingDownload />
        <SettingSync />
        <SettingHotKey />
        <SettingNetwork />
        <SettingOdc />
        <SettingBackup />
        <SettingOther />
        <SettingUpdate />
        <SettingAbout /> -->
      </dl>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick, watch } from '@common/utils/vueTools'
// import { currentStting } from './setting'
import { useI18n } from '@renderer/plugins/i18n'
import { useRoute } from '@common/utils/vueRouter'

import SettingBasic from './components/SettingBasic.vue'
import SettingWy from './components/SettingWy.vue'
import SettingLastfm from './components/SettingLastfm.vue'
import SettingPlay from './components/SettingPlay.vue'
import SettingPlayDetail from './components/SettingPlayDetail.vue'
import SettingDesktopLyric from './components/SettingDesktopLyric.vue'
import SettingHaloPixel from './components/SettingHaloPixel.vue'
import SettingSearch from './components/SettingSearch.vue'
import SettingList from './components/SettingList.vue'
import SettingDownload from './components/SettingDownload.vue'
import SettingSync from './components/SettingSync/index.vue'
import SettingOpenAPI from './components/SettingOpenAPI.vue'
import SettingHotKey from './components/SettingHotKey.vue'
import SettingNetwork from './components/SettingNetwork.vue'
import SettingWebdav from './components/SettingWebdav.vue'
import SettingOdc from './components/SettingOdc.vue'
import SettingBackup from './components/SettingBackup.vue'
import SettingOther from './components/SettingOther.vue'
import SettingUpdate from './components/SettingUpdate.vue'
import SettingAbout from './components/SettingAbout.vue'
import SettingsSearch from './SettingsSearch.vue'

const SEARCH_META = {
  SettingWy: { targetId: 'setting_wy_api_base', keywords: ['netease', 'cloud', '网易云', '账号', 'account', 'cookie'] },
  SettingLastfm: { targetId: 'setting_lastfm_enable_scrobble', keywords: ['lastfm', 'scrobble', '听歌记录', '报告'] },
  SettingPlay: { targetId: 'setting_player_startup_auto_play', keywords: ['playback', 'player', '播放', '自动播放', 'audio'] },
  SettingPlayDetail: { targetId: 'setting_play_detail_font_zoom_enable', keywords: ['now playing', 'lyrics', '播放详情', '歌词'] },
  SettingDesktopLyric: { targetId: 'setting_desktop_lyric_enable', keywords: ['desktop lyrics', '桌面歌词', 'font'] },
  SettingHaloPixel: { targetId: 'setting_halo_pixel_enable', keywords: ['halopixel', '花再', '音响', '歌词'] },
  SettingSearch: { targetId: 'setting_search_showHot_enable', keywords: ['search', 'history', '搜索', '历史', '热门'] },
  SettingList: { targetId: 'setting_list_actionButtonsVisible_enable', keywords: ['library', 'playlist', '音乐库', '歌单', '列表'] },
  SettingDownload: { targetId: 'setting_download_enable', keywords: ['download', '下载', 'folder', '目录'] },
  SettingBasic: { targetId: 'setting_show_animate', keywords: ['general', 'theme', 'language', '基础', '主题', '语言', 'animation', '动效'] },
  SettingHotKey: { targetId: 'setting_download_hotKeyLocal', keywords: ['keyboard', 'shortcut', 'hotkey', '快捷键', '键盘'] },
  SettingSync: { targetId: 'setting_sync_enable', keywords: ['sync', '同步', 'server', 'client'] },
  SettingOpenAPI: { targetId: 'setting_open_api_enable', keywords: ['open api', 'server', '开放接口'] },
  SettingNetwork: { targetId: 'setting_network_proxy_enable', keywords: ['network', 'proxy', '网络', '代理'] },
  SettingWebdav: { keywords: ['webdav', 'cloud', '云盘', '远程'] },
  SettingOdc: { targetId: 'setting_odc_isAutoClearSearchInput', keywords: ['other devices', 'odc', '其他设备', '搜索清理'] },
  SettingBackup: { keywords: ['backup', 'restore', 'import', 'export', '备份', '恢复', '导入', '导出'] },
  SettingOther: { targetId: 'setting_transparent_window', keywords: ['other', 'window', 'transparent', '其他', '窗口', '透明'] },
  SettingUpdate: { targetId: 'setting__update_tryAutoUpdate', keywords: ['update', 'version', '更新', '版本'] },
  SettingAbout: { keywords: ['about', 'license', 'version', '关于', '许可', '版本'] },
}

export default {
  name: 'Setting',
  components: {
    SettingBasic,
    SettingWy,
    SettingLastfm,
    SettingPlay,
    SettingPlayDetail,
    SettingDesktopLyric,
    SettingHaloPixel,
    SettingSearch,
    SettingList,
    SettingDownload,
    SettingSync,
    SettingOpenAPI,
    SettingHotKey,
    SettingNetwork,
    SettingWebdav,
    SettingOdc,
    SettingBackup,
    SettingOther,
    SettingUpdate,
    SettingAbout,
    SettingsSearch,
  },
  setup() {
    const t = useI18n()
    const route = useRoute()

    const dom_content_ref = ref(null)

    const tocGroups = computed(() => [
      {
        id: 'account',
        title: t('setting_group_account'),
        items: [
          { id: 'SettingWy', title: t('setting__wy') },
          { id: 'SettingLastfm', title: t('setting__lastfm') },
        ],
      },
      {
        id: 'playback',
        title: t('setting_group_playback'),
        items: [
          { id: 'SettingPlay', title: t('setting__play') },
          { id: 'SettingPlayDetail', title: t('setting__play_detail') },
          { id: 'SettingDesktopLyric', title: t('setting__desktop_lyric') },
          { id: 'SettingHaloPixel', title: t('setting__halo_pixel') },
        ],
      },
      {
        id: 'library',
        title: t('setting_group_library'),
        items: [
          { id: 'SettingSearch', title: t('setting__search') },
          { id: 'SettingList', title: t('setting__list') },
          { id: 'SettingDownload', title: t('setting__download') },
        ],
      },
      {
        id: 'system',
        title: t('setting_group_system'),
        items: [
          { id: 'SettingBasic', title: t('setting__basic') },
          { id: 'SettingHotKey', title: t('setting__hot_key') },
          { id: 'SettingSync', title: t('setting__sync') },
          { id: 'SettingOpenAPI', title: t('setting__open_api') },
          { id: 'SettingNetwork', title: t('setting__network') },
          { id: 'SettingWebdav', title: t('setting__webdav') },
          { id: 'SettingOdc', title: t('setting__odc') },
        ],
      },
      {
        id: 'maintenance',
        title: t('setting_group_maintenance'),
        items: [
          { id: 'SettingBackup', title: t('setting__backup') },
          { id: 'SettingOther', title: t('setting__other') },
          { id: 'SettingUpdate', title: t('setting__update') },
          { id: 'SettingAbout', title: t('setting__about') },
        ],
      },
    ])
    const tocList = computed(() => tocGroups.value.flatMap((group) => group.items))
    const searchItems = computed(() => tocGroups.value.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        groupId: group.id,
        groupTitle: group.title,
        description: `${group.title} / ${item.title}`,
        ...SEARCH_META[item.id],
      }))
    ))

    const avtiveComponentName = ref(
      route.query.name && tocList.value.some((t) => t.id == route.query.name)
        ? route.query.name
        : tocList.value[0].id
    )

    const toggleTab = (id, focusPanel = false) => {
      avtiveComponentName.value = id
      void nextTick(() => {
        dom_content_ref.value?.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
        if (focusPanel) dom_content_ref.value?.focus()
      })
    }

    const handleTabKeydown = (event, id) => {
      const index = tocList.value.findIndex((item) => item.id == id)
      let nextIndex = index
      if (event.key == 'ArrowDown') nextIndex = (index + 1) % tocList.value.length
      else if (event.key == 'ArrowUp') nextIndex = (index - 1 + tocList.value.length) % tocList.value.length
      else if (event.key == 'Home') nextIndex = 0
      else if (event.key == 'End') nextIndex = tocList.value.length - 1
      else return
      event.preventDefault()
      const nextId = tocList.value[nextIndex].id
      toggleTab(nextId)
      void nextTick(() => document.getElementById(`setting-tab-${nextId}`)?.focus())
    }

    const handleSearchSelect = (item) => {
      avtiveComponentName.value = item.id
      void nextTick(() => {
        dom_content_ref.value?.scrollTo({ top: 0 })
        const target = item.targetId ? document.getElementById(item.targetId) : null
        const focusTarget = target?.matches('button, input, select, textarea, [tabindex]')
          ? target
          : target?.querySelector('button, input, select, textarea, [tabindex]')
        ;(focusTarget || dom_content_ref.value)?.focus()
      })
    }

    watch(
      () => route.query.name,
      (name) => {
        if (name && tocList.value.some((item) => item.id == name)) toggleTab(name, true)
      }
    )

    return {
      tocList,
      tocGroups,
      searchItems,
      t,
      avtiveComponentName,
      dom_content_ref,
      toggleTab,
      handleTabKeydown,
      handleSearchSelect,
    }
  },
  // mounted() {
  //   this.initTOC()
  // },
  // methods: {
  //   initTOC() {
  //     const list = this.$refs.dom_setting_list.children
  //     const toc = []
  //     let prevTitle
  //     for (const item of list) {
  //       if (item.tagName == 'DT') {
  //         prevTitle = {
  //           title: item.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: item.getAttribute('id'),
  //           dom: item,
  //           children: [],
  //         }
  //         toc.push(prevTitle)
  //         continue
  //       }
  //       const h3 = item.querySelector('h3')
  //       if (h3) {
  //         prevTitle.children.push({
  //           title: h3.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: h3.getAttribute('id'),
  //           dom: h3,
  //         })
  //       }
  //     }
  //     console.log(toc)
  //     this.toc.list = toc
  //   },
  //   handleListScroll(event) {
  //     // console.log(event.target.scrollTop)
  //   },
  // },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  display: flex;
  flex-flow: row nowrap;
  height: 100%;
  border-top: var(--color-list-header-border-bottom);
}

.toc {
  flex: 0 0 16%;
  overflow-y: scroll;
}
.tocList,
.groupItems {
  margin: 0;
  padding: 0;
  list-style: none;
}
.tocGroup + .tocGroup { margin-top: 16px; }
.groupLabel {
  display: block;
  padding: 10px 10px 5px;
  color: var(--color-font-label);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}
.tocH2 {
  display: flex;
  align-items: center;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  font-family: inherit;
  outline: 2px solid transparent;
  outline-offset: 2px;
  line-height: 1.5;
  .mixin-ellipsis-1();
  font-size: 13px;
  color: var(--color-font);
  padding: 8px 10px;
  transition: @transition-fast;
  transition-property: background-color, color;

  &:not(.active) {
    cursor: pointer;
    &:hover {
      background-color: var(--color-button-background-hover);
    }
  }
  &:focus-visible { outline-color: var(--color-focus, var(--color-primary)); }
  &.active {
    color: var(--color-primary);
  }
}
.activeIcon {
  height: 0.9em;
  width: 0.9em;
  margin-left: -0.45em;
  vertical-align: -0.05em;
}
// .tocH3 {
//   font-size: 13px;
//   opacity: .8;
// }

// .tocList {
//   .tocList {
//     // padding-left: 15px;
//   }
// }
// .tocSubListItem {
//   padding-top: 10px;
// }

.setting {
  padding: 0 15px 15px;
  font-size: 14px;
  box-sizing: border-box;
  overflow-y: auto;
  height: 100%;
  position: relative;
  width: 100%;

  :global {
    dt {
      border-left: 5px solid var(--color-primary-alpha-700);
      padding: 3px 7px;
      margin: 15px 0;

      + dd h3 {
        margin-top: 0;
      }
    }

    dd {
      // margin-left: 15px;
      // font-size: 13px;
      > div {
        padding: 0 15px;
      }
    }
    h3 {
      font-size: 12px;
      margin: 25px 0 15px;
    }
    .p {
      padding: 3px 0;
      line-height: 1.3;
      .btn {
        + .btn {
          margin-left: 10px;
        }
      }
    }

    .help-btn {
      padding: 0;
      margin: 0 0.4em;
      border: none;
      background: none;
      color: var(--color-button-font);
      cursor: pointer;
      transition: opacity 0.2s ease;
      &:hover {
        opacity: 0.7;
      }
    }
    .help-icon {
      margin: 0 0.4em;
    }
  }
}

// .btn-content {
//   display: inline-block;
//   transition: @transition-theme;
//   transition-property: opacity, transform;
//   opacity: 1;
//   transform: scale(1);

//   &.hide {
//     opacity: 0;
//     transform: scale(0);
//   }
// }

// :global(dt):target, :global(h3):target {
//   animation: highlight 1s ease;
// }

// @keyframes highlight {
//   from { background: yellow; }
//   to { background: transparent; }
// }
</style>
