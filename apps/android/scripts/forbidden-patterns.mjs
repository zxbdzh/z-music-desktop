import { builtinModules } from 'node:module'

const nodeBuiltinModules = new Set(builtinModules.map(moduleName => moduleName.replace(/^node:/, '')))

export const forbiddenPatterns = Object.freeze([
  {
    name: 'Electron package or runtime',
    pattern: /(?:['"]electron(?:\/[a-z][\w/-]*)?['"]|\belectron-[a-z][\w-]*\b|@electron\/[a-z][\w-]*|\bprocess\.versions\.electron\b|\bElectron\/\d)/i
  },
  {
    name: 'Node import or runtime',
    pattern: /(?:\bnode:[a-z][\w/-]*\b|\bprocess\.versions\.node\b|\bNode\.js\b)/i
  },
  {
    name: 'development-server URL',
    pattern: /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|\[(?:f[cd][0-9a-f]{2}|fe[89ab][0-9a-f])(?::[0-9a-f]{0,4})+\]|10\.0\.2\.2|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|[a-z0-9-]+\.local|(?:[a-z0-9-]+\.)+test|host\.docker\.internal)(?::\d+)?(?:[/?#]|['"`]|$)/i
  },
  {
    name: 'author-owned API default',
    pattern: /https?:\/\/(?:[^/'"`]+\.)?(?:ikunshare\.github\.io|lxmusic\.toside\.cn|music\.zxbdwy\.online)(?:\/|['"`]|$)/i
  },
  {
    name: 'literal credential',
    pattern: /(?:api[_-]?key|access[_-]?token|client[_-]?secret|token|secret|password|passwd|cookie|session)['"`]?\s*[:=]\s*(['"`])[^'"`\r\n]{4,}\1/i
  },
  {
    name: 'literal bearer or private key',
    pattern: /(?:authorization['"`]?\s*[:=]\s*(['"`])(?:basic|bearer)\s+[^'"`\r\n]+\1|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i
  }
])

export function isForbiddenModuleSpecifier(specifier) {
  if (/^(?:electron(?:$|[-/])|@electron\/)/i.test(specifier)) return true
  const normalized = specifier.replace(/^node:/, '')
  for (const builtin of nodeBuiltinModules) {
    if (normalized === builtin || normalized.startsWith(`${builtin}/`)) return true
  }
  return false
}

export function collectModuleSpecifiers(source) {
  const trivia = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*`
  const patterns = [
    new RegExp(String.raw`\bfrom${trivia}(['"])([^'"]+)\1`, 'g'),
    new RegExp(String.raw`\bimport${trivia}\(${trivia}(['"])([^'"]+)\1${trivia}\)`, 'g'),
    new RegExp(String.raw`\bimport${trivia}(['"])([^'"]+)\1`, 'g'),
    new RegExp(String.raw`\brequire${trivia}\(${trivia}(['"])([^'"]+)\1${trivia}\)`, 'g')
  ]

  return patterns.flatMap(pattern => Array.from(source.matchAll(pattern), match => match[2]))
}
