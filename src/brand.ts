/**
 * The store's name, before Store settings can answer.
 *
 * At request time the storefront reads `storeName` from Store settings, so a
 * clone renames itself from the admin. This is only the last resort — the value
 * used while the settings row is still empty, and in the few places that run too
 * early to query anything (the Payload config, SEO title generation, the email
 * sender name). Keeping it in one place means a clone changes one line instead
 * of hunting the same literal through eight files.
 */
export const DEFAULT_STORE_NAME = process.env.SITE_NAME || 'Marisol'
