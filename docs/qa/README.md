# z-music-desktop (Z) acceptance evidence

This directory contains durable, reviewable acceptance evidence. It deliberately
keeps executable product evidence separate from generated design mockups.

## Design

`schema/evidence-manifest.v1.schema.json` is the versioned interchange contract.
Every matrix cell is one self-contained row: it names the fixture state, target,
display settings, exact operation path, result, and artifacts. Electron rows must
record Orca Computer Use actions; Android rows must identify the device or emulator
and use one of the frozen acceptance API levels: 24, 35, or 36. Electron targets
remain explicit matrix rows and identify Windows, Linux, or macOS.

Small, redacted evidence may be checked in below `docs/qa/evidence/`. Large files
belong in a CI artifact with a stable `artifactName`; the checked-in manifest keeps
the artifact-relative path. Generated design mockups must live outside
`docs/qa/evidence/` and use a different manifest kind.

`fixtures/catalog.v1.json` is the canonical catalog for deterministic QA states.
The catalog pins one JSON file for each required state and includes a SHA-256 digest
of its LF-normalized bytes, so accidental fixture drift is visible in review on both
Windows and Linux.

## Validate

Validate a checked-in manifest against the current checkout:

```powershell
node scripts/qa/evidence.mjs validate docs/qa/evidence/example.json
```

The validation command resolves the current Git `HEAD` and always rejects a
manifest recorded for another commit. An optional `--commit HASH` assertion is
accepted only when `HASH` is the current `HEAD`.

Validate the fixture catalog and run unit tests:

```powershell
node scripts/qa/evidence.mjs fixtures docs/qa/fixtures/catalog.v1.json
node --test scripts/qa/evidence.test.mjs
```

The validator rejects missing or hash-mismatched checked-in files, unknown fixture
states, a manifest commit that differs from the current checkout, unsafe artifact
paths, private or credential-bearing URLs, file URIs, and common cookie, token,
session, secret, and credential forms. Checked-in text logs receive the same
content scan and use LF-normalized SHA-256; screenshot hashes always cover exact
binary bytes.
