<script setup lang="ts">
import { Check, ExternalLink, KeyRound, Palette, Settings2 } from '@lucide/vue'
import ScreenHeader from '../components/ScreenHeader.vue'
</script>

<template>
  <div class="screen">
    <ScreenHeader eyebrow="Settings" title="把体验调成你的样子" description="移动端先建立清晰的设置分组，平台能力会逐步替换占位 adapter。" />
    <section class="settings-group" aria-labelledby="appearance-title">
      <h2 id="appearance-title">外观与窗口</h2>
      <div class="settings-row"><div class="settings-row-copy"><strong><Palette :size="17" aria-hidden="true" /> 主题</strong><span>跟随系统，支持 Light / Dark</span></div><span class="status-dot ready" aria-label="已启用"></span></div>
    </section>
    <section class="settings-group" aria-labelledby="connection-title">
      <h2 id="connection-title">第三方服务</h2>
      <div class="settings-row"><div class="settings-row-copy"><strong><KeyRound :size="17" aria-hidden="true" /> 服务地址</strong><span>由用户输入；凭据交给 SecureCredentialStore</span></div><span class="status-dot" aria-label="尚未配置"></span></div>
      <div class="settings-row"><div class="settings-row-copy"><strong><ExternalLink :size="17" aria-hidden="true" /> 网易云等服务</strong><span>仅作为报告、账号、云盘和评论的第三方连接</span></div><span class="status-dot" aria-label="尚未配置"></span></div>
    </section>
    <p class="note"><Settings2 :size="16" aria-hidden="true" /> 原生安全存储与通知将在 Android adapter 中实现。</p>
    <p class="note"><Check :size="16" aria-hidden="true" /> 当前壳层不会读取 Electron 或 Node API。</p>
  </div>
</template>
