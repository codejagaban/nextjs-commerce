import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import config from '@payload-config'

/**
 * Re-upload every media file through the currently configured storage adapter.
 *
 * Run this after switching storage — from local disk to a bucket, or between
 * buckets. Each file is pushed back through Payload's upload pipeline, so the
 * adapter writes it to the new destination and sharp regenerates every size in
 * `imageSizes` along the way. Documents keep their ids, so nothing that
 * references an image breaks.
 *
 * Source files are read from `public/media`, which is where Payload wrote them
 * before a bucket existed. Nothing is deleted: if the migration goes wrong the
 * originals are still on disk.
 *
 *   pnpm migrate:media
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const localDir = path.resolve(dirname, '../public/media')

/** Only the types the Media collection accepts, so no dependency is needed. */
const mimeTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const payload = await getPayload({ config })

if (!process.env.R2_BUCKET) {
  payload.logger.warn(
    'R2_BUCKET is not set — files would be rewritten to local disk. Set the bucket first.',
  )
  process.exit(1)
}

const { docs } = await payload.find({ collection: 'media', limit: 500, pagination: false, depth: 0 })

let moved = 0
let skipped = 0

for (const doc of docs) {
  const filename = doc.filename
  if (!filename) {
    skipped += 1
    continue
  }

  const source = path.join(localDir, filename)
  if (!fs.existsSync(source)) {
    payload.logger.warn(`No local copy of ${filename} — skipping.`)
    skipped += 1
    continue
  }

  const data = fs.readFileSync(source)

  await payload.update({
    collection: 'media',
    id: doc.id,
    data: {},
    file: {
      data,
      mimetype: mimeTypes[path.extname(filename).toLowerCase()] || 'application/octet-stream',
      name: filename,
      size: data.byteLength,
    },
    // Re-uploading is not an editorial change; no need to bust page caches.
    context: { disableRevalidate: true },
  })

  moved += 1
  payload.logger.info(`Uploaded ${filename} (${(data.byteLength / 1024).toFixed(0)} KB)`)
}

payload.logger.info(`Done. ${moved} uploaded, ${skipped} skipped.`)
process.exit(0)
