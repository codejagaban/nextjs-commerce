import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createServer as httpServer } from 'node:http'
import { createServer as portProbe } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import dotenv from 'dotenv'
import { simpleParser } from 'mailparser'
import { SMTPServer } from 'smtp-server'
import { testEnvironment } from '../tests/environment.mjs'

if (!process.argv.includes('--use-local-test-keys')) {
  throw new Error('Pass --use-local-test-keys to run real Stripe sandbox payments.')
}
const local = {}
for (const path of ['.env', '.env.local']) {
  if (existsSync(path)) Object.assign(local, dotenv.parse(readFileSync(path)))
}
Object.assign(local, process.env)
if (
  !local.STRIPE_SECRET_KEY?.startsWith('sk_test_') ||
  !local.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')
) {
  throw new Error('Matching Stripe test keys are required.')
}
const env = {
  ...testEnvironment(),
  // Exercise the checked-in migrations even with --dev; never auto-push a schema.
  PAYLOAD_MIGRATING: 'true',
  NODE_OPTIONS: '--no-deprecation --max-old-space-size=4096',
  STRIPE_SECRET_KEY: local.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: local.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  EMAIL_FROM_ADDRESS: 'store@commerce-test.example',
  EMAIL_FROM_NAME: 'Commerce test',
  SMOKE_BASE_URL: 'http://localhost:3002',
  SMOKE_ALLOW_LOCALHOST: '1',
  SMOKE_ADMIN_EMAIL: `smoke-admin-${randomUUID()}@commerce-test.example`,
  SMOKE_ADMIN_PASSWORD: `Smoke-${randomUUID()}-Aa1!`,
  SMOKE_CUSTOMER_EMAIL: 'customer@commerce-test.example',
  SMOKE_STRIPE_SECRET_KEY: local.STRIPE_SECRET_KEY,
  SMOKE_INBOX_TOKEN: randomUUID(),
}
if (process.argv.includes('--with-r2')) {
  for (const key of [
    'R2_BUCKET',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PUBLIC_URL',
  ]) {
    if (!local[key]) throw new Error(`${key} is required with --with-r2.`)
    env[key] = local[key]
  }
  env.SMOKE_MEDIA_ORIGIN = new URL(local.R2_PUBLIC_URL).origin
}

// Refuse to replace or reuse a developer's server.
await new Promise((resolve, reject) => {
  const probe = portProbe()
  probe.once('error', reject)
  probe.listen(3002, () => probe.close(resolve))
})

const messages = []
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ['AUTH', 'STARTTLS'],
  logger: false,
  onData(stream, session, callback) {
    simpleParser(stream).then((mail) => {
      for (const recipient of session.envelope.rcptTo) {
        messages.push({
          to: recipient.address,
          subject: mail.subject || '',
          html: mail.html || '',
          text: mail.text || '',
        })
      }
      callback()
    }, callback)
  },
})
const inbox = httpServer((req, res) => {
  if (req.headers.authorization !== `Bearer ${env.SMOKE_INBOX_TOKEN}`) {
    res.writeHead(401).end()
    return
  }
  const url = new URL(req.url, 'http://127.0.0.1')
  if (req.method !== 'GET' || url.pathname !== '/messages' || !url.searchParams.get('to')) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(messages.filter((message) => message.to === url.searchParams.get('to'))))
})
const children = []
let serverLog = ''
let stopping = false
function launch(command, args, pipe = false, extraEnv = {}) {
  const child = spawn(command, args, {
    env: { ...env, ...extraEnv },
    detached: process.platform !== 'win32',
    stdio: pipe ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  children.push(child)
  return child
}
async function run(args) {
  const child = launch('pnpm', args)
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', resolve)
  })
  if (code !== 0) throw new Error(`${args.slice(0, 3).join(' ')} failed (${code}).`)
}
function stop() {
  if (stopping) return
  stopping = true
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.signalCode) continue
    try {
      if (process.platform === 'win32') child.kill('SIGTERM')
      else process.kill(-child.pid, 'SIGTERM')
    } catch {
      /* Already exited. */
    }
  }
  smtp.close()
  inbox.closeAllConnections()
  inbox.close()
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    stop()
    process.exit(1)
  })

try {
  await new Promise((resolve, reject) => {
    smtp.once('error', reject)
    smtp.listen(0, '127.0.0.1', resolve)
  })
  env.SMTP_PORT = String(smtp.server.address().port)
  await new Promise((resolve) => inbox.listen(0, '127.0.0.1', resolve))
  env.SMOKE_INBOX_URL = `http://127.0.0.1:${inbox.address().port}`

  const listener = launch(
    'stripe',
    [
      'listen',
      '--skip-update',
      '--events',
      'payment_intent.succeeded',
      '--forward-to',
      'http://localhost:3002/api/payments/stripe/webhooks',
    ],
    true,
    { STRIPE_API_KEY: env.STRIPE_SECRET_KEY },
  )
  env.STRIPE_WEBHOOKS_SIGNING_SECRET = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Stripe listener startup timed out.')),
      30_000,
    )
    const finish = (error, secret) => {
      clearTimeout(timeout)
      if (error) reject(error)
      else resolve(secret)
    }
    let output = ''
    const inspect = (chunk) => {
      output += chunk.toString()
      const secret = output.match(/whsec_[A-Za-z0-9]+/)
      if (secret) finish(null, secret[0])
    }
    listener.stdout.on('data', inspect)
    listener.stderr.on('data', inspect)
    listener.once('error', () => finish(new Error('Could not start the Stripe CLI.')))
    listener.once('exit', () => finish(new Error('Stripe listener stopped.')))
  })
  console.log('Applying migrations to the disposable test database.')
  await run(['migrate'])
  await run(['exec', 'tsx', 'tests/smoke/bootstrap.ts'])
  const development = process.argv.includes('--dev')
  if (!development) await run(['exec', 'next', 'build'])
  console.log(
    `Starting ${development ? 'development' : 'production'} test store on :3002 with captured SMTP${env.R2_BUCKET ? ' and R2' : ''}.`,
  )
  const server = launch('pnpm', [development ? 'dev' : 'start', '--port', '3002'], true)
  const drain = (chunk) => {
    serverLog = (serverLog + chunk.toString()).slice(-12_000)
  }
  server.stdout.on('data', drain)
  server.stderr.on('data', drain)
  let ready = false
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) throw new Error('Test store exited before startup.')
    try {
      if (
        (await fetch(`${env.SMOKE_BASE_URL}/api/users/me`, { signal: AbortSignal.timeout(3000) }))
          .ok
      ) {
        ready = true
        break
      }
    } catch {
      /* Compiling. */
    }
    await delay(1000)
  }
  if (!ready) throw new Error('Test store did not start.')
  await run(['test:smoke'])
} catch (error) {
  let output = `${error.message}\n${serverLog}`
  for (const [name, value] of Object.entries(env)) {
    if (/SECRET|PASSWORD|TOKEN|PASS|KEY/.test(name) && value)
      output = output.replaceAll(value, '[redacted]')
  }
  output = output.replace(
    /([?&](?:token|accessToken|payment_intent_client_secret)=)[^&\s]+/gi,
    '$1[redacted]',
  )
  console.error(output)
  process.exitCode = 1
} finally {
  // Removes only this run's bootstrap admin; the smoke fixture owns all other cleanup.
  if (children.length) {
    try {
      await run(['exec', 'tsx', 'tests/smoke/bootstrap.ts', '--cleanup'])
    } catch {
      console.error('Could not remove the local smoke admin from the disposable database.')
      process.exitCode = 1
    }
  }
  stop()
}
