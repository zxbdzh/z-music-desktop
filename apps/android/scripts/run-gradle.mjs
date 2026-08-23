import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const tasks = process.argv.slice(2)
export const supportedTasks = Object.freeze([
  ':app:testDebugUnitTest',
  ':app:assembleDebug'
])

export function validateGradleTasks(candidateTasks) {
  if (candidateTasks.length !== 1 || !supportedTasks.includes(candidateTasks[0])) {
    throw new Error(`Expected exactly one supported Gradle task: ${supportedTasks.join(', ')}`)
  }
  return candidateTasks[0]
}

export function runGradle(candidateTasks, platform = process.platform) {
  const task = validateGradleTasks(candidateTasks)
  const androidDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'android')
  const isWindows = platform === 'win32'
  const wrapper = isWindows ? 'gradlew.bat' : './gradlew'
  const result = spawnSync(wrapper, [task], {
    cwd: androidDirectory,
    stdio: 'inherit',
    shell: isWindows
  })

  if (result.error) console.error(`Unable to start ${wrapper}: ${result.error.message}`)
  return result.status ?? 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = runGradle(tasks)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
  }
}
