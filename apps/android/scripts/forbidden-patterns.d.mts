export interface ForbiddenPattern {
  name: string
  pattern: RegExp
}

export const forbiddenPatterns: readonly ForbiddenPattern[]
export function isForbiddenModuleSpecifier(specifier: string): boolean
export function collectModuleSpecifiers(source: string): string[]
