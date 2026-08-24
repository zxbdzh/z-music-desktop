# Dialog call-site classification

M1-04 classifies every remaining renderer Dialog call site by interaction intent. The
source scan is enforced by `dialogClassification.test.ts`; adding an unclassified
file fails the desktop test gate.

## Keep as Dialog

### Destructive confirmation

- `components/layout/PlayDetail/components/ControlBtns.vue`
- `components/material/OnlineList/useLikeMusic.js`
- `components/material/OnlineList/useMusicActions.js`
- `core/music/utils.ts`
- `views/List/MusicList/useLikeMusic.js`
- `views/List/MusicList/useMusicActions.js`
- `views/List/MusicList/useMusicToggle.js`
- `views/List/MyList/index.vue`
- `views/List/MyList/useEditList.ts`
- `views/Setting/components/SettingBackup.vue`
- `views/Setting/components/SettingDownload.vue`
- `views/songList/Detail/action.ts`

### User input or explicit choice

- `components/common/ListAddModal.vue`
- `components/common/ListAddMultipleModal.vue`
- `components/layout/ShareMusicCardModal.vue`
- `components/material/OnlineList/index.vue`
- `views/List/MusicList/index.vue`
- `views/List/MyList/components/ListSortModal.vue`
- `views/List/MyList/useShare.ts`
- `views/Setting/components/ThemeEditModal/index.vue`
- `views/Setting/components/UserApiModal.vue`
- `views/Setting/components/UserApiOnlineImportModal.vue`

### Blocking protocol, startup, or security state

- `components/layout/PactModal.vue`
- `components/layout/UpdateModal.vue`
- `core/useApp/index.ts`
- `core/useApp/useDeeplink/useLastfmAction.ts`
- `core/useApp/useDeeplink/utils.js`
- `core/useApp/useInitUserApi.ts`
- `core/useApp/usePlayer/useMediaDevice.ts`
- `core/useApp/useUpdate.ts`
- `plugins/Dialog/index.js`
- `utils/compositions/useImportTip.ts`

## Migrated or queued as non-blocking feedback

`views/Setting/components/SettingWy.vue` uses Notice for service save/clear/test,
captcha delivery, login success/failure, cookie save, and logout. Connection testing
uses stable ID `setting-wy-connection`, updating one loading notice in place.

The following legacy pages still contain ordinary result dialogs. They remain
classified so the inventory is complete; product acceptance for Desktop RC does not
exercise these legacy routes, and future migration cannot happen silently:

- `views/Leaderboard/action.ts`
- `views/Setting/components/SettingBasic.vue`
- `views/Setting/components/SettingOther.vue`
- `views/Setting/components/SettingPlay.vue`
- `views/Setting/components/SettingWebdav.vue`
- `views/Setting/components/SettingWyLogin.vue`
- `views/WebdavPlay/index.vue`
- `views/WyCloud/index.vue`

The unified Music Library routes own WebDAV and cloud browsing in Desktop RC. The
legacy route files are retained for compatibility redirects.
