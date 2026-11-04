export const exception = {
  advisory: 'GHSA-gcqx-w48m-w2h4',
  dependency: 'deepmerge',
  version: '4.3.1',
  expires: '2026-12-04T00:00:00.000Z',
}

export function evaluateAudit(report, now = new Date()) {
  if (!report?.advisories || !report?.metadata?.vulnerabilities || report.error) {
    throw new Error('Missing or invalid production audit report.')
  }
  const accepted = []
  const blocked = []
  for (const advisory of Object.values(report.advisories)) {
    const allowed =
      advisory.github_advisory_id === exception.advisory &&
      advisory.module_name === exception.dependency &&
      advisory.severity === 'low' &&
      !advisory.patched_versions &&
      new Date(now).getTime() < Date.parse(exception.expires) &&
      advisory.findings?.length > 0 &&
      advisory.findings.every((finding) => finding.version === exception.version)
    ;(allowed ? accepted : blocked).push(advisory)
  }
  const count = Object.values(report.metadata.vulnerabilities).reduce((sum, n) => sum + n, 0)
  if (count !== accepted.length + blocked.length) {
    throw new Error('Audit totals do not match the reported advisories.')
  }
  return { accepted, blocked }
}
