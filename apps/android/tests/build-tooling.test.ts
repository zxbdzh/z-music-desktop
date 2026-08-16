import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import rootPackageSource from '../../../package.json?raw'
import workflowSource from '../../../.github/workflows/quality-gate.yml?raw'
import androidPackageSource from '../package.json?raw'
import gradleRunnerSource from '../scripts/run-gradle.mjs?raw'
import apkScannerSource from '../scripts/scan-apk.mjs?raw'

interface WorkflowStep {
  name?: string
  run?: string
  uses?: string
  with?: Record<string, unknown>
}

interface Workflow {
  jobs?: {
    android?: {
      steps?: WorkflowStep[]
    }
  }
}

const rootPackage = JSON.parse(rootPackageSource) as { scripts: Record<string, string> }
const androidPackage = JSON.parse(androidPackageSource) as { scripts: Record<string, string>, dependencies: Record<string, string>, devDependencies: Record<string, string> }

const workflow = parse(workflowSource) as Workflow
const androidSteps = workflow.jobs?.android?.steps
if (!androidSteps) throw new Error('Missing Android workflow steps')
const stepNamed = (name: string) => {
  const step = androidSteps.find(candidate => candidate.name === name)
  if (!step) throw new Error(`Missing Android workflow step: ${name}`)
  return step
}

describe('Android root build commands', () => {
  it('exposes the clean-checkout workflow from the repository root', () => {
    expect(rootPackage.scripts).toMatchObject({
      'android:install': 'pnpm --dir apps/android install --frozen-lockfile',
      'android:test': 'pnpm --dir apps/android test',
      'android:typecheck': 'pnpm --dir apps/android typecheck',
      'android:build:web': 'pnpm --dir apps/android build:web',
      'android:cap:sync': 'pnpm --dir apps/android cap:sync',
      'android:sync': 'pnpm android:build:web && pnpm android:cap:sync',
      'android:gradle:unit': 'pnpm --dir apps/android android:gradle:unit',
      'android:gradle:debug': 'pnpm --dir apps/android android:gradle:debug',
      'android:scan:apk': 'pnpm --dir apps/android scan:apk'
    })
    expect(androidPackage.scripts).toMatchObject({
      test: 'pnpm test:unit && pnpm test:scanners',
      'test:unit': 'vitest run',
      'test:scanners': 'node --test scripts/*.node-test.mjs'
    })
    expect(rootPackage.scripts['android:test']).toBe('pnpm --dir apps/android test')
  })

  it('allows only the supported Gradle tasks and keeps the platform wrappers', () => {
    expect(gradleRunnerSource).toContain("':app:testDebugUnitTest'")
    expect(gradleRunnerSource).toContain("':app:assembleDebug'")
    expect(gradleRunnerSource).toContain("isWindows ? 'gradlew.bat' : './gradlew'")
<<<<<<< HEAD
    expect(androidPackage.scripts['android:gradle:unit']).toContain(':app:testDebugUnitTest')
    expect(androidPackage.scripts['android:gradle:debug']).toContain(':app:assembleDebug')
  })
=======
    expect(androidPackage.scripts['android:gradle:unit']).toBe('node scripts/run-gradle.mjs :app:testDebugUnitTest')
    expect(androidPackage.scripts['android:gradle:debug']).toBe('node scripts/run-gradle.mjs :app:assembleDebug')
  })

  it('uses the approved archive reader instead of parsing ZIP headers', () => {
    expect(androidPackage.dependencies.yauzl).toBe('2.10.0')
    expect(apkScannerSource).toContain("from 'yauzl'")
    expect(apkScannerSource).not.toMatch(/readUInt(?:16|32)LE|endOfCentralDirectory|centralDirectorySignature|localFileSignature/)
  })

  it('tracks the Linux Gradle wrapper as executable', () => {
    const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
    const indexEntry = execFileSync('git', ['ls-files', '--stage', 'apps/android/android/gradlew'], {
      cwd: repositoryRoot,
      encoding: 'utf8'
    })
    expect(indexEntry.trim().split(/\s+/)[0]).toBe('100755')
    expect(stepNamed('Ensure the Linux Gradle wrapper is executable').run).toBe('chmod +x apps/android/android/gradlew')
  })
>>>>>>> 627cc63 (fix: 加固 Android 构建与 APK 质量门禁)
})

describe('Android CI contract', () => {
  it('runs build, packaged APK scan, and upload in semantic order', () => {
    expect(stepNamed('Build and sync Android web assets').run).toBe('pnpm android:sync')
    expect(stepNamed('Run Android unit tests').run).toBe('pnpm android:gradle:unit')
    expect(stepNamed('Build Android debug APK').run).toBe('pnpm android:gradle:debug')
    expect(stepNamed('Scan packaged Android debug APK').run).toBe('pnpm android:scan:apk')

    const buildIndex = androidSteps.findIndex(step => step.name === 'Build Android debug APK')
    const scanIndex = androidSteps.findIndex(step => step.name === 'Scan packaged Android debug APK')
    const uploadIndex = androidSteps.findIndex(step => step.name === 'Upload Android debug APK')
    expect(buildIndex).toBeLessThan(scanIndex)
    expect(scanIndex).toBeLessThan(uploadIndex)
  })

  it('uploads the stable full-brand debug artifact with strict settings', () => {
    const upload = stepNamed('Upload Android debug APK')
    expect(upload.uses).toBe('actions/upload-artifact@v4')
    expect(upload.with).toEqual({
      name: 'z-music-desktop-android-debug',
      path: 'apps/android/android/app/build/outputs/apk/debug/app-debug.apk',
      'if-no-files-found': 'error',
      'retention-days': 7
    })
  })

  it('keeps Capacitor fixed at 8.5.0', () => {
    expect(androidPackage.dependencies['@capacitor/android']).toBe('8.5.0')
    expect(androidPackage.dependencies['@capacitor/core']).toBe('8.5.0')
    expect(androidPackage.dependencies.yauzl).toBe('2.10.0')
    expect(androidPackage.devDependencies['@capacitor/cli']).toBe('8.5.0')
    expect(androidPackage.devDependencies.yaml).toBe('2.8.1')
  })
})
