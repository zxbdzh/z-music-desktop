# Repository governance

Repository Ready uses three stable, no-custom-secret required checks:

- `Desktop lint, test and build`
- `Android test and debug APK`
- `Contract verifier unit`

The repository Actions policy is enabled with default read-only workflow permissions.
Allowed third-party actions are limited to `pnpm/action-setup@*` and
`android-actions/setup-android@*`; GitHub-owned actions remain allowed.

`main` protection is applied only after all three names have succeeded on the merged
candidate. It requires the checks strictly against current `main`, requires changes to
arrive through a pull request, dismisses stale reviews, requires conversation
resolution, and blocks force pushes and deletion. The required approval count is
zero because this repository currently has one maintainer; administrator enforcement
is enabled.

The `aurio-contract-regression` Environment accepts deployments only from `main`.
Its `APIFOX_REGRESSION_ENABLED` variable defaults to `false`; no Environment Secret
is required in that state, and a manual run emits a skip notice. Before setting the
variable to `true`, the owner must add `APIFOX_ACCESS_TOKEN` only as an Environment
Secret. Repository/organization copies are not permitted.

`PUSHPLUS_TOKEN` is optional. Release notification configuration runs under
`if: always()` and emits only `configured=true|false`; the HTTP notification step
runs only when configured.

Run the tracked governance contract with:

```shell
pnpm qa:governance
```

Dynamic API snapshots for Actions permissions, Environment policy, variables,
secrets metadata, workflow state, and branch protection are attached to the M0-05
candidate evidence rather than committed as stale repository state.
