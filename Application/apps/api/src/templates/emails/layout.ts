export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function actionEmail(options: {
  subject: string;
  greetingName: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  footer: string;
}): RenderedEmail {
  const { subject, greetingName, intro, actionLabel, actionUrl, footer } = options;
  const text = `Hi ${greetingName},\n\n${intro}\n\n${actionLabel}: ${actionUrl}\n\n${footer}\n`;
  const html = `<p>Hi ${escapeHtml(greetingName)},</p>
<p>${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(actionUrl)}">${escapeHtml(actionLabel)}</a></p>
<p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>`;
  return { subject, text, html };
}
