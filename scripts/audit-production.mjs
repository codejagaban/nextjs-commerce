import { spawnSync } from 'node:child_process'
import { evaluateAudit, exception } from './audit-policy.mjs'

const audit = spawnSync('pnpm', ['audit', '--prod', '--json'], { encoding: 'utf8' })
try {
  if (audit.error || ![0, 1].includes(audit.status)) {
    throw audit.error ?? new Error(audit.stderr || 'Production audit could not run.')
  }
  const { accepted, blocked } = evaluateAudit(JSON.parse(audit.stdout))
  for (const item of accepted) {
    console.warn(
      `TEMPORARY EXCEPTION: ${item.github_advisory_id}, deepmerge@4.3.1, expires ${exception.expires}. See DEPENDENCY_SECURITY.md.`,
    )
  }
  for (const item of blocked) console.error(`${item.severity}: ${item.title} (${item.url})`)
  console.log(
    `Production audit: ${blocked.length} blocking, ${accepted.length} explicitly accepted.`,
  )
  process.exitCode = blocked.length ? 1 : 0
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
