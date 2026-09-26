// Never let automated tests fall back to the developer's .env database.
export function testEnvironment() {
  const value = process.env.TEST_DATABASE_URL
  if (!value)
    throw new Error(
      'Set TEST_DATABASE_URL to a disposable local Postgres database ending in _test.',
    )
  const url = new URL(value)
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !url.pathname.endsWith('_test')
  ) {
    throw new Error('Tests require a loopback Postgres database whose name ends in _test.')
  }
  return {
    ...process.env,
    DATABASE_URL: value,
    PAYLOAD_SECRET: 'commerce-isolated-test-secret-at-least-32-characters',
    NEXT_PUBLIC_SERVER_URL: 'http://localhost:3002',
    PAYLOAD_PUBLIC_SERVER_URL: 'http://localhost:3002',
    PREVIEW_SECRET: 'commerce-test-preview',
    SITE_NAME: 'Marisol',
    RESEND_API_KEY: '',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1',
    SMTP_USER: '',
    SMTP_PASS: '',
    EMAIL_OVERRIDE_RECIPIENT: '',
    R2_BUCKET: '',
    R2_ENDPOINT: '',
    R2_ACCESS_KEY_ID: '',
    R2_SECRET_ACCESS_KEY: '',
    R2_PUBLIC_URL: '',
    STRIPE_SECRET_KEY: 'sk_test_not_a_real_key',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_not_a_real_key',
    STRIPE_WEBHOOKS_SIGNING_SECRET: 'whsec_isolated_test',
    NEXT_TELEMETRY_DISABLED: '1',
  }
}
