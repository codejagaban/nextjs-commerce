const loopback = (url: URL) => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)

export function smokeConfig(env: Record<string, string | undefined> = process.env) {
  const required = (name: string) => {
    const value = env[name]
    if (!value) throw new Error(`${name} is required for the commerce smoke test.`)
    return value
  }
  const base = new URL(required('SMOKE_BASE_URL'))
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/' ||
    (base.protocol !== 'https:' &&
      !(base.protocol === 'http:' && loopback(base) && env.SMOKE_ALLOW_LOCALHOST === '1'))
  )
    throw new Error(
      'SMOKE_BASE_URL must be an HTTPS origin (HTTP loopback requires SMOKE_ALLOW_LOCALHOST=1).',
    )

  const stripeKey = required('SMOKE_STRIPE_SECRET_KEY')
  if (!stripeKey.startsWith('sk_test_'))
    throw new Error('Smoke tests require a Stripe test secret key.')
  const mailbox = required('SMOKE_CUSTOMER_EMAIL')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mailbox))
    throw new Error('SMOKE_CUSTOMER_EMAIL must be a valid + alias mailbox.')

  const mediaOrigin = env.SMOKE_MEDIA_ORIGIN && new URL(env.SMOKE_MEDIA_ORIGIN).origin
  if (!loopback(base) && !mediaOrigin)
    throw new Error('Hosted smoke tests require SMOKE_MEDIA_ORIGIN (the public R2 origin).')
  const captureURL = env.SMOKE_INBOX_URL
  if (captureURL && !loopback(new URL(captureURL))) {
    throw new Error('The capture inbox is local-only. Use IMAP for hosted smoke tests.')
  }

  return {
    baseURL: base.origin,
    adminEmail: required('SMOKE_ADMIN_EMAIL'),
    adminPassword: required('SMOKE_ADMIN_PASSWORD'),
    mailbox,
    stripeKey,
    mediaOrigin: mediaOrigin || base.origin,
    inbox: captureURL
      ? { kind: 'capture' as const, url: captureURL, token: required('SMOKE_INBOX_TOKEN') }
      : {
          kind: 'imap' as const,
          host: required('SMOKE_IMAP_HOST'),
          port: Number(env.SMOKE_IMAP_PORT || 993),
          user: required('SMOKE_IMAP_USER'),
          password: required('SMOKE_IMAP_PASSWORD'),
          folder: env.SMOKE_IMAP_FOLDER || 'INBOX',
        },
  }
}

/** Never follow a password-reset token to a different deployment or domain. */
export function resetLink(html: string, baseURL: string) {
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => new URL(match[1].replaceAll('&amp;', '&'), baseURL))
    .filter((url) => url.pathname === '/reset-password')
  const link = links[0]
  if (!link || link.origin !== baseURL || !link.searchParams.get('token')) {
    throw new Error('Reset email has no valid reset link for this deployment.')
  }
  return link
}
