import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const storageRequire = createRequire(require.resolve('@payloadcms/storage-s3'))
const cloudStorageRoot = path.resolve(
  path.dirname(storageRequire.resolve('@payloadcms/plugin-cloud-storage')),
  '..',
)

function javascriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory()
      ? javascriptFiles(filename)
      : entry.name.endsWith('.js')
        ? [filename]
        : []
  })
}

describe('version-scoped security overrides', () => {
  it('only removes a dependency unused by the inspected cloud-storage release', () => {
    const manifest = JSON.parse(readFileSync(path.join(cloudStorageRoot, 'package.json'), 'utf8'))
    // A Payload upgrade must explicitly re-evaluate the override, not inherit it silently.
    expect(manifest.version).toBe('3.91.0')
    const files = javascriptFiles(path.join(cloudStorageRoot, 'dist'))
    expect(files.length).toBeGreaterThan(0)
    for (const filename of files) {
      expect(readFileSync(filename, 'utf8'), filename).not.toContain('find-node-modules')
    }
  })
})
