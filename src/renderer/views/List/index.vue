<template>
  <div id="my-list" :class="$style.container">
    <header :class="$style.header">
      <div :class="$style.heading">
        <span :class="$style.eyebrow">{{ $t('nav_library') }}</span>
        <h1>{{ $t('library_title') }}</h1>
      </div>
      <div :class="$style.filters">
        <base-tab v-model="activeTab" :class="$style.primaryTabs" :list="tabs" @change="handleTabChange" />
        <base-tab v-model="location" :class="$style.locationTabs" :list="locations" @change="handleLocationChange" />
      </div>
    </header>
    <div :class="$style.content">
      <WyCloud v-if="contentView == 'wy'" />
      <WebdavPlay v-else-if="contentView == 'webdav'" />
      <Download v-else-if="contentView == 'download'" />
      <MyList
        v-else-if="contentView == 'playlists'"
        ref="myList"
        standalone
        :list-id="listId"
        @show-menu="$refs.musicList?.handleMenuClick()"
      />
      <template v-else>
        <MyList
          v-if="contentView != 'liked'"
          ref="myList"
          :list-id="listId"
          @show-menu="$refs.musicList?.handleMenuClick()"
        />
        <MusicList
          ref="musicList"
          :list-id="effectiveListId"
          :location="location"
          @show-menu="$refs.myList?.handleMenuClick()"
        />
      </template>
    </div>
  </div>
</template>

<script>
import { getListPrevSelectId } from '@renderer/utils/data'
import { appSetting } from '@renderer/store/setting'

import MyList from './MyList/index.vue'
import MusicList from './MusicList/index.vue'
import Download from '../Download/index.vue'
import WyCloud from '../WyCloud/index.vue'
import WebdavPlay from '../WebdavPlay/index.vue'
import {
  buildLibraryLocationQuery,
  buildLibraryTabQuery,
  getLibraryTabIds,
  normalizeLibraryLocation,
  normalizeLibraryTab,
  rememberNonLoveListId,
  resolveLibraryView,
} from './libraryState'

export default {
  name: 'List',
  components: {
    MyList,
    MusicList,
    Download,
    WyCloud,
    WebdavPlay,
  },
  async beforeRouteEnter(to, from, next) {
    let id = to.query.id
    if (!id) {
      id = await getListPrevSelectId()
      next({
        path: to.path,
        query: { ...to.query, id },
      })
    } else next()
  },
  beforeRouteUpdate(to, from) {
    let id = to.query.id || this.listId
    // if (!getList(id)) {
    //   id = defaultList.id
    // }
    this.listId = id
    this.lastNonLoveListId = rememberNonLoveListId(id, this.lastNonLoveListId)
    this.activeTab = normalizeLibraryTab(to.query.tab, appSetting['download.enable'])
    this.location = normalizeLibraryLocation(to.query.location)
    const scrollIndex = to.query.scrollIndex
    const isAnimation = from.query.id == to.query.id
    this.$refs.musicList?.handleRestoreScroll(scrollIndex, isAnimation)
  },
  beforeRouteLeave(to, from) {
    this.$refs.musicList?.saveListPosition()
  },
  data() {
    return {
      listId: null,
      lastNonLoveListId: null,
      activeTab: 'all',
      location: 'all',
    }
  },
  created() {
    this.listId = this.$route.query.id
    this.lastNonLoveListId = rememberNonLoveListId(this.listId)
    this.activeTab = normalizeLibraryTab(
      this.$route.query.tab,
      appSetting['download.enable']
    )
    this.location = normalizeLibraryLocation(this.$route.query.location)
  },
  computed: {
    isDownloadEnabled() {
      return appSetting['download.enable']
    },
    contentView() {
      return resolveLibraryView(
        this.activeTab,
        this.$route.query.legacy,
        this.isDownloadEnabled
      )
    },
    effectiveListId() {
      return this.activeTab == 'liked' ? 'love' : this.listId
    },
    tabs() {
      const labels = {
        all: this.$t('library_tab_all'),
        playlists: this.$t('library_tab_playlists'),
        liked: this.$t('library_tab_liked'),
        download: this.$t('library_tab_downloads'),
      }
      return getLibraryTabIds(this.isDownloadEnabled).map((id) => ({ id, label: labels[id] }))
    },
    locations() {
      return [
        { id: 'all', label: this.$t('library_location_all') },
        { id: 'local', label: this.$t('library_location_local') },
        { id: 'cloud', label: this.$t('library_location_cloud') },
        { id: 'webdav', label: 'WebDAV' },
      ]
    },
  },
  watch: {
    isDownloadEnabled(enabled) {
      if (enabled || this.activeTab != 'download') return
      this.activeTab = 'all'
      const query = buildLibraryTabQuery(
        this.$route.query,
        'all',
        this.lastNonLoveListId
      )
      void this.$router.replace({ path: '/list', query })
    },
  },
  methods: {
    async handleTabChange(tab) {
      this.lastNonLoveListId = rememberNonLoveListId(this.listId, this.lastNonLoveListId)
      if (tab != 'liked' && !this.lastNonLoveListId) {
        this.lastNonLoveListId = rememberNonLoveListId(await getListPrevSelectId())
      }
      const query = buildLibraryTabQuery(this.$route.query, tab, this.lastNonLoveListId)
      void this.$router.replace({ path: '/list', query })
    },
    handleLocationChange(location) {
      this.lastNonLoveListId = rememberNonLoveListId(this.listId, this.lastNonLoveListId)
      void this.$router.replace({
        path: '/list',
        query: buildLibraryLocationQuery(
          this.$route.query,
          location,
          this.lastNonLoveListId
        ),
      })
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  color: var(--color-text, var(--color-font));
  background: var(--color-canvas, var(--color-content-background));
}
.header {
  display: flex;
  flex: none;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  min-height: 92px;
  border-bottom: 1px solid var(--color-border, var(--color-primary-alpha-900));
  padding: 18px 24px 0;
}
.heading { flex: none; padding-bottom: 14px; }
.eyebrow { color: var(--color-brand, var(--color-primary)); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.heading h1 { margin: 5px 0 0; font-size: 20px; line-height: 1.2; font-weight: 650; }
.filters { display: flex; min-width: 0; flex: 1; align-items: flex-end; justify-content: flex-end; gap: 18px; }
.primaryTabs { min-width: 0; }
.locationTabs { flex: none; padding-right: 0; padding-left: 0; gap: 14px; color: var(--color-text-muted, var(--color-font-label)); }
.content { min-height: 0; flex: 1; display: flex; overflow: hidden; }
.content > :global(.download) { width: 100%; }

@media (max-width: 900px) {
  .header { align-items: flex-start; flex-flow: column nowrap; gap: 4px; padding-inline: 18px; }
  .heading { padding-bottom: 0; }
  .filters { width: 100%; align-items: flex-end; justify-content: flex-start; overflow-x: auto; }
  .content { min-height: 0; }
}
@media (max-width: 600px) {
  .header { min-height: 114px; }
  .filters { flex-flow: column nowrap; align-items: flex-start; gap: 0; }
  .primaryTabs, .locationTabs { width: max-content; }
}
</style>
