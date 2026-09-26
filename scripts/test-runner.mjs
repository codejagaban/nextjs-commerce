import { spawn } from 'node:child_process'
import { testEnvironment } from '../tests/environment.mjs'

const commands = {
  integration: ['exec', 'vitest', 'run', '--config', 'vitest.config.mts'],
  seed: ['exec', 'tsx', 'tests/seed.ts'],
  build: ['build'],
  e2e: ['exec', 'playwright', 'test'],
}
const command = commands[process.argv[2]]
if (!command) throw new Error('Expected integration, seed, build, or e2e.')
const env = testEnvironment()
let child
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child?.kill(signal))
async function run(args) {
  const code = await new Promise((resolve, reject) => {
    child = spawn('pnpm', args, { stdio: 'inherit', env })
    child.on('error', reject)
    child.on('exit', (code) => resolve(code ?? 1))
  })
  if (code !== 0) process.exit(code)
}
if (process.argv[2] === 'e2e') {
  await run(commands.seed)
  await run(commands.build)
}
await run([...command, ...process.argv.slice(3)])
