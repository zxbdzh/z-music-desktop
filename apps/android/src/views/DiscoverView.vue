<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Compass, Search, Sparkles } from '@lucide/vue'
import ScreenHeader from '../components/ScreenHeader.vue'

const route = useRoute()
const searchInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const categories = ['推荐', '在线歌单', '排行榜', '播客']
const selectedCategory = ref(categories[0])

onMounted(async () => {
  if (route.query.focus === 'search') {
    await nextTick()
    searchInput.value?.focus()
  }
})
</script>

<template>
  <div class="screen">
    <ScreenHeader
      eyebrow="Discover"
      title="发现一点新声音"
      description="搜索、歌单和排行榜会共用这里的入口，网易云等第三方服务不作为独立导航。"
    />

    <label class="search-field" for="discover-search">
      <Search :size="20" aria-hidden="true" />
      <input id="discover-search" ref="searchInput" v-model="query" type="search" placeholder="搜索歌曲、歌手或歌单" autocomplete="off" />
    </label>

    <div class="chip-row" role="tablist" aria-label="发现分类">
      <button
        v-for="category in categories"
        :key="category"
        class="chip"
        :class="{ active: selectedCategory === category }"
        type="button"
        role="tab"
        :aria-selected="selectedCategory === category"
        @click="selectedCategory = category"
      >{{ category }}</button>
    </div>

    <section class="empty-panel" aria-live="polite">
      <Sparkles :size="26" aria-hidden="true" />
      <strong>{{ query ? `等待搜索“${query}”` : `${selectedCategory}内容准备中` }}</strong>
      <p>接入桌面端的搜索与元数据服务后，这里会展示真实内容。</p>
    </section>

    <p class="note"><Compass :size="16" aria-hidden="true" /> 音源、音质和播放 URL 不在此壳层改动。</p>
  </div>
</template>
