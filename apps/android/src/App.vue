<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  BarChart3,
  Compass,
  Home,
  Library,
  Pause,
  Play,
  Podcast,
  Search,
  Settings,
  SkipForward
} from '@lucide/vue'
import type { Component } from 'vue'
import { usePlatform } from './platform'
import type { PlayerState } from './platform'

interface NavItem {
  label: string
  route: string
  icon: Component
}

const navItems: ReadonlyArray<NavItem> = [
  { label: '首页', route: '/home', icon: Home },
  { label: '发现', route: '/discover', icon: Compass },
  { label: '音乐库', route: '/library', icon: Library },
  { label: '播客', route: '/podcasts', icon: Podcast },
  { label: '报告', route: '/reports', icon: BarChart3 },
  { label: '设置', route: '/settings', icon: Settings }
]

const route = useRoute()
const router = useRouter()
const platform = usePlatform()
const playerState = ref<PlayerState>({ status: 'idle', currentTrack: null, positionMs: 0, durationMs: 0 })
let unsubscribePlayer: (() => void) | undefined

const pageTitle = computed(() => {
  const item = navItems.find((candidate) => candidate.route === route.path)
  return item?.label ?? 'z-music-desktop'
})

const currentTrackLabel = computed(() => playerState.value.currentTrack?.title ?? '还没有选择歌曲')
const currentArtistLabel = computed(() => playerState.value.currentTrack?.artist ?? '从音乐库开始播放')
const isPlaying = computed(() => playerState.value.status === 'playing')

function isActive(item: NavItem): boolean {
  return route.path === item.route
}

async function togglePlayback(): Promise<void> {
  if (isPlaying.value) await platform.player.pause()
  else await platform.player.play()
}

function openSearch(): void {
  void router.push({ path: '/discover', query: { focus: 'search' } })
}

onMounted(async () => {
  playerState.value = await platform.player.getState()
  unsubscribePlayer = platform.player.subscribe((state) => { playerState.value = state })
})

onUnmounted(() => unsubscribePlayer?.())
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/home" aria-label="返回 z-music-desktop 首页">
        <span class="brand-mark" aria-hidden="true">Z</span>
        <span class="brand-name">z-music-desktop</span>
      </RouterLink>
      <div class="topbar-context" aria-live="polite">{{ pageTitle }}</div>
      <button class="icon-button" type="button" aria-label="搜索音乐" @click="openSearch">
        <Search :size="21" stroke-width="2" aria-hidden="true" />
      </button>
    </header>

    <main id="main-content" class="main-content" tabindex="-1">
      <RouterView v-slot="{ Component: routeComponent }">
        <Transition name="page" mode="out-in">
          <component :is="routeComponent" />
        </Transition>
      </RouterView>
    </main>

    <section class="mini-player" aria-label="当前播放">
      <div class="mini-player-art" aria-hidden="true"><span>♪</span></div>
      <div class="mini-player-copy">
        <strong>{{ currentTrackLabel }}</strong>
        <span>{{ currentArtistLabel }}</span>
      </div>
      <button
        class="player-control"
        type="button"
        :aria-label="isPlaying ? '暂停' : '播放'"
        :disabled="!playerState.currentTrack"
        @click="togglePlayback"
      >
        <Pause v-if="isPlaying" :size="20" fill="currentColor" aria-hidden="true" />
        <Play v-else :size="20" fill="currentColor" aria-hidden="true" />
      </button>
      <button class="player-control player-next" type="button" aria-label="下一首" :disabled="!playerState.currentTrack" @click="platform.player.next()">
        <SkipForward :size="19" fill="currentColor" aria-hidden="true" />
      </button>
    </section>

    <nav class="bottom-nav" aria-label="主导航">
      <RouterLink
        v-for="item in navItems"
        :key="item.route"
        class="nav-item"
        :class="{ active: isActive(item) }"
        :to="item.route"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <component :is="item.icon" :size="20" stroke-width="2" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
