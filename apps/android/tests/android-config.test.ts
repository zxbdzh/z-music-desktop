import { describe, expect, it } from 'vitest'

const gradleFiles = import.meta.glob('../android/**/*.{gradle,properties}', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const nativeFiles = import.meta.glob('../android/**/*.{java,kt}', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const xmlFiles = import.meta.glob('../android/**/*.xml', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

function sourceEndingWith(suffix: string): string {
  const entry = Object.entries(gradleFiles).find(([file]) => file.endsWith(`/android/${suffix}`))
  if (!entry) throw new Error(`Missing Android config file: ${suffix}`)
  return entry[1]
}

describe('Android build baseline', () => {
  it('pins the required native toolchain and media player versions', () => {
    expect(sourceEndingWith('gradle/wrapper/gradle-wrapper.properties')).toContain('gradle-8.14.3-all.zip')
    expect(sourceEndingWith('build.gradle')).toContain("com.android.tools.build:gradle:8.13.0")
    const variables = sourceEndingWith('variables.gradle')
    expect(variables).toContain('minSdkVersion = 24')
    expect(variables).toContain('compileSdkVersion = 36')
    expect(variables).toContain('targetSdkVersion = 36')
    expect(variables).toContain("media3Version = '1.11.0'")
    expect(sourceEndingWith('app/build.gradle')).toContain('media3-exoplayer:$media3Version')
  })

  it('keeps native source free of Electron and Node imports', () => {
    const forbidden = /(?:electron|node:|require\s*\(\s*['"](?:fs|path|electron))/i
    for (const [file, source] of Object.entries(nativeFiles)) {
      expect(source, file).not.toMatch(forbidden)
    }
  })

  it('uses the z-music-desktop brand for the native launch surface', () => {
    const manifest = Object.entries(xmlFiles).find(([file]) => file.endsWith('/android/app/src/main/AndroidManifest.xml'))?.[1] ?? ''
    const styles = Object.entries(xmlFiles).find(([file]) => file.endsWith('/android/app/src/main/res/values/styles.xml'))?.[1] ?? ''
    expect(manifest).toContain('@drawable/ic_launcher_brand')
    expect(styles).toContain('@drawable/splash_brand')
  })
})
