<script setup lang="ts">
import { Headphones, Podcast } from '@lucide/vue'
import ScreenHeader from '../components/ScreenHeader.vue'
</script>

<template>
  <div class="screen">
    <ScreenHeader eyebrow="Podcasts" title="播客，慢一点听" description="单独的播客入口保留内容形态，不会和音乐库位置混在一起。" />
    <section class="empty-panel">
      <Podcast :size="30" aria-hidden="true" />
      <strong>播客内容准备中</strong>
      <p>播放队列和进度会通过 PlayerBridge 与桌面端保持一致。</p>
    </section>
    <div class="list-row"><Headphones :size="20" aria-hidden="true" /><div class="list-row-copy"><strong>继续收听</strong><span>暂无待续内容</span></div></div>
  </div>
</template>
