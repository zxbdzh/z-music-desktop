# Lint quality gate

`pnpm lint` runs `scripts/lint/gate.mjs` and writes the machine-readable report to
`.artifacts/lint/report.json`. The command fails on any first-party ESLint error or
warning, generated-artifact hash drift, generated-code ignore drift, unsafe paths,
or credential/private-development content in generated text files.

## Repository Ready baseline

The M0-03 baseline was measured with ESLint 8.57.1 before changing the boundary:

| Scope | Errors | Warnings |
| --- | ---: | ---: |
| Entire `src` tree | 0 | 233 |
| Generated/vendored JavaScript | 0 | 64 |
| First-party source | 0 | 169 |
| First-party after build-global declarations | 0 | 91 |
| First-party after remediation | 0 | 0 |

The 169 first-party warnings comprised 78 undeclared build/type globals, 36
`require-atomic-updates`, and 55 other rule findings. Build/type globals are now
readonly ESLint globals. Shared asynchronous initialization uses cached promises or
local snapshots; fire-and-forget calls are explicit; dead imports/variables and
duplicate imports were removed. Two `require-atomic-updates` findings remain locally
suppressed at the assignment line because synchronous guards prevent a second Share
Card batch or WebDAV transfer from entering the corresponding `try/finally` block.

## Generated boundary

`scripts/lint/generated-code.v1.json` is the only source of generated/vendored artifact
paths, per-file provenance, SHA-256 digests, hash modes, and lint exclusion flags. Six JavaScript
files are excluded exactly; their hashes use LF-normalized text so Windows and Linux checkouts
produce the same digest. The WASM binary is cataloged and hashed as exact bytes but is not an
ESLint input. Nearby maintained files such as `src/renderer/utils/audioMatch/index.ts`
remain in the first-party lint budget. The gate also rejects first-party credential
literals and any `src` ignore outside the fixed allowlist.

Run the gate and its configuration tests with:

```shell
pnpm lint:test
pnpm lint
```
