import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import type { smokeConfig } from './config'

export type Message = { subject: string; html: string; text: string }

/** Reads only this run's alias. IMAP fetches do not mark mail read or delete it. */
export async function messagesFor(
  inbox: ReturnType<typeof smokeConfig>['inbox'],
  recipient: string,
): Promise<Message[]> {
  if (inbox.kind === 'capture') {
    const url = new URL('/messages', inbox.url)
    url.searchParams.set('to', recipient)
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${inbox.token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`Capture inbox returned HTTP ${response.status}.`)
    return response.json()
  }

  const client = new ImapFlow({
    host: inbox.host,
    port: inbox.port,
    secure: true,
    auth: { user: inbox.user, pass: inbox.password },
    logger: false,
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  })
  const messages: Message[] = []
  try {
    await client.connect()
    await client.mailboxOpen(inbox.folder, { readOnly: true })
    const matches = await client.search({ to: recipient }, { uid: true })
    if (matches && matches.length) {
      for await (const message of client.fetch(matches, { source: true }, { uid: true })) {
        if (!message.source) continue
        const parsed = await simpleParser(message.source)
        const recipients = [parsed.to].flat().flatMap((value) => value?.value || [])
        if (!recipients.some((value) => value.address?.toLowerCase() === recipient.toLowerCase()))
          continue
        messages.push({
          subject: parsed.subject || '',
          html: parsed.html || '',
          text: parsed.text || '',
        })
      }
    }
    return messages
  } finally {
    await client.logout().catch(() => client.close())
  }
}
