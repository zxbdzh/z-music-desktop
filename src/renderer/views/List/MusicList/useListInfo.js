import { ref, watch, computed, onBeforeUnmount } from '@common/utils/vueTools'
import { playMusicInfo, playInfo } from '@renderer/store/player/state'
import { getListMusics } from '@renderer/store/list/action'
import { appSetting } from '@renderer/store/setting'

export default ({ props, onLoadedList }) => {
  const rightClickSelectedIndex = ref(-1)
  const selectedIndex = ref(-1)
  const dom_listContent = ref(null)
  const listRef = ref(null)

  const filterByLocation = (items) => {
    if (props.location == 'all') return items
    return items.filter((item) => {
      const itemLocation = item.meta?.webdav
        ? 'webdav'
        : item.source == 'local'
          ? 'local'
          : 'cloud'
      return itemLocation == props.location
    })
  }

  const excludeListIds = computed(() => [props.listId])

  const list = ref([])
  watch(
    () => [props.listId, props.location],
    (id) => {
      getListMusics(props.listId).then((l) => {
        list.value = [...filterByLocation(l)]
        if (props.listId != id[0] || props.location != id[1]) return
        onLoadedList()
      })
    },
    {
      immediate: true,
    }
  )

  const playerInfo = computed(() => ({
    isPlayList: playMusicInfo.listId == props.listId,
    playIndex: list.value.findIndex((item) => item.id == playMusicInfo.musicInfo?.id),
  }))

  const setSelectedIndex = (index) => {
    selectedIndex.value = index
  }

  const isShowSource = computed(() => appSetting['list.isShowSource'])

  const handleMyListUpdate = (ids) => {
    if (!ids.includes(props.listId)) return
    getListMusics(props.listId).then((l) => {
      list.value = [...filterByLocation(l)]
    })
  }

  window.app_event.on('myListUpdate', handleMyListUpdate)

  onBeforeUnmount(() => {
    window.app_event.off('myListUpdate', handleMyListUpdate)
  })

  return {
    rightClickSelectedIndex,
    selectedIndex,
    dom_listContent,
    listRef,
    list,
    playerInfo,
    setSelectedIndex,
    isShowSource,
    excludeListIds,
  }
}
