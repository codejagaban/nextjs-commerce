/** Keep same-origin Payload media local to Next's image optimizer. */
export function getMediaURL(value: string): string {
  const origin = process.env.NEXT_PUBLIC_SERVER_URL
  if (!origin || !/^https?:\/\//.test(value)) return value
  try {
    const url = new URL(value)
    if (url.origin === new URL(origin).origin && url.pathname.startsWith('/api/media/file/')) {
      return `${url.pathname}${url.search}`
    }
  } catch {
    // Leave malformed URLs to the image component's normal error handling.
  }
  return value
}
