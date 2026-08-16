import { describe, expect, it } from 'vitest'

import rootPackageSource from '../../../package.json?raw'
import workflowSource from '../../../.github/workflows/quality-gate.yml?raw'
import androidPackageSource from '../package.json?raw'
import gradleRunnerSource from '../scripts/run-gradle.mjs?raw'

const rootPackage = JSON.parse(rootPackageSource) as { scripts: Record<string, string> }
const androidPackage = JSON.parse(androidPackageSource) as { scripts: Record<string, string>, dependencies: Record<string, string>, devDependencies: Record<string, string> }

describe('Android root build commands', () => {
  it('exposes the clean-checkout workflow from the repository root', () => {
    expect(rootPackage.scripts).toMatchObject({
      'android:install': 'pnpm --dir apps/android install --frozen-lockfile',
      'android:test': 'pnpm --dir apps/android test',
      'android:typecheck': 'pnpm --dir apps/android typecheck',
      'android:build:web': 'pnpm --dir apps/android build:web',
      'android:cap:sync': 'pnpm --dir apps/android cap:sync',
      'android:gradle:unit': 'pnpm --dir apps/android android:gradle:unit',
      'android:gradle:debug': 'pnpm --dir apps/android android:gradle:debug'
    })
  })

  it('selects the platform Gradle wrapper without shell-specific root commands', () => {
    expect(gradleRunnerSource).toContain("isWindows ? 'gradlew.bat' : './gradlew'")
    expect(androidPackage.scripts['android:gradle:unit']).toContain(':app:testDebugUnitTest')
    expect(androidPackage.scripts['android:gradle:debug']).toContain(':app:assembleDebug')
  })
})

describe('Android CI contract', () => {
  it('pins the requested runtime and performs the complete Android gate', () => {
    expect(workflowSource).toContain('node-version: 22')
    expect(workflowSource).toContain('java-version: 21')
    expect(workflowSource).toContain('sdkmanager "platforms;android-36"')
    expect(workflowSource).toContain('run: pnpm android:install')
    expect(workflowSource).toContain('run: pnpm android:test')
    expect(workflowSource).toContain('run: pnpm android:typecheck')
    expect(workflowSource).toContain('run: pnpm android:build:web')
    expect(workflowSource).toContain('run: pnpm android:cap:sync')
    expect(workflowSource).toContain('run: pnpm android:gradle:unit')
    expect(workflowSource).toContain('run: pnpm android:gradle:debug')
    expect(workflowSource).toContain('apps/android/android/app/build/outputs/apk/debug/app-debug.apk')
  })

  it('keeps Capacitor fixed at 8.5.0', () => {
    expect(androidPackage.dependencies['@capacitor/android']).toBe('8.5.0')
    expect(androidPackage.dependencies['@capacitor/core']).toBe('8.5.0')
    expect(androidPackage.devDependencies['@capacitor/cli']).toBe('8.5.0')
  })
})
