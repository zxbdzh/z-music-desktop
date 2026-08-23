import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parse } from 'yaml'

const workflow = (name) => {
  const source = readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8')
  return { source, value: parse(source) }
}

const quality = workflow('quality-gate.yml')
const verifier = workflow('aurio-contract-verifier.yml')
const regression = workflow('aurio-contract-regression.yml')
const release = workflow('release.yml')
const acceptance = readFileSync(
  new URL('../../docs/qa/repository-ready-acceptance.md', import.meta.url),
  'utf8'
)

export const requiredChecks = Object.freeze([
  'Desktop lint, test and build',
  'Android test and debug APK',
  'Contract verifier unit',
])

test('keeps stable no-secret required check names', () => {
  assert.equal(quality.value.jobs.desktop.name, requiredChecks[0])
  assert.equal(quality.value.jobs.android.name, requiredChecks[1])
  assert.equal(verifier.value.jobs['verifier-unit'].name, requiredChecks[2])
  assert.deepEqual(quality.value.permissions, { contents: 'read' })
  assert.deepEqual(verifier.value.permissions, { contents: 'read' })
})

test('keeps ordinary pull requests free of custom secrets', () => {
  assert.ok(quality.value.on.pull_request !== undefined)
  assert.ok(verifier.value.on.pull_request !== undefined)
  assert.ok(verifier.value.on.push !== undefined)
  assert.equal(verifier.value.on.push.paths, undefined)
  assert.doesNotMatch(quality.source, /secrets\./)
  assert.doesNotMatch(verifier.source, /secrets\./)
  assert.doesNotMatch(quality.source, /pull_request_target/)
  assert.doesNotMatch(verifier.source, /pull_request_target/)
})

test('isolates external regression behind a protected manual Environment', () => {
  assert.ok(regression.value.on.workflow_dispatch !== undefined)
  assert.equal(regression.value.on.schedule, undefined)
  assert.equal(regression.value.on.push, undefined)
  assert.equal(regression.value.on.pull_request, undefined)
  const job = regression.value.jobs['contract-regression']
  assert.equal(job.environment, 'aurio-contract-regression')
  assert.equal(job.if, "github.ref == 'refs/heads/main'")
  assert.match(regression.source, /vars\.APIFOX_REGRESSION_ENABLED/)
  assert.match(regression.source, /configured=false/)
  assert.match(regression.source, /APIFOX_REGRESSION_ENABLED is true but/)
  assert.doesNotMatch(regression.source, /APIFOX_ACCESS_TOKEN repository secret/i)
})

test('keeps the Repository Ready acceptance matrix aligned with workflows', () => {
  for (const check of requiredChecks) assert.ok(acceptance.includes(check))
  for (const artifact of [
    'lint-quality-report',
    'repository-ready-evidence',
    'z-music-desktop-android-debug',
  ]) {
    assert.ok(acceptance.includes(artifact))
    assert.ok(quality.source.includes(artifact))
  }
  for (const invariant of [
    'strict contexts',
    'conversation resolution',
    'administrator',
    'force-push/deletion disabled',
    'APIFOX_REGRESSION_ENABLED=false',
    'verify-bundle',
  ]) assert.ok(acceptance.includes(invariant))
})

test('keeps release candidates read-only, main-only, and non-publishing', () => {
  assert.deepEqual(release.value.permissions, { contents: 'read' })
  const input = release.value.on.workflow_dispatch.inputs.configuration_only
  assert.equal(input.default, true)
  assert.equal(input.type, 'boolean')

  const configuration = release.value.jobs['notification-configuration']
  const candidate = release.value.jobs['windows-candidate']
  assert.equal(candidate.needs, 'notification-configuration')
  assert.equal(candidate.if, "github.ref == 'refs/heads/main' && inputs.configuration_only == false")
  const checkout = candidate.steps.find((step) => step.uses === 'actions/checkout@v4')
  assert.equal(checkout.with['persist-credentials'], false)
  assert.match(release.source, /pnpm install --frozen-lockfile --ignore-scripts/)
  assert.doesNotMatch(release.source, /pnpm publish:|GITHUB_TOKEN|contents: write/)

  const notificationCheck = configuration.steps.find((step) => step.id === 'notification')
  const notification = candidate.steps.find((step) => step.name === 'Send optional PushPlus notification')
  assert.match(notificationCheck.run, /configured=false/)
  assert.match(notificationCheck.run, /notification skipped/)
  assert.equal(notification.if, "always() && needs.notification-configuration.outputs.configured == 'true'")
})
