import type { RegisterOptions } from 'react-hook-form'

/**
 * `RegisterOptions` is a union whose branches are mutually exclusive (pattern vs
 * valueAsNumber vs valueAsDate), and `deps` is narrowed to each form's own field
 * names — both stop a shared rule object from being assignable. We use `validate`
 * rather than `pattern` and never touch the rest, so drop them from the shape.
 */
type Rules = Omit<RegisterOptions, 'deps' | 'pattern' | 'valueAsNumber' | 'valueAsDate'>

/**
 * Shared react-hook-form validation rules.
 *
 * Every form sets `noValidate`, so the browser does no checking of its own and
 * these rules are the single source of truth. That keeps messages consistent,
 * lets us word them ourselves, and means validation behaves the same in every
 * browser instead of relying on native bubbles.
 */

/**
 * Deliberately permissive: one @, a dot in the domain, no whitespace. Stricter
 * regexes reject addresses that are actually deliverable, and the real check is
 * always the confirmation email.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const MIN_PASSWORD_LENGTH = 8

/** Required, trimmed, and actually an address shape. */
export const emailRules: Rules = {
  required: 'Please enter your email address.',
  setValueAs: (v: string) => (typeof v === 'string' ? v.trim() : v),
  validate: (value: string) =>
    EMAIL_PATTERN.test(String(value ?? '')) || 'That does not look like an email address.',
}

/**
 * For sign-in only. Never apply strength rules here — an existing account may
 * predate them, and rejecting a correct password at the form is a lockout.
 */
export const passwordSignInRules: Rules = {
  required: 'Please enter your password.',
}

/** For setting or changing a password, where we do get to insist. */
export const passwordRules: Rules = {
  required: 'Please choose a password.',
  minLength: {
    value: MIN_PASSWORD_LENGTH,
    message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  },
  validate: (value: string) => {
    const v = String(value ?? '')
    if (/^\s|\s$/.test(v)) return 'Password cannot start or end with a space.'
    if (!/[a-zA-Z]/.test(v) || !/[0-9]/.test(v)) return 'Include at least one letter and one number.'
    return true
  },
}

/** Confirmation field — pass a getter so it compares against the live value. */
export const passwordConfirmRules = (getPassword: () => string | undefined): Rules => ({
  required: 'Please confirm your password.',
  validate: (value: string) => value === getPassword() || 'Those passwords do not match.',
})

/** Generic required field, worded for the label it sits under. */
export const requiredRule = (label: string): Rules => ({
  required: `${label} is required.`,
  setValueAs: (v: unknown) => (typeof v === 'string' ? v.trim() : v),
  validate: (value: unknown) =>
    String(value ?? '').trim().length > 0 || `${label} is required.`,
})

/** Loose on purpose — postal formats vary far too much to pin down. */
export const postalCodeRules: Rules = {
  required: 'Postal code is required.',
  setValueAs: (v: string) => (typeof v === 'string' ? v.trim() : v),
  validate: (value: string) =>
    /^[A-Za-z0-9][A-Za-z0-9\s-]{1,11}$/.test(String(value ?? '').trim()) ||
    'That does not look like a postal code.',
}

/** Optional, but if given it has to be plausible. */
export const phoneRules: Rules = {
  setValueAs: (v: string) => (typeof v === 'string' ? v.trim() : v),
  validate: (value: string) => {
    const v = String(value ?? '').trim()
    if (!v) return true
    return (
      /^[+]?[\d\s().-]{6,20}$/.test(v) || 'That does not look like a phone number.'
    )
  },
}
