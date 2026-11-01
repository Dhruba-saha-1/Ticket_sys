import { actionEmail, type RenderedEmail } from './layout';

export function inviteEmail(params: { name: string; link: string }): RenderedEmail {
  return actionEmail({
    subject: 'You have been invited to the ticketing system',
    greetingName: params.name,
    intro: 'You have been invited to join the ticketing system. Set your password to activate your account.',
    actionLabel: 'Set your password',
    actionUrl: params.link,
    footer: 'This link expires in 72 hours. If you were not expecting this invite, you can ignore this email.',
  });
}
