export const escapeHTML = (value: string | number) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export const renderActionEmail = ({
  actionLabel,
  intro,
  note,
  storeName,
  title,
  url,
}: {
  actionLabel: string
  intro: string
  note: string
  storeName: string
  title: string
  url: string
}) => ({
  html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHTML(title)}</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .email-body { background:#201b19 !important; }
        .email-panel { background:#2b2522 !important; }
        .email-ink { color:#f5efea !important; }
        .email-muted { color:#c6bab3 !important; }
        .email-button { background:#f5efea !important; color:#28211e !important; }
        .email-link { color:#dfd4cd !important; }
      }
    </style>
  </head>
  <body class="email-body" style="margin:0;background:#f5f0ec;padding:32px 16px;color:#28211e;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-panel" style="width:100%;max-width:620px;margin:0 auto;background:#fffaf6;padding:36px;box-sizing:border-box;">
      <p class="email-muted" style="margin:0 0 28px;color:#6d625d;font-size:13px;letter-spacing:.04em;">${escapeHTML(storeName)}</p>
      <h1 class="email-ink" style="margin:0;color:#28211e;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;line-height:1.15;">${escapeHTML(title)}</h1>
      <p class="email-muted" style="margin:14px 0 28px;color:#6d625d;font-size:15px;line-height:1.6;">${escapeHTML(intro)}</p>
      <p style="margin:0;">
        <a class="email-button" href="${escapeHTML(url)}" style="display:inline-block;background:#28211e;color:#fffaf6;padding:13px 20px;text-decoration:none;font-size:14px;font-weight:700;">${escapeHTML(actionLabel)}</a>
      </p>
      <p class="email-muted" style="margin:28px 0 0;color:#8a7e78;font-size:12px;line-height:1.6;">If the button does not work, copy this address:<br><a class="email-link" href="${escapeHTML(url)}" style="color:#6d625d;word-break:break-all;">${escapeHTML(url)}</a></p>
      <p class="email-muted" style="margin:18px 0 0;color:#8a7e78;font-size:12px;line-height:1.6;">${escapeHTML(note)}</p>
    </div>
  </body>
</html>`,
  text: [title, '', intro, '', `${actionLabel}: ${url}`, '', note].join('\n'),
})
