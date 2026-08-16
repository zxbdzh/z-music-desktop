import assert from 'node:assert/strict'
import test from 'node:test'

import { supportedTasks, validateGradleTasks } from './run-gradle.mjs'

test('Gradle runner accepts only the supported unit and debug tasks', () => {
  assert.deepEqual(supportedTasks, [':app:testDebugUnitTest', ':app:assembleDebug'])
  for (const task of supportedTasks) assert.equal(validateGradleTasks([task]), task)
})

test('Gradle runner rejects arbitrary tasks, extra arguments, and command metacharacters', () => {
  const invalidArguments = [
    [],
    [':app:clean'],
    [':app:assembleDebug', '--stacktrace'],
    [':app:assembleDebug&whoami'],
    [':app:assembleDebug | whoami'],
    [':app:assembleDebug; whoami'],
    [':app:assembleDebug && whoami']
  ]

  for (const args of invalidArguments) {
    assert.throws(() => validateGradleTasks(args), /exactly one supported Gradle task/)
  }
})
