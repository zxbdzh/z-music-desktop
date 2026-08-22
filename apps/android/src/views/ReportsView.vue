<script setup lang="ts">
import { BarChart3, Clock3, FileText } from '@lucide/vue'
import ScreenHeader from '../components/ScreenHeader.vue'
</script>

<template>
  <div class="screen">
    <ScreenHeader eyebrow="Listen report" title="听歌报告" description="把播放历史整理成可以回看的编辑式报告。" />
    <section class="empty-panel">
      <BarChart3 :size="30" aria-hidden="true" />
      <strong>报告还在等你的第一段播放</strong>
      <p>移动端会读取共享历史，不会创建另一套音源或播放记录。</p>
    </section>
    <div class="list-grid">
      <div class="list-row"><Clock3 :size="20" aria-hidden="true" /><div class="list-row-copy"><strong>本周时长</strong><span>暂无数据</span></div></div>
      <div class="list-row"><FileText :size="20" aria-hidden="true" /><div class="list-row-copy"><strong>编辑式回顾</strong><span>报告模块接入后可导出分享</span></div></div>
    </div>
  </div>
</template>
