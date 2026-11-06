import { actionEmail, type RenderedEmail } from './layout';

export function passwordResetEmail(params: { name: string; link: string }): RenderedEmail {
  return actionEmail({
    subject: 'Reset your password',
    greetingName: params.name,
    intro: 'We received a request to reset your password.',
    actionLabel: 'Reset your password',
    actionUrl: params.link,
    footer: 'This link expires in 1 hour. If you did not request a reset, you can ignore this email.',
  });
}
