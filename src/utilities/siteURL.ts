/** The single origin used for public SEO URLs, including on preview deployments. */
export function getSiteURL(): string {
  const configured =
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'http://localhost:3000'

  const url = new URL(/^https?:\/\//i.test(configured) ? configured : `https://${configured}`)
  return url.origin
}

export function getCanonicalURL(path = '/'): string {
  return new URL(path.startsWith('/') ? path : `/${path}`, getSiteURL()).toString()
}

/** Keep external media hosts intact while moving app-hosted media to the public origin. */
export function getPublicMediaURL(value: string): string {
  const url = new URL(value, getSiteURL())
  const appOrigins = [process.env.NEXT_PUBLIC_SERVER_URL, process.env.PAYLOAD_PUBLIC_SERVER_URL]
    .filter((origin): origin is string => Boolean(origin))
    .map((origin) => new URL(origin).origin)

  if (appOrigins.includes(url.origin) && url.pathname.startsWith('/api/media/file/')) {
    return getCanonicalURL(`${url.pathname}${url.search}`)
  }

  return url.toString()
}
