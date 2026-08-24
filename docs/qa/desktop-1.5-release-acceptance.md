# Desktop 1.5 Release Acceptance

Desktop 1.5 uses one immutable candidate commit for source checks, packages,
installation evidence, hashes, release notes, and the draft release.

## Blocking matrix

| Path | Windows 10 x64 | Windows 11 x64 |
| --- | --- | --- |
| Setup current-user install | `windows-10-acceptance.json` | `windows-acceptance.json` |
| First launch | same evidence | same evidence |
| 1.4.5 historical data remains readable | same evidence | same evidence |
| `lxmusic://` and OAuth callback | same evidence | same evidence |
| Uninstall preserves user data | same evidence | same evidence |
| Portable data isolation | same evidence | same evidence |
| Artifact SHA-256 | `SHA256SUMS.txt` | `SHA256SUMS.txt` |

The Windows 11 job uses GitHub's `windows-2025` hosted image. Windows 10 must
run on a repository self-hosted x64 runner carrying the exact `windows-10`
label; the workflow checks the OS caption before accepting evidence. A Server
image or compatibility mode does not count as Windows 10 evidence.

## Candidate commands

```text
pnpm release:test
pnpm release:audit
pnpm lint
pnpm test:run
pnpm build
pnpm pack:win:setup:x64
pnpm pack:win:portable:x64
```

The workflow runs `git diff --exit-code` after source and package builds to
prove packaging did not modify tracked source or the lockfile.

## Evidence contract

`release-manifest.json` contains the exact 40-character candidate commit,
version, artifact names, byte sizes, and lowercase SHA-256 values. The Windows
acceptance JSON contains the same commit and version, actual OS caption/build,
current-user privilege policy, a hash of a synthetic legacy-data canary, and a
PASS/FAIL result for each path.

No evidence may contain credentials, real user paths, or real user data. The
compatibility test creates only a synthetic canary and verifies its digest
before and after install, deep-link launch, uninstall, and portable launch.

## Final gate

The release draft can be created only after:

- M2-01, M2-02, and M2-03 are closed with merged PR evidence;
- Windows 10 and Windows 11 evidence both report PASS for the same commit;
- all blocking Quality Gate and Desktop 1.5 Candidate jobs pass;
- no open desktop `priority:P0` or `priority:P1` issue remains unaccepted;
- package inspection confirms `LICENSE` and `NOTICE`;
- the draft includes `docs/releases/v1.5.0.md`, rollback instructions, hashes,
  and all final Windows artifacts.
