<template>
  <main :class="$style.page" id="main-content" tabindex="-1">
    <section :class="$style.hero" aria-labelledby="home-title">
      <div :class="$style.heroCopy">
        <div :class="$style.kicker">Z / {{ $t('home_kicker') }}</div>
        <h1 id="home-title">{{ $t('home_title') }}</h1>
        <p :class="$style.subtitle">
          {{ hasCurrent ? $t('home_continue_hint') : $t('home_empty_hint') }}
        </p>
        <div :class="$style.actions">
          <button type="button" :class="$style.primaryAction" @click="continuePlaying">
            <svg aria-hidden="true" viewBox="0 0 24 24"><use xlink:href="#icon-play" /></svg>
            {{ hasCurrent ? $t('home_continue') : $t('home_start_search') }}
          </button>
          <button type="button" :class="$style.secondaryAction" @click="openLibrary">
            <svg aria-hidden="true" viewBox="0 0 24 24"><use xlink:href="#icon-album" /></svg>
            {{ $t('home_open_library') }}
          </button>
        </div>
      </div>

      <button
        v-if="hasCurrent"
        type="button"
        :class="$style.nowPlaying"
        :aria-label="$t('home_now_playing')"
        @click="showPlayerDetail"
      >
        <div :class="$style.coverFrame">
          <img v-if="musicInfo.pic" :src="musicInfo.pic" decoding="async" :alt="musicInfo.name" />
          <div v-else :class="$style.coverFallback" aria-hidden="true">Z</div>
        </div>
        <div :class="$style.nowMeta">
          <span :class="$style.nowLabel">{{ $t('home_now_playing') }}</span>
          <strong>{{ musicInfo.name || $t('home_unknown_track') }}</strong>
          <span>{{ musicInfo.singer || $t('home_unknown_artist') }}</span>
        </div>
        <svg :class="$style.openIcon" aria-hidden="true" viewBox="0 0 24 24">
          <use xlink:href="#icon-right" />
        </svg>
      </button>

      <div v-else :class="$style.emptyNow" aria-hidden="true">
        <div :class="$style.emptyMark">Z</div>
        <span>{{ $t('home_no_current') }}</span>
      </div>
    </section>

    <section :class="$style.section" aria-labelledby="recent-title">
      <div :class="$style.sectionHeader">
        <div>
          <span :class="$style.sectionEyebrow">{{ $t('home_recent_eyebrow') }}</span>
          <h2 id="recent-title">{{ $t('home_recent_title') }}</h2>
        </div>
        <button v-if="recentTracks.length" type="button" :class="$style.textAction" @click="openLibrary">
          {{ $t('home_view_library') }}
          <svg aria-hidden="true" viewBox="0 0 24 24"><use xlink:href="#icon-right" /></svg>
        </button>
      </div>

      <div v-if="recentTracks.length" :class="$style.recentGrid">
        <button
          v-for="item in recentTracks"
          :key="item.musicInfo.id"
          type="button"
          :class="$style.trackRow"
          @click="playRecent(item)"
        >
          <div :class="$style.trackCover">
            <img
              v-if="item.musicInfo.meta?.picUrl"
              :src="item.musicInfo.meta.picUrl"
              decoding="async"
              :alt="item.musicInfo.name"
            />
            <span v-else aria-hidden="true">Z</span>
          </div>
          <span :class="$style.trackMeta">
            <strong>{{ item.musicInfo.name }}</strong>
            <small>{{ item.musicInfo.singer }}</small>
          </span>
          <svg aria-hidden="true" viewBox="0 0 24 24"><use xlink:href="#icon-play" /></svg>
        </button>
      </div>

      <div v-else :class="$style.emptyState">
        <div :class="$style.emptyStateCopy">
          <strong>{{ $t('home_empty_title') }}</strong>
          <span>{{ $t('home_empty_description') }}</span>
        </div>
        <div :class="$style.emptyActions">
          <button type="button" @click="openDiscover">{{ $t('home_action_discover') }}</button>
          <button type="button" @click="openPlaylists">{{ $t('home_action_playlists') }}</button>
          <button type="button" @click="openLibrary">{{ $t('home_action_library') }}</button>
        </div>
      </div>
    </section>

    <section :class="$style.section" aria-labelledby="lists-title">
      <div :class="$style.sectionHeader">
        <div>
          <span :class="$style.sectionEyebrow">{{ $t('home_library_eyebrow') }}</span>
          <h2 id="lists-title">{{ $t('home_library_title') }}</h2>
        </div>
        <button type="button" :class="$style.textAction" @click="openLibrary">
          {{ $t('home_manage_library') }}
          <svg aria-hidden="true" viewBox="0 0 24 24"><use xlink:href="#icon-right" /></svg>
        </button>
      </div>
      <div :class="$style.listStrip">
        <button
          v-for="list in libraryLists"
          :key="list.id"
          type="button"
          :class="$style.listPreview"
          @click="openList(list.id)"
        >
          <span :class="$style.listIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><use :xlink:href="list.icon" /></svg>
          </span>
          <span>
            <strong>{{ list.label }}</strong>
            <small>{{ list.description }}</small>
          </span>
          <svg :class="$style.openIcon" aria-hidden="true" viewBox="0 0 24 24">
            <use xlink:href="#icon-right" />
          </svg>
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import {
  musicInfo,
  playMusicInfo,
  playedList,
} from '@renderer/store/player/state'
import { setShowPlayerDetail } from '@renderer/store/player/action'
import { defaultList, loveList, userLists } from '@renderer/store/list/state'
import { continueCurrentPlayback, playRecentTrack } from './playbackActions'

const router = useRouter()

const hasCurrent = computed(() => Boolean(playMusicInfo.musicInfo || musicInfo.id))
const recentTracks = computed(() => playedList.slice(-6).reverse())

const libraryLists = computed(() => {
  const builtIns = [
    {
      id: defaultList.id,
      label: window.i18n.t(defaultList.name),
      description: window.i18n.t('home_default_list_description'),
      icon: '#icon-album',
    },
    {
      id: loveList.id,
      label: window.i18n.t(loveList.name),
      description: window.i18n.t('home_love_list_description'),
      icon: '#icon-love',
    },
  ]
  const custom = userLists.slice(0, 2).map((list) => ({
    id: list.id,
    label: list.name,
    description: window.i18n.t('home_custom_list_description'),
    icon: '#icon-list-add',
  }))
  return [...builtIns, ...custom]
})

const continuePlaying = () => {
  if (!hasCurrent.value) {
    void router.push('/search')
    return
  }
  continueCurrentPlayback()
}

const showPlayerDetail = () => {
  if (hasCurrent.value) setShowPlayerDetail(true)
}

const playRecent = (item) => {
  playRecentTrack(item)
}

const openDiscover = () => void router.push('/search')
const openPlaylists = () => void router.push('/songList/list')
const openLibrary = () => void router.push('/list')
const openList = (id) => void router.push({ path: '/list', query: { id } })
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.page {
  height: 100%;
  overflow-y: auto;
  padding: 34px clamp(24px, 5vw, 72px) 48px;
  box-sizing: border-box;
  color: var(--color-text, var(--color-font));
  background: var(--color-canvas, var(--color-content-background));
  font-family: var(--font-family-text, @font-family-text);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.72fr);
  gap: clamp(24px, 5vw, 72px);
  align-items: end;
  max-width: 1180px;
  margin: 0 auto;
  padding-bottom: 42px;
  border-bottom: 1px solid var(--color-border, var(--color-primary-alpha-900));
}

.heroCopy { max-width: 570px; }
.kicker, .sectionEyebrow {
  color: var(--color-brand, var(--color-primary));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}
.hero h1 {
  margin: 12px 0 10px;
  color: var(--color-text, var(--color-font));
  font-family: var(--font-family-display, @font-family-display);
  font-size: 42px;
  line-height: 1.05;
  letter-spacing: 0;
}
.subtitle {
  max-width: 440px;
  margin: 0;
  color: var(--color-text-muted, var(--color-font-label));
  font-size: 15px;
  line-height: 1.6;
}
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.primaryAction, .secondaryAction, .textAction, .emptyActions button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border: 1px solid transparent;
  border-radius: @radius-medium;
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color @motion-press @ease-out, color @motion-press @ease-out, transform @motion-press @ease-out;
}
.primaryAction {
  color: #fff;
  background: var(--color-brand, var(--color-primary));
  font-weight: 650;
}
.secondaryAction, .emptyActions button {
  color: var(--color-text, var(--color-font));
  border-color: var(--color-border, var(--color-primary-alpha-900));
  background: var(--color-surface, var(--color-main-background));
}
.primaryAction:active, .secondaryAction:active, .emptyActions button:active { transform: translateY(1px); }
.primaryAction:focus-visible, .secondaryAction:focus-visible, .textAction:focus-visible,
.emptyActions button:focus-visible, .trackRow:focus-visible, .listPreview:focus-visible, .nowPlaying:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.primaryAction svg, .secondaryAction svg, .textAction svg, .emptyActions svg { width: 16px; height: 16px; fill: currentColor; }

.nowPlaying, .emptyNow {
  min-height: 150px;
  border: 1px solid var(--color-border, var(--color-primary-alpha-900));
  border-radius: @radius-large;
  background: var(--color-surface, var(--color-main-background));
}
.nowPlaying {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 18px;
  color: var(--color-text, var(--color-font));
  text-align: left;
  cursor: pointer;
  transition: border-color @motion-state @ease-out, transform @motion-state @ease-out;
}
.coverFrame, .emptyMark {
  flex: none;
  width: 112px;
  aspect-ratio: 1;
  border-radius: @radius-medium;
  overflow: hidden;
}
.coverFrame img { display: block; width: 100%; height: 100%; object-fit: cover; }
.coverFallback, .emptyMark {
  display: grid;
  place-items: center;
  color: var(--color-brand, var(--color-primary));
  background: var(--color-canvas, var(--color-content-background));
  font-family: var(--font-family-display, @font-family-display);
  font-size: 42px;
  font-weight: 700;
}
.nowMeta { display: flex; min-width: 0; flex: 1; flex-flow: column; gap: 5px; }
.nowMeta strong, .nowMeta span:not(.nowLabel) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nowMeta strong { font-size: 17px; }
.nowMeta span:not(.nowLabel) { color: var(--color-text-muted, var(--color-font-label)); font-size: 13px; }
.nowLabel { color: var(--color-brand, var(--color-primary)); font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: 0; }
.openIcon { flex: none; width: 18px; height: 18px; fill: currentColor; color: var(--color-text-muted, var(--color-font-label)); }
.emptyNow { display: flex; align-items: center; gap: 14px; padding: 18px; color: var(--color-text-muted, var(--color-font-label)); font-size: 13px; }
.emptyNow .emptyMark { width: 112px; }

.section { max-width: 1180px; margin: 38px auto 0; }
.sectionHeader { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.sectionHeader h2 { margin: 5px 0 0; font-size: 20px; line-height: 1.25; font-weight: 650; }
.textAction { min-height: 32px; padding: 0 4px; border: 0; color: var(--color-text-muted, var(--color-font-label)); background: transparent; }
.textAction:hover { color: var(--color-brand, var(--color-primary)); }

.recentGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
.trackRow, .listPreview {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  border: 0;
  border-bottom: 1px solid var(--color-border, var(--color-primary-alpha-900));
  padding: 10px 0;
  color: var(--color-text, var(--color-font));
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: color @motion-press @ease-out, background-color @motion-press @ease-out;
}
.trackRow:hover, .listPreview:hover { color: var(--color-brand, var(--color-primary)); }
.trackCover { flex: none; width: 42px; height: 42px; overflow: hidden; border-radius: @radius-small; background: var(--color-surface-raised, var(--color-main-background)); }
.trackCover img { width: 100%; height: 100%; object-fit: cover; }
.trackCover span { display: grid; place-items: center; width: 100%; height: 100%; color: var(--color-brand, var(--color-primary)); font-weight: 700; }
.trackMeta, .listPreview > span:nth-child(2) { display: flex; min-width: 0; flex: 1; flex-flow: column; gap: 3px; padding: 0 12px; }
.trackMeta strong, .trackMeta small, .listPreview strong, .listPreview small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trackMeta strong, .listPreview strong { font-size: 13px; font-weight: 600; }
.trackMeta small, .listPreview small { color: var(--color-text-muted, var(--color-font-label)); font-size: 12px; }
.trackRow > svg { flex: none; width: 16px; height: 16px; fill: currentColor; opacity: 0; transition: opacity @motion-press @ease-out; }
.trackRow:hover > svg { opacity: 1; }

.emptyState { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-top: 1px solid var(--color-border, var(--color-primary-alpha-900)); border-bottom: 1px solid var(--color-border, var(--color-primary-alpha-900)); padding: 20px 0; }
.emptyStateCopy { display: flex; flex-flow: column; gap: 5px; }
.emptyStateCopy strong { font-size: 15px; }
.emptyStateCopy span { color: var(--color-text-muted, var(--color-font-label)); font-size: 13px; }
.emptyActions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.emptyActions button { min-height: 34px; padding: 0 11px; }
.listStrip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.listPreview { min-height: 74px; border: 1px solid var(--color-border, var(--color-primary-alpha-900)); border-radius: @radius-medium; padding: 10px; background: var(--color-surface, var(--color-main-background)); }
.listIcon { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: @radius-small; color: var(--color-brand, var(--color-primary)); background: var(--color-canvas, var(--color-content-background)); }
.listIcon svg { width: 18px; height: 18px; fill: currentColor; }
.listPreview .openIcon { opacity: 0; }
.listPreview:hover .openIcon { opacity: 1; }

@media (hover: hover) and (pointer: fine) {
  .primaryAction:hover, .secondaryAction:hover, .emptyActions button:hover { transform: translateY(-1px); }
  .nowPlaying:hover { border-color: var(--color-brand, var(--color-primary)); transform: translateY(-2px); }
}

@media (max-width: 860px) {
  .page { padding-inline: 28px; }
  .hero { grid-template-columns: 1fr; gap: 24px; }
  .nowPlaying, .emptyNow { max-width: 540px; }
  .listStrip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .page { padding: 24px 18px 36px; }
  .hero h1 { font-size: 32px; }
  .recentGrid { grid-template-columns: 1fr; }
  .emptyState { align-items: flex-start; flex-flow: column; }
  .emptyActions { justify-content: flex-start; }
  .listStrip { grid-template-columns: 1fr; }
  .coverFrame, .emptyNow .emptyMark { width: 88px; }
}
@media (prefers-reduced-motion: reduce) {
  .primaryAction, .secondaryAction, .nowPlaying, .trackRow, .listPreview { transition-duration: var(--motion-reduced, 140ms); }
  .primaryAction:hover, .secondaryAction:hover, .nowPlaying:hover { transform: none; }
}
</style>
