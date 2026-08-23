# Checked-in evidence

This directory contains only lightweight, redacted evidence inputs:

- `repository-ready-smoke.txt`: real product smoke summary captured with
  `agent-browser`, normalized to LF and stripped of local/user/service data.
- `repository-ready.template.json`: immutable template rendered for each candidate
  commit by the quality job.

Formal manifests and large logs/screenshots stay in stable CI artifacts. Their rows
use `storage: "ci-artifact"`, a lowercase `artifactName`, an artifact-relative POSIX
path, and a SHA-256 computed during rendering. The validator requires an explicit
artifact root and does not accept unresolved CI references.

Design mockups are not acceptance evidence and must not be stored here.
