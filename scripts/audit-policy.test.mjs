import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateAudit, exception } from './audit-policy.mjs'

const finding = {
  github_advisory_id: exception.advisory,
  module_name: 'deepmerge',
  severity: 'low',
  patched_versions: null,
  findings: [{ version: '4.3.1' }],
}
const report = (item = finding) => ({
  advisories: { one: item },
  metadata: { vulnerabilities: { low: 1 } },
})
const now = new Date('2026-11-04T00:00:00Z')
test('accepts only the owner-approved unpatched version before expiry', () => {
  assert.equal(evaluateAudit(report(), now).accepted.length, 1)
  for (const change of [
    { severity: 'moderate' },
    { patched_versions: '>=4.3.2' },
    { github_advisory_id: 'GHSA-other' },
    { module_name: 'other' },
    { findings: [{ version: '4.3.0' }] },
    { findings: [] },
  ])
    assert.equal(evaluateAudit(report({ ...finding, ...change }), now).blocked.length, 1)
  assert.equal(evaluateAudit(report(), new Date(exception.expires)).blocked.length, 1)
})
test('fails closed on missing reports and inconsistent totals', () => {
  assert.throws(() => evaluateAudit({}))
  assert.throws(() => evaluateAudit({ ...report(), advisories: {} }))
})
