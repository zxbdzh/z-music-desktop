# z-music-desktop acceptance evidence

This directory contains durable, reviewable acceptance evidence. Executable product
evidence is kept separate from generated design mockups.

## Contract

`schema/evidence-manifest.v1.schema.json` is the JSON Schema contract. Every matrix
row names the fixture state, target, display settings, exact operation path, result,
and artifacts. Electron rows use `agent-browser`; Android rows identify the device
or emulator, use API 24, 35, or 36, and record `adb`, `android-emulator`, or
`android-device` actions.

Small redacted logs may be checked in below `docs/qa/evidence/`. Large files and
build reports belong in stable CI artifacts. A CI artifact row keeps an
artifact-relative POSIX path, stable `artifactName`, and SHA-256. Validation requires
an explicit `--artifact-root NAME=PATH`, then checks file existence, hash, path
containment, and log redaction.

`fixtures/catalog.v1.json` pins one LF-normalized JSON fixture for every canonical
state: loading, empty, partial, error, permission-denied, and success.

## Template And Commit Binding

A tracked manifest cannot contain the hash of the commit that contains itself.
`evidence/repository-ready.template.json` therefore uses the fixed placeholders
`__CURRENT_COMMIT__`, `__GENERATED_AT__`, and `__SHA256__`. The quality job checks out
the PR head (or push SHA), renders a formal manifest for that exact commit, computes
artifact hashes, validates the result, writes its SHA-256, and uploads the stable
`repository-ready-evidence` artifact. A wrong commit cannot be supplied to `render`.

The checked-in `repository-ready-smoke.txt` is a small, LF-normalized, redacted
summary from a real `agent-browser` Electron workflow. It contains no screenshot,
profile, cookie, local path, service URL, or user content.

## Commands

```shell
pnpm qa:fixtures
pnpm qa:evidence:test
pnpm qa:evidence
```

Render and validate a candidate locally after `pnpm lint` creates the mapped CI
artifact input:

```shell
node scripts/qa/evidence.mjs render \
  docs/qa/evidence/repository-ready.template.json \
  .artifacts/evidence/repository-ready.manifest.json \
  --commit "$(git rev-parse HEAD)" \
  --generated-at "2026-08-23T00:00:00Z" \
  --artifact-root lint-quality-report=.artifacts/lint

node scripts/qa/evidence.mjs validate \
  .artifacts/evidence/repository-ready.manifest.json \
  --artifact-root lint-quality-report=.artifacts/lint
```

`repository-ready-evidence` is self-contained: it includes the manifest and sidecar,
schema, fixture catalog/state files, checked-in smoke log, and mapped lint report.
After downloading it, verify every link against the expected candidate SHA:

```shell
node scripts/qa/evidence.mjs verify-bundle <downloaded-directory> --commit <candidate-sha>
```

The validator rejects schema drift, stale commits, unknown states, unsafe paths,
missing artifacts, hash drift, private or credential-bearing URLs, file URIs, and
common cookie, token, session, secret, and credential forms. Text logs use
LF-normalized SHA-256 across Windows and Linux; binary artifacts use exact bytes.
