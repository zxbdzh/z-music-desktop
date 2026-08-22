<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowRight, BookOpen, ListMusic, Search } from '@lucide/vue'
import ScreenHeader from '../components/ScreenHeader.vue'

const router = useRouter()
</script>

<template>
  <div class="screen">
    <ScreenHeader
      eyebrow="z-music-desktop / Android preview"
      title="把今天的声音放在一起"
      description="移动端壳层已经就位。连接你的音乐库后，最近播放、歌单和报告会在这里汇合。"
    />

    <section class="hero-panel" aria-labelledby="connect-title">
      <div class="hero-copy">
        <p class="eyebrow">Cover Pulse</p>
        <h2 id="connect-title">从一首歌开始</h2>
        <p>选择音乐库，或从发现页搜索内容。播放链路会由平台适配层接管。</p>
        <button class="action-button" type="button" @click="router.push('/library')">
          <strong>打开音乐库 <ArrowRight :size="15" aria-hidden="true" /></strong>
          <span>查看本地、云端与 WebDAV</span>
        </button>
      </div>
      <div class="hero-art" aria-hidden="true"><span>cover<br />pulse</span></div>
    </section>

    <section aria-labelledby="quick-title">
      <div class="section-heading">
        <h2 id="quick-title">快速开始</h2>
        <p>三个入口，少一步犹豫</p>
      </div>
      <div class="action-grid">
        <button class="action-button" type="button" @click="router.push('/discover')">
          <Search :size="18" aria-hidden="true" />
          <strong>搜索音乐</strong>
          <span>找到下一首</span>
        </button>
        <button class="action-button" type="button" @click="router.push({ path: '/library', query: { tab: '歌单' } })">
          <ListMusic :size="18" aria-hidden="true" />
          <strong>打开歌单</strong>
          <span>整理你的收藏</span>
        </button>
        <button class="action-button" type="button" @click="router.push('/library')">
          <BookOpen :size="18" aria-hidden="true" />
          <strong>进入音乐库</strong>
          <span>浏览全部音乐</span>
        </button>
      </div>
    </section>

    <section aria-labelledby="recent-title">
      <div class="section-heading">
        <h2 id="recent-title">最近播放</h2>
        <span class="note">移动端同步准备中</span>
      </div>
      <div class="empty-panel">
        <strong>还没有播放记录</strong>
        <p>从桌面端同步后，最近听过的内容会出现在这里。</p>
      </div>
    </section>
  </div>
</template>
