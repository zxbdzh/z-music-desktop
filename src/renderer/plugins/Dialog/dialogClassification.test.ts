import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const documented = new Set([
  'components/common/ListAddModal.vue',
  'components/common/ListAddMultipleModal.vue',
  'components/layout/PactModal.vue',
  'components/layout/PlayDetail/components/ControlBtns.vue',
  'components/layout/ShareMusicCardModal.vue',
  'components/layout/UpdateModal.vue',
  'components/material/OnlineList/index.vue',
  'components/material/OnlineList/useLikeMusic.js',
  'components/material/OnlineList/useMusicActions.js',
  'core/music/utils.ts',
  'core/useApp/index.ts',
  'core/useApp/useDeeplink/useLastfmAction.ts',
  'core/useApp/useDeeplink/utils.js',
  'core/useApp/useInitUserApi.ts',
  'core/useApp/usePlayer/useMediaDevice.ts',
  'core/useApp/useUpdate.ts',
  'plugins/Dialog/index.js',
  'utils/compositions/useImportTip.ts',
  'views/Leaderboard/action.ts',
  'views/List/MusicList/index.vue',
  'views/List/MusicList/useLikeMusic.js',
  'views/List/MusicList/useMusicActions.js',
  'views/List/MusicList/useMusicToggle.js',
  'views/List/MyList/components/ListSortModal.vue',
  'views/List/MyList/index.vue',
  'views/List/MyList/useEditList.ts',
  'views/List/MyList/useShare.ts',
  'views/Setting/components/SettingBackup.vue',
  'views/Setting/components/SettingBasic.vue',
  'views/Setting/components/SettingDownload.vue',
  'views/Setting/components/SettingOther.vue',
  'views/Setting/components/SettingPlay.vue',
  'views/Setting/components/SettingWebdav.vue',
  'views/Setting/components/SettingWyLogin.vue',
  'views/Setting/components/ThemeEditModal/index.vue',
  'views/Setting/components/UserApiModal.vue',
  'views/Setting/components/UserApiOnlineImportModal.vue',
  'views/songList/Detail/action.ts',
  'views/WebdavPlay/index.vue',
  'views/WyCloud/index.vue',
])

describe('Dialog call-site governance', () => {
  it('keeps every remaining renderer Dialog call-site classified', () => {
    const output = execFileSync('rg', [
      '-l', 'dialog\\.(show|confirm)|dialog\\(', 'src/renderer',
      '-g', '*.vue', '-g', '*.ts', '-g', '*.js', '-g', '!*.test.*', '-g', '!*.spec.*',
    ], { cwd: root, encoding: 'utf8' })
    const actual = new Set(output.trim().split(/\r?\n/).map((file) =>
      relative(join(root, 'src/renderer'), join(root, file)).replaceAll('\\', '/')
    ))
    expect(actual).toEqual(documented)
  })

  it('documents the stable loading Notice lifecycle for the migrated settings workflow', () => {
    const source = readFileSync(join(root, 'src/renderer/views/Setting/components/SettingWy.vue'), 'utf8')
    expect(source).not.toContain("from '@renderer/plugins/Dialog'")
    expect(source).toContain("notice.loading(t('setting__wy_service_testing'), { id: 'setting-wy-connection' })")
    expect(source).toContain("notice.update('setting-wy-connection'")
  })
})
