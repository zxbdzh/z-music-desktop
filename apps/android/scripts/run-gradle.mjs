import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const tasks = process.argv.slice(2)

if (tasks.length === 0) {
  console.error('At least one Gradle task is required.')
  process.exit(2)
}

const androidDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'android')
const isWindows = process.platform === 'win32'
const wrapper = isWindows ? 'gradlew.bat' : './gradlew'
const result = spawnSync(wrapper, tasks, {
  cwd: androidDirectory,
  stdio: 'inherit',
  shell: isWindows
})

if (result.error) {
  console.error(`Unable to start ${wrapper}: ${result.error.message}`)
}

process.exit(result.status ?? 1)
