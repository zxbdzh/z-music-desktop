# Repository Ready acceptance

This document is the M0-05 release-blocker matrix. It contains only reproducible
commands, stable check names, artifact contracts, and conclusions. The exact
candidate SHA, run URLs, artifact IDs, and API snapshots are recorded in the
closed GitHub issue after the acceptance PR is merged, because a tracked file
cannot contain the hash of the commit that contains itself.

## Candidate invariant

All rows must use one exact `github.sha`:

- PR jobs checkout `github.event.pull_request.head.sha`.
- Push jobs checkout `github.sha`.
- Evidence rendering rejects a `--commit` value different from local `HEAD`.
- The self-contained `repository-ready-evidence` bundle is independently checked
  with `verify-bundle <dir> --commit <candidate-sha>`.

## Required check matrix

| Stable check | Required commands / evidence | Secret | Result rule |
| --- | --- | --- | --- |
| Desktop lint, test and build | `pnpm brand:check`; `pnpm lint:test`; `pnpm lint`; `pnpm qa:evidence`; `pnpm test:run`; `pnpm build`; `lint-quality-report`; `repository-ready-evidence` | None | Every command exits 0; first-party lint is 0 errors/0 warnings; credential findings are 0 |
| Android test and debug APK | frozen root/Android install; `pnpm android:test`; typecheck; Web build; Capacitor sync; `./gradlew :app:testDebugUnitTest`; `./gradlew :app:assembleDebug`; APK boundary scan | None | Tests, build, scan and artifact upload pass; APK SHA-256 matches the uploaded report |
| Contract verifier unit | `node --test scripts/apifox/aurio-contract-verifier.test.mjs` | None | All verifier and governance-independent contract tests pass |

## Artifact contracts

- `lint-quality-report`: structured JSON with `758` first-party files, `0` errors,
  `0` warnings, `0` credential findings, and no generated-artifact errors.
- `z-music-desktop-android-debug`: debug APK, Gradle HTML report, scan report and
  SHA-256; the scan must inspect the complete APK and reject Electron/Node,
  Browser preview, development URL and credential content.
- `repository-ready-evidence`: manifest, manifest SHA-256 sidecar, schema,
  fixture catalog and all six states, checked-in `agent-browser` smoke log, and
  the exact lint report copy. `verify-bundle` must pass with the candidate SHA.

## Governance matrix

- Actions is enabled with default workflow permissions `read`.
- Selected actions allow GitHub-owned actions plus the two required external
  action families: `pnpm/action-setup@*` and `android-actions/setup-android@*`.
- `main` is protected with strict contexts exactly named above, PR-required
  changes, stale-review dismissal, conversation resolution, administrator
  enforcement, and force-push/deletion disabled.
- `aurio-contract-regression` is restricted to `main`, defaults
  `APIFOX_REGRESSION_ENABLED=false`, and has no repository or Environment Secret
  until an owner explicitly enables the protected external regression.
- The candidate/release workflow remains disabled until a later release
  milestone moves publish credentials to a protected release Environment.
- Missing `PUSHPLUS_TOKEN` produces a notice and a successful skip.

## Conclusion

M0-05 is PASS only after one merged acceptance PR, one exact main candidate SHA,
all three required checks passing on that SHA, both deterministic artifact
contracts verified, and the governance API snapshot matching the matrix above.
