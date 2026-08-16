export interface ForbiddenPattern {
  name: string
  pattern: RegExp
}

export const forbiddenPatterns: readonly ForbiddenPattern[]
export const forbiddenModuleSpecifier: RegExp
export function collectModuleSpecifiers(source: string): string[]
