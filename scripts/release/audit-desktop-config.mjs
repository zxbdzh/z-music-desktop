import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DESKTOP_RELEASE } from './desktop-config.mjs'

const read = (path) => readFileSync(path, 'utf8')
const pkg = JSON.parse(read('package.json'))
const pack = read('build-config/build-pack.js')
const app = read('src/main/app.ts')
const userData = read('src/main/utils/userDataPath.ts')
const constants = read('src/common/constants.ts')
const oauth = read('src/common/cerumusic.ts')

assert.equal(pkg.name, DESKTOP_RELEASE.productName)
assert.equal(pkg.version, DESKTOP_RELEASE.version)
assert.match(pack, new RegExp(`appId: ['"]${DESKTOP_RELEASE.appId.replaceAll('.', '\\.')}`))
assert.match(pack, new RegExp(`productName: ['"]${DESKTOP_RELEASE.productName}`))
assert.match(pack, new RegExp(`name: ['"]${DESKTOP_RELEASE.protocolName}`))
assert.match(pack, new RegExp(`schemes: \\[['"]${DESKTOP_RELEASE.protocolScheme}`))
assert.match(pack, /extraResources: \['\.\/licenses', '\.\/LICENSE', '\.\/NOTICE'\]/)
assert.match(pack, /requestedExecutionLevel: 'asInvoker'/)
assert.match(pack, /deleteAppDataOnUninstall: false/)
assert.match(app, /setAsDefaultProtocolClient\('lxmusic'/)
assert.match(app, /PORTABLE_EXECUTABLE_DIR/)
assert.match(constants, /\^lxmusic:\\\/\\\//)
assert.match(oauth, new RegExp(DESKTOP_RELEASE.oauthCallback.replaceAll('/', '\\/')))
assert.match(userData, new RegExp(`LEGACY_USER_DATA_DIR_NAME = ['"]${DESKTOP_RELEASE.legacyUserDataDir}`))
assert.ok(read('LICENSE').includes('Apache License'))
assert.ok(read('NOTICE').includes('ikunshare/ikun-music-desktop'))
assert.ok(read('NOTICE').includes('lyswhut/lx-music-desktop'))

console.log(JSON.stringify({ result: 'PASS', ...DESKTOP_RELEASE }, null, 2))
