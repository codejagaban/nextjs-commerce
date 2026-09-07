import { s3Storage } from '@payloadcms/storage-s3'

/**
 * Where uploaded media lives.
 *
 * Configured for Cloudflare R2, but this is the plain S3 adapter, so any
 * S3-compatible bucket works by changing the endpoint — AWS, Backblaze B2,
 * DigitalOcean Spaces, MinIO. Set R2_BUCKET and the adapter takes over; leave it
 * unset and Payload keeps writing to `public/media`, so a fresh clone runs with
 * no cloud account at all.
 *
 * Two settings carry the whole cost argument:
 *
 * `disablePayloadAccessControl` — without it Payload serves every file through
 * its own `/api/media/file/...` route, which means each image request runs a
 * serverless function and streams the bytes through the host. That is billed
 * traffic, and it would quietly undo the reason for choosing a zero-egress
 * bucket. With it, browsers fetch straight from the bucket.
 *
 * `generateFileURL` — the public bucket URL that access control is bypassed in
 * favour of. It follows from the above: media is world-readable by URL, which is
 * correct for a product catalogue and wrong for anything private. Do not put
 * private documents in this bucket.
 */
const publicURL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')

export const mediaStorage = s3Storage({
  enabled: Boolean(process.env.R2_BUCKET),
  bucket: process.env.R2_BUCKET || '',
  collections: {
    media: {
      disablePayloadAccessControl: true,
      generateFileURL: ({ filename, prefix }) =>
        [publicURL, prefix, filename].filter(Boolean).join('/'),
      prefix: 'media',
    },
  },
  config: {
    // R2 has no regions; the SDK still requires the field, and 'auto' is the
    // value Cloudflare documents.
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  },
})
