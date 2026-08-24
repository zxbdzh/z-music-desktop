<template>
  <div :class="$style.search">
    <label :class="$style.label" for="settings-search-input">{{ label }}</label>
    <div :class="$style.inputWrap">
      <input
        id="settings-search-input"
        ref="inputRef"
        v-model="query"
        type="search"
        role="combobox"
        autocomplete="off"
        :placeholder="placeholder"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="activeId || undefined"
        @compositionstart="composing = true"
        @compositionend="handleCompositionEnd"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <button v-if="query" type="button" :class="$style.clear" :aria-label="clearLabel" @click="clear">
        &times;
      </button>
    </div>
    <ul v-if="isOpen" :id="listboxId" :class="$style.results" role="listbox">
      <li
        v-for="(item, index) in results"
        :id="optionId(index)"
        :key="item.id"
        role="option"
        :aria-selected="index == activeIndex"
        :class="{ [$style.active]: index == activeIndex }"
        @mousedown.prevent
        @click="select(item)"
      >
        <strong>{{ item.title }}</strong>
        <span>{{ item.groupTitle }} · {{ item.description }}</span>
      </li>
      <li v-if="results.length == 0" :class="$style.empty" role="status">{{ emptyLabel }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { moveSearchSelection, searchSettings, type SettingSearchItem } from './settingsSearch'

const props = defineProps<{
  items: SettingSearchItem[]
  label: string
  placeholder: string
  clearLabel: string
  emptyLabel: string
}>()
const emit = defineEmits<{ select: [item: SettingSearchItem] }>()

const listboxId = 'settings-search-results'
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const activeIndex = ref(-1)
const dismissed = ref(false)
const composing = ref(false)
const results = computed(() => searchSettings(props.items, query.value))
const isOpen = computed(() => Boolean(query.value.trim()) && !dismissed.value)
const optionId = (index: number) => `${listboxId}-${index}`
const activeId = computed(() => isOpen.value && activeIndex.value >= 0 ? optionId(activeIndex.value) : '')

watch(results, (items) => {
  if (activeIndex.value >= items.length) activeIndex.value = items.length ? items.length - 1 : -1
})

const handleInput = () => {
  if (composing.value) return
  dismissed.value = false
  activeIndex.value = -1
}
const handleCompositionEnd = () => {
  composing.value = false
  handleInput()
}
const select = (item: SettingSearchItem) => {
  emit('select', item)
  dismissed.value = true
  activeIndex.value = -1
  void nextTick(() => inputRef.value?.focus())
}
const clear = () => {
  query.value = ''
  dismissed.value = false
  activeIndex.value = -1
  void nextTick(() => inputRef.value?.focus())
}
const handleKeydown = (event: KeyboardEvent) => {
  if (composing.value || event.isComposing) return
  if (event.key == 'Escape' && isOpen.value) {
    event.preventDefault()
    dismissed.value = true
    activeIndex.value = -1
    return
  }
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && isOpen.value) {
    event.preventDefault()
    activeIndex.value = moveSearchSelection(activeIndex.value, event.key, results.value.length)
    return
  }
  if (event.key == 'Enter' && isOpen.value && activeIndex.value >= 0) {
    event.preventDefault()
    const item = results.value[activeIndex.value]
    if (item) select(item)
  }
}
</script>

<style lang="less" module>
.search { position: relative; padding: 10px; }
.label { display: block; margin-bottom: 6px; color: var(--color-font-label); font-size: 12px; }
.inputWrap { position: relative; }
.inputWrap input {
  width: 100%; height: 34px; box-sizing: border-box; padding: 0 34px 0 10px;
  border: 1px solid var(--color-border); border-radius: 4px;
  background: var(--color-surface); color: var(--color-font); font: inherit;
  outline: 2px solid transparent; outline-offset: 1px;
}
.inputWrap input:focus-visible { outline-color: var(--color-focus, var(--color-primary)); }
.clear { position: absolute; top: 1px; right: 1px; width: 32px; height: 32px; border: 0; background: transparent; color: var(--color-font); cursor: pointer; font-size: 18px; }
.results { position: absolute; z-index: 10; left: 10px; right: 10px; max-height: min(360px, 55vh); overflow: auto; margin: 4px 0 0; padding: 4px; list-style: none; border: 1px solid var(--color-list-header-border-bottom); border-radius: 4px; background: var(--color-content-background); box-shadow: 0 8px 24px rgb(0 0 0 / 20%); }
.results li { padding: 8px; border-radius: 3px; cursor: pointer; }
.results li.active, .results li:hover { background: var(--color-button-background-hover); }
.results strong, .results span { display: block; }
.results span { margin-top: 3px; color: var(--color-font-label); font-size: 11px; line-height: 1.4; }
.results .empty { cursor: default; color: var(--color-font-label); }
</style>
