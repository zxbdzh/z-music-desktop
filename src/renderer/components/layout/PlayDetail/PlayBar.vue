<template>
  <div :class="$style.footer">
    <div :class="$style.footerLeft">
      <control-btns />
      <div :class="$style.progressContainer">
        <div :class="$style.progressContent">
          <common-progress-bar
            :class-name="$style.progress"
            :progress="progress"
            :handle-transition-end="handleTransitionEnd"
            :is-active-transition="isActiveTransition"
          />
        </div>
      </div>
      <div :class="$style.timeLabel">
        <span :class="$style.status" style="margin-right: 15px">{{ status }}</span
        ><span>{{ nowPlayTimeStr }}</span
        ><span style="margin: 0 5px">/</span><span>{{ maxPlayTimeStr }}</span>
      </div>
    </div>
    <div :class="$style.playControl">
      <button
        type="button"
        :class="$style.playBtn"
        :aria-label="$t('player__prev')"
        :title="$t('player__prev')"
        @click="playPrev()"
      >
        <svg
          aria-hidden="true"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xlink="http://www.w3.org/1999/xlink"
          height="100%"
          viewBox="0 0 1024 1024"
          space="preserve"
        >
          <use xlink:href="#icon-prevMusic" />
        </svg>
      </button>
      <button
        type="button"
        :class="[$style.playBtn, $style.primary]"
        :aria-label="isPlay ? $t('player__pause') : $t('player__play')"
        :title="isPlay ? $t('player__pause') : $t('player__play')"
        @click="togglePlay"
      >
        <svg
          v-if="isPlay"
          aria-hidden="true"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xlink="http://www.w3.org/1999/xlink"
          height="100%"
          viewBox="0 0 1024 1024"
          space="preserve"
        >
          <use xlink:href="#icon-pause" />
        </svg>
        <svg
          v-else
          aria-hidden="true"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xlink="http://www.w3.org/1999/xlink"
          height="100%"
          viewBox="0 0 1024 1024"
          space="preserve"
        >
          <use xlink:href="#icon-play" />
        </svg>
      </button>
      <button
        type="button"
        :class="$style.playBtn"
        :aria-label="$t('player__next')"
        :title="$t('player__next')"
        @click="playNext()"
      >
        <svg
          aria-hidden="true"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xlink="http://www.w3.org/1999/xlink"
          height="100%"
          viewBox="0 0 1024 1024"
          space="preserve"
        >
          <use xlink:href="#icon-nextMusic" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { playNext, playPrev, togglePlay } from '@renderer/core/player'
import { status, isPlay } from '@renderer/store/player/state'
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'

import ControlBtns from './components/ControlBtns.vue'

const { nowPlayTimeStr, maxPlayTimeStr, progress, isActiveTransition, handleTransitionEnd } =
  usePlayProgress()
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.footer {
  flex: 0 0 88px;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.footerLeft {
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  padding: 13px 13px 13px 30px;
  overflow: hidden;
}

.progressContainer {
  width: 100%;
  position: relative;
  padding: 3px 0;
}

.progressContent {
  position: relative;
  height: 16px;
  padding: 5px 0;
  width: 100%;
}
.progress {
  height: 100%;
}

.barTransition {
  transition-property: transform;
  transition-timing-function: ease-out;
  transition-duration: 0.2s;
}
.timeLabel {
  width: 100%;
  height: 18px;
  display: flex;
  span {
    font-size: 13px;
  }
}
.status {
  flex: auto;
}

.playControl {
  flex: none;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  padding: 0 25px;
  color: var(--color-button-font);
}
.playBtn {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  padding: 9px;
  background: transparent;
  font: inherit;
  cursor: pointer;
  flex: none;
  color: var(--color-button-font);
  transition: background-color @motion-press @ease-out, color @motion-press @ease-out, transform @motion-press @ease-out;
  opacity: 1;

  + .playBtn {
    margin-left: 0;
  }
  svg {
    fill: currentColor;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }
  &:hover {
    background: var(--color-primary-alpha-900, rgba(77, 175, 124, .1));
    color: var(--color-primary, var(--color-button-font));
  }
  &:active {
    transform: scale(.94);
  }
  &:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-primary));
    outline-offset: 2px;
  }
}

.playControl > .primary {
  width: 48px;
  height: 48px;
  padding: 12px;
  color: var(--color-brand, var(--color-primary));
  background: var(--color-primary-alpha-900, rgba(77, 175, 124, .1));
}

@media (prefers-reduced-motion: reduce) {
  .playBtn { transition-duration: var(--motion-reduced, 140ms); }
}
</style>
