<script setup lang="ts">
import { computed, ref } from 'vue'
import { Cloud, Download, Library, ListMusic, Music2 } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenHeader from '../components/ScreenHeader.vue'

const route = useRoute()
const router = useRouter()
const tabs = ['全部音乐', '歌单', '喜欢', '下载'] as const
const locations = ['全部', '本地', '云端', 'WebDAV'] as const
const activeTab = ref<typeof tabs[number]>(tabs.includes(route.query.tab as typeof tabs[number]) ? route.query.tab as typeof tabs[number] : tabs[0])
const activeLocation = ref<typeof locations[number]>(locations[0])
const tabDescription = computed(() => `${activeTab.value} · ${activeLocation.value}`)

function selectTab(tab: typeof tabs[number]): void {
  activeTab.value = tab
  void router.replace({ query: { ...route.query, tab: tab === tabs[0] ? undefined : tab } })
}
</script>

<template>
  <div class="screen">
    <ScreenHeader eyebrow="Library" title="你的音乐库" description="把不同位置的内容放在同一套浏览逻辑里。" />

    <div class="tab-row" role="tablist" aria-label="音乐库分类">
      <button v-for="tab in tabs" :key="tab" class="tab-button" :class="{ active: activeTab === tab }" type="button" role="tab" :aria-selected="activeTab === tab" @click="selectTab(tab)">{{ tab }}</button>
    </div>
    <div class="chip-row" role="tablist" aria-label="音乐库位置">
      <button v-for="location in locations" :key="location" class="chip" :class="{ active: activeLocation === location }" type="button" role="tab" :aria-selected="activeLocation === location" @click="activeLocation = location">{{ location }}</button>
    </div>

    <section class="empty-panel" aria-live="polite">
      <Library :size="28" aria-hidden="true" />
      <strong>{{ tabDescription }}还没有内容</strong>
      <p>完成平台连接后，真实音乐、歌单和下载状态会从共享接口进入这里。</p>
    </section>

    <div class="list-grid" aria-label="音乐库接入范围">
      <div class="list-row"><Music2 :size="20" aria-hidden="true" /><div class="list-row-copy"><strong>本地音乐</strong><span>由 FilePicker 与 DownloadStore 接入</span></div></div>
      <div class="list-row"><Cloud :size="20" aria-hidden="true" /><div class="list-row-copy"><strong>云端音乐</strong><span>由 HttpClient 与用户配置的服务地址接入</span></div></div>
      <div class="list-row"><ListMusic :size="20" aria-hidden="true" /><div class="list-row-copy"><strong>歌单与喜欢</strong><span>保持桌面端数据模型，移动端只负责呈现</span></div></div>
      <div class="list-row"><Download :size="20" aria-hidden="true" /><div class="list-row-copy"><strong>下载</strong><span>状态由 DownloadStore 统一管理</span></div></div>
    </div>
  </div>
</template>
