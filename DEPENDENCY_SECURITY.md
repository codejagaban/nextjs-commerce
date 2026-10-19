# Dependency security

Reviewed on 2026-10-19. Run `pnpm audit --prod` for the deployable dependency
tree and `pnpm audit` for the entire development environment. The production
audit remains a required CI gate. No advisory is ignored or suppressed.

## Security updates

| Dependency                                      | Previous       | Updated         |
| ----------------------------------------------- | -------------- | --------------- |
| Next.js and its ESLint packages                 | 16.3.6         | 16.3.8          |
| Sharp                                           | 0.35.4         | 0.35.5          |
| Payload and all first-party adapters/plugins    | 3.90.2         | 3.91.0          |
| Nodemailer, through Payload's supported adapter | 9.1.1          | 10.1.7          |
| Undici, through Payload                         | 7.29.0         | 7.29.1          |
| source-map-js                                   | 1.2.1          | 1.2.2           |
| fast-uri                                        | 3.1.7          | 3.1.8           |
| Vitest and its matching internal packages       | 4.0.18         | 4.1.12          |
| brace-expansion                                 | 1.1.18 / 5.0.9 | 1.1.21 / 5.0.12 |

The Next.js patch addresses [image-optimizer SSRF and related security issues](https://github.com/vercel/next.js/releases/tag/v16.3.8).
Payload's [3.91.0 release](https://github.com/payloadcms/payload/releases/tag/v3.91.0)
provides the supported Nodemailer 10 and Undici updates, avoiding a forced
cross-major mail-adapter override. Sharp fixes its
[vulnerable librsvg dependency](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).

## Removing production paths to braces

`braces` has [no published fix](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Instead of hiding that finding, the version-scoped overrides in
`pnpm-workspace.yaml` remove its production dependency paths:

- Sass 1.77.4 is replaced with 1.105.2, which uses Chokidar 5 without `braces`.
  This also applies to Next.js's optional Sass peer, not just Payload's copy.
- `@payloadcms/plugin-cloud-storage@3.91.0` declares `find-node-modules` but has
  no references to it in its distributed JavaScript. Removing that unused
  dependency also removes its `findup-sync → micromatch → braces` chain.
  A unit test checks the inspected release and its distributed files. Re-evaluate
  this removal when upgrading Payload; it is not a blanket override.

The new Sass watcher requires Node.js 20.19.0 or later. Node.js 24 LTS is used in
CI. Its optional native Parcel watcher has an explicitly approved build script.
Keep the production build, admin browser checks, and R2 upload/derivative/delete
smoke test in the verification path for future changes to these overrides.

## Remaining development-only findings

- **High: braces 3.0.3**, through `lint-staged → micromatch` and the Next.js
  ESLint plugin's `fast-glob → micromatch`. No upstream patched version exists.
  These paths process developer-controlled file patterns; they are absent from
  the production dependency tree. Do not expose these tools or accept untrusted
  glob configuration. Keep the advisory visible until upstream replaces or
  fixes the dependency.
- **Moderate: postcss-selector-parser 6.0.10**, pinned by
  `@tailwindcss/typography`. The [fix is in 7.1.6 or later](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
  A cross-major override needs a separate compatibility review of generated
  typography CSS. It has not been silently forced into this high-severity pass.

A clean production audit does not mean the full development audit is clean, nor
does it prove the absence of unknown vulnerabilities. Re-run both audits after
dependency changes and retain the lockfile in review.

## Verification

- `pnpm install --frozen-lockfile`: passed.
- `pnpm audit --prod`: **0 findings**, down from 25, including 8 high-severity findings.
- `pnpm audit`: **2 findings**, down from 35; the remaining findings are listed above.
- Unit tests: **32 passed**. Integration tests: **21 passed**.
- Production-build storefront/admin browser suite: **11 passed** on Node.js 24.
- Typecheck and lint passed; lint retains 110 existing warnings and no errors.
- Production-build commerce smoke: **passed** on Node.js 24 with real Stripe
  sandbox card entry, webhook settlement, confirmation retries, private order access,
  captured SMTP receipt/reset emails, and R2 original/thumbnail/optimizer delivery.
  The runner exited normally and removed its temporary application records and media.
  This uses a disposable loopback test database, not the store database. It does not
  substitute for the separate hosted HTTPS smoke check or external inbox delivery.

An earlier smoke run on Node.js 26 completed its assertions and fixture cleanup but
stalled during worker shutdown and required stopping that worker. The final Node.js
24 run completed unattended. Use the CI-matched LTS runtime for reproducible checks.

Next.js's stricter private-IP image protection exposed two admin components passing
same-origin media as remote URLs. They now use the existing media-URL normalizer,
with URL and browser regression coverage. Private-IP fetching remains disabled.
