<template lang="pug">
transition(name="now-playing" @after-enter="handleAfterEnter" @after-leave="handleAfterLeave")
  section(
    v-if="isShowPlayerDetail"
    ref="dialogRef"
    :class="[$style.container, { fullscreen: isFullscreen }]"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    :aria-label="$t('home_now_playing')"
    @contextmenu="handleContextMenu"
    @keydown.esc="hide"
    @keydown.tab="handleTabKey"
  )
    div(:class="$style.bg")
    //- div(:class="$style.bg" :style="bgStyle")
    //- div(:class="$style.bg2")
    ControlBtnsLeftHeader(v-if="appSetting['common.controlBtnPosition'] == 'left'")
    ControlBtnsRightHeader(v-else)
    div(:class="[$style.main, {[$style.showComment]: isShowPlayComment}]")
      div.left(:class="$style.left")
        div(:class="$style.info")
          span(:class="$style.nowLabel") {{ $t('home_now_playing') }}
          div(:class="$style.artwork")
            img(v-if="musicInfo.pic" :class="$style.img" :src="musicInfo.pic" :alt="musicInfo.name")
            div(v-else :class="$style.emptyArtwork" aria-hidden="true") Z
          div.description(:class="['scroll', $style.description]")
            h1(:title="musicInfo.name || $t('home_unknown_track')") {{ musicInfo.name || $t('home_unknown_track') }}
            p {{ musicInfo.singer || $t('home_unknown_artist') }}
            p(v-if="musicInfo.album" :class="$style.album") {{ musicInfo.album }}

      transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
        LyricPlayer(v-if="visibled")
      music-comment(v-if="visibled" :class="$style.comment" :show="isShowPlayComment" :music-info="playMusicInfo.musicInfo" @close="hideComment")
    transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
      play-bar(v-if="visibled")
    transition(enter-active-class="animated-slow fadeIn" leave-active-class="animated-slow fadeOut")
      common-audio-visualizer(v-if="appSetting['player.audioVisualization'] && visibled")
</template>

<script>
import { ref, watch, nextTick } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'
import {
  isShowPlayerDetail,
  isShowPlayComment,
  musicInfo,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setShowPlayerDetail,
  setShowPlayComment,
  setShowPlayLrcSelectContentLrc,
} from '@renderer/store/player/action'
import LyricPlayer from './LyricPlayer.vue'
import PlayBar from './PlayBar.vue'
import MusicComment from './components/MusicComment/index.vue'
import ControlBtnsLeftHeader from './ControlBtnsLeftHeader.vue'
import ControlBtnsRightHeader from './ControlBtnsRightHeader.vue'
import { registerAutoHideMounse, unregisterAutoHideMounse } from './autoHideMounse'
import { appSetting } from '@renderer/store/setting'
import { closeWindow, maxWindow, minWindow, setFullScreen } from '@renderer/utils/ipc'

export default {
  name: 'CorePlayDetail',
  components: {
    ControlBtnsLeftHeader,
    ControlBtnsRightHeader,
    LyricPlayer,
    PlayBar,
    MusicComment,
  },
  setup() {
    const visibled = ref(false)
    const dialogRef = ref(null)
    let previousFocus = null

    let clickTime = 0

    const hide = () => {
      setShowPlayerDetail(false)
    }
    const handleContextMenu = () => {
      if (window.performance.now() - clickTime > 400) {
        clickTime = window.performance.now()
        return
      }
      clickTime = 0
      hide()
    }

    const hideComment = () => {
      setShowPlayComment(false)
    }

    const handleAfterEnter = () => {
      if (isFullscreen.value) registerAutoHideMounse()

      visibled.value = true
      previousFocus = document.activeElement
      void nextTick(() => dialogRef.value?.focus())
    }

    const handleAfterLeave = () => {
      setShowPlayLrcSelectContentLrc(false)
      hideComment(false)
      visibled.value = false

      unregisterAutoHideMounse()
      if (typeof HTMLElement !== 'undefined' && previousFocus instanceof HTMLElement) previousFocus.focus()
      previousFocus = null
    }

    const handleTabKey = (event) => {
      const root = dialogRef.value
      if (!root) return
      const focusable = [...root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => typeof HTMLElement !== 'undefined' && element instanceof HTMLElement && element.offsetParent !== null)
      if (!focusable.length) {
        event.preventDefault()
        root.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement
      if (!focusable.includes(activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    watch(isFullscreen, (isFullscreen) => {
      ;(isFullscreen ? registerAutoHideMounse : unregisterAutoHideMounse)()
    })

    return {
      appSetting,
      playMusicInfo,
      isShowPlayerDetail,
      isShowPlayComment,
      musicInfo,
      hide,
      handleContextMenu,
      hideComment,
      handleAfterEnter,
      handleAfterLeave,
      visibled,
      isFullscreen,
      dialogRef,
      handleTabKey,
      fullscreenExit() {
        void setFullScreen(false).then((fullscreen) => {
          isFullscreen.value = fullscreen
        })
      },
      min() {
        minWindow()
      },
      max() {
        maxWindow()
      },
      close() {
        closeWindow()
      },
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@control-btn-width: @height-toolbar * 0.26;

.container {
  position: absolute;
  display: flex;
  flex-flow: column nowrap;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: var(--color-canvas, var(--color-content-background));
  z-index: 10;
  // -webkit-app-region: drag;
  overflow: hidden;
  border-radius: @radius-border;
  color: var(--color-text, var(--color-font));
  // border-left: 12px solid var(--color-primary-alpha-900);
  -webkit-app-region: no-drag;
  contain: strict;

  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
}
.bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: var(--color-canvas, var(--color-content-background));
  z-index: -1;
}
// .bg2 {
//   position: absolute;
//   width: 100%;
//   height: 100%;
//   top: 0;
//   left: 0;
//   z-index: -1;
//   background-color: rgba(255, 255, 255, .8);
// }

.main {
  flex: auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  width: min(100%, 1360px);
  margin: 0 auto;
  padding: 12px 48px 0;
  gap: clamp(28px, 5vw, 80px);
  position: relative;

  &.showComment {
    :global {
      .left {
        flex-basis: 18%;
        .description p {
          font-size: 12px;
        }
      }
      .right {
        flex-basis: 30%;
        .lyricSelectContent {
          font-size: 14px;
        }
      }
      .comment {
        opacity: 1;
        transform: scaleX(1);
      }
    }
  }
}
.left {
  flex: 0 1 42%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  padding: 12px 0 24px;
  overflow: hidden;
  transition: flex-basis @transition-normal;
}

.info {
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  width: min(100%, 420px);
  max-width: 420px;
  min-height: 0;
}
.nowLabel {
  margin-bottom: 12px;
  color: var(--color-brand, var(--color-primary));
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
}
.artwork {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: @radius-large;
  background: var(--color-surface, var(--color-main-background));
  box-shadow: 0 16px 42px rgba(23, 26, 28, .16);
}
.img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.emptyArtwork {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--color-brand, var(--color-primary));
  background: var(--color-surface, var(--color-main-background));
  font-family: var(--font-family-display, @font-family-display);
  font-size: 96px;
  font-weight: 700;
}
.description {
  max-width: 100%;
  margin-top: 18px;
  padding-bottom: 15px;
  min-height: 0;
  h1 {
    margin: 0;
    overflow: hidden;
    color: var(--color-text, var(--color-font));
    font-family: var(--font-family-display, @font-family-display);
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    margin: 5px 0 0;
    line-height: 1.5;
    font-size: 14px;
    overflow-wrap: break-word;
    color: var(--color-text-muted, var(--color-font-label));
  }
}
.album { opacity: .78; }

.comment {
  position: absolute;
  right: 0;
  top: 0;
  width: 50%;
  height: 100%;
  opacity: 1;
  margin-left: 10px;
  transform: scaleX(0);
}

:global(.now-playing-enter-active),
:global(.now-playing-leave-active) {
  transition: opacity var(--motion-enter, 200ms) var(--ease-out, cubic-bezier(.23, 1, .32, 1)),
    transform var(--motion-enter, 200ms) var(--ease-out, cubic-bezier(.23, 1, .32, 1));
}
:global(.now-playing-enter-from),
:global(.now-playing-leave-to) {
  opacity: 0;
  transform: translateY(3%);
}

@media (max-width: 900px) {
  .main { padding-inline: 26px; gap: 28px; }
  .left { flex-basis: 38%; }
  .info { max-width: 320px; }
}
@media (max-height: 620px) {
  .main { padding-top: 0; }
  .info { max-width: 300px; }
  .description { margin-top: 12px; }
  .description h1 { font-size: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  :global(.now-playing-enter-active),
  :global(.now-playing-leave-active) {
    transition: opacity var(--motion-reduced, 140ms) var(--ease-out, cubic-bezier(.23, 1, .32, 1));
  }
  :global(.now-playing-enter-from),
  :global(.now-playing-leave-to) { transform: none; }
}
</style>
