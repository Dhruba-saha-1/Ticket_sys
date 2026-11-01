import { appUrl } from '../../config/env';
import { bus } from '../../events/bus';
import { sendMail } from './mailer';
import { inviteEmail } from './templates/invite';
import { passwordResetEmail } from './templates/passwordReset';

let registered = false;

/** Wires domain events to outgoing email (§6.6). Safe to call more than once. */
export function registerNotificationSubscribers(): void {
  if (registered) return;
  registered = true;

  bus.on('user.invited', ({ email, name, token }) => {
    const link = `${appUrl}/login?invite=${encodeURIComponent(token)}`;
    return sendMail({ to: email, ...inviteEmail({ name, link }) }).then(() => undefined);
  });

  bus.on('user.password_reset_requested', ({ email, name, token }) => {
    const link = `${appUrl}/login?reset=${encodeURIComponent(token)}`;
    return sendMail({ to: email, ...passwordResetEmail({ name, link }) }).then(() => undefined);
  });
}
