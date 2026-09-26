import { readFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import dotenv from 'dotenv'
import { testEnvironment } from '../tests/environment.mjs'

// Deliberately opt in: normal tests never read real integration credentials.
if (!process.argv.includes('--use-local-test-keys')) {
  throw new Error('Pass --use-local-test-keys to verify against Stripe test mode.')
}
const local = { ...process.env }
for (const path of ['.env', '.env.local']) {
  if (existsSync(path)) Object.assign(local, dotenv.parse(readFileSync(path)))
}
if (!local.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Stripe test key required.')
const env = {
  ...testEnvironment(),
  STRIPE_SECRET_KEY: local.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: local.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
}
// Never reuse a developer's running store, even if it answers on this port.
await new Promise((resolve, reject) => {
  const probe = createServer()
  probe.once('error', reject)
  probe.listen(3002, () => probe.close(resolve))
})
const children = []
function launch(command, args, options) {
  const child = spawn(command, args, { ...options, detached: process.platform !== 'win32' })
  children.push(child)
  return child
}
function cleanup() {
  for (const child of children.reverse()) {
    try {
      if (process.platform === 'win32') child.kill('SIGTERM')
      else process.kill(-child.pid, 'SIGTERM')
    } catch {
      /* Already exited. */
    }
  }
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    cleanup()
    process.exit(1)
  })
let exitCode = 1
try {
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
    {
      env: { ...env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  env.STRIPE_WEBHOOKS_SIGNING_SECRET = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Stripe listener did not become ready.')),
      30000,
    )
    let output = ''
    const inspect = (chunk) => {
      output += chunk.toString()
      const secret = output.match(/whsec_[A-Za-z0-9]+/)
      if (secret) {
        clearTimeout(timeout)
        resolve(secret[0])
      }
    }
    listener.stdout.on('data', inspect)
    listener.stderr.on('data', inspect)
    listener.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    listener.once('exit', () => {
      clearTimeout(timeout)
      reject(new Error('Stripe listener stopped.'))
    })
  })
  console.log('Stripe test listener ready. Starting isolated store on port 3002.')
  const server = launch('pnpm', ['dev', '--port', '3002'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  // Drain output, but never print secrets from an integration boot log.
  server.stdout.on('data', () => {})
  server.stderr.on('data', () => {})
  server.once('error', (error) => {
    throw error
  })
  let ready = false
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) throw new Error('Isolated Next server stopped before startup.')
    try {
      const response = await fetch('http://localhost:3002/api/users/me', {
        signal: AbortSignal.timeout(3000),
      })
      if (response.ok) {
        ready = true
        break
      }
    } catch {
      /* Server is compiling. */
    }
    await delay(1000)
  }
  if (!ready) throw new Error('Isolated store did not become ready.')
  const child = launch('pnpm', ['exec', 'tsx', 'tests/payments/verify-stripe.ts'], {
    env,
    stdio: 'inherit',
  })
  exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 1))
  })
  if (exitCode === 0 && process.argv.includes('--keep-open')) {
    console.log(
      'Isolated store remains on http://localhost:3002 for browser verification. Ctrl+C stops it.',
    )
    await new Promise(() => {})
  }
} finally {
  cleanup()
}
process.exit(exitCode)
