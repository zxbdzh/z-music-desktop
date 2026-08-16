export const forbiddenPatterns = Object.freeze([
  {
    name: 'Electron runtime',
    pattern: /(?:\belectron-updater\b|\bprocess\.versions\.electron\b|\bElectron\/\d|\brequire\s*\(\s*['"]electron['"]\s*\))/i
  },
  {
    name: 'Node import or runtime',
    pattern: /(?:\bnode:[a-z][\w/-]*\b|\bprocess\.versions\.node\b|\bNode\.js\b)/i
  },
  {
    name: 'development-server URL',
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:[/?#]|['"`]|$)/i
  },
  {
    name: 'author-owned API default',
    pattern: /https?:\/\/(?:[^/'"`]+\.)?(?:ikunshare\.github\.io|lxmusic\.toside\.cn|music\.zxbdwy\.online)(?:\/|['"`]|$)/i
  },
  {
    name: 'literal credential',
    pattern: /(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|passwd)['"]?\s*[:=]\s*['"][^'"]{4,}['"]/i
  },
  {
    name: 'literal bearer or private key',
    pattern: /(?:authorization['"]?\s*[:=]\s*['"]bearer\s+[^'"]+|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/i
  }
])

export const forbiddenModuleSpecifier = /^(?:electron(?:-updater)?|node:[a-z][\w/-]*|assert|buffer|child_process|cluster|crypto|dgram|dns|events|fs|http|https|module|net|os|path|perf_hooks|process|querystring|readline|stream|string_decoder|timers|tls|tty|url|util|v8|vm|worker_threads|zlib)(?:\/|$)/i

export function collectModuleSpecifiers(source) {
  const patterns = [
    /\bfrom\s*(['"])([^'"]+)\1/g,
    /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
    /\bimport\s*(['"])([^'"]+)\1/g,
    /\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g
  ]

  return patterns.flatMap(pattern => Array.from(source.matchAll(pattern), match => match[2]))
}
