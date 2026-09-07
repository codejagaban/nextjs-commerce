import type { EmailAdapter } from 'payload'

import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { resendAdapter } from '@payloadcms/email-resend'

/**
 * Whichever mail provider this store happens to have.
 *
 * A clone of this template picks its provider with environment variables rather
 * than a code change, because "which mail service" is a per-store decision and
 * most businesses already have one:
 *
 *   RESEND_API_KEY  -> Resend, over HTTP
 *   SMTP_HOST       -> any SMTP server (Spacemail, Workspace, SES, Mailgun…)
 *   neither         -> Payload's Ethereal test account, which delivers nowhere
 *                      real and logs credentials for reading the messages
 *
 * Resend wins when both are set: an HTTP call survives a short-lived serverless
 * function better than an SMTP handshake does, so if a store has gone to the
 * trouble of configuring it, it is the one to use.
 *
 * The fallback is the reason local development and CI need no credentials at
 * all: Payload mints an Ethereal inbox and logs its username and password, and
 * the reset email is readable by signing in at ethereal.email.
 */

const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'
const fromName = process.env.EMAIL_FROM_NAME || process.env.SITE_NAME || 'Marisol'

/**
 * Send every message to one inbox instead of its real recipient.
 *
 * Set this on staging. Without it, a database seeded from a production dump will
 * email real customers the moment something triggers a notification.
 */
const overrideRecipient = process.env.EMAIL_OVERRIDE_RECIPIENT
  ? { overrideRecipientAddress: process.env.EMAIL_OVERRIDE_RECIPIENT }
  : {}

/** SMTP over TLS on 465; STARTTLS on 587 and everything else. */
const smtpPort = Number(process.env.SMTP_PORT || 587)

export const emailAdapter = (): EmailAdapter | Promise<EmailAdapter> | undefined => {
  if (process.env.RESEND_API_KEY) {
    return resendAdapter({
      apiKey: process.env.RESEND_API_KEY,
      defaultFromAddress: fromAddress,
      defaultFromName: fromName,
      ...overrideRecipient,
    })
  }

  if (process.env.SMTP_HOST) {
    return nodemailerAdapter({
      defaultFromAddress: fromAddress,
      defaultFromName: fromName,
      ...overrideRecipient,
      transportOptions: {
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      /**
       * Payload verifies the transport at startup by opening a connection. A
       * mailbox host that is briefly unreachable would take the whole app down
       * with it, so the check is skipped and a bad credential surfaces on the
       * first send instead of at boot.
       */
      skipVerify: true,
    })
  }

  // No provider configured: Payload mints an Ethereal inbox and logs the
  // credentials for it. Nothing reaches a real recipient, and the sender shows
  // as Payload's own default rather than EMAIL_FROM_ADDRESS — the Ethereal path
  // takes no configuration, which is the point of it.
  return nodemailerAdapter()
}
