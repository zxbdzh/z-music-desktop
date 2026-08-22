# Checked-in evidence

Place lightweight, redacted executable product evidence manifests and artifacts
in this directory. Design mockups are not acceptance evidence and must not be
stored here.

Large raw screenshots and logs remain in CI artifacts; their manifest rows use
`storage: "ci-artifact"`, a stable lowercase `artifactName`, and a path relative
to the root of that artifact.
