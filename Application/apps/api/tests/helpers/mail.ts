import { configureMailer, flushMail, type MailMessage } from '../../src/modules/notifications/mailer';
import { registerNotificationSubscribers } from '../../src/modules/notifications/notifications.subscribers';

export type SentMail = MailMessage & { from: string };

export const sentMail: SentMail[] = [];

/** Captures outgoing email in memory instead of talking to SMTP. */
export function useFakeMail(): void {
  beforeAll(() => {
    configureMailer({
      transport: {
        sendMail: async (message) => {
          sentMail.push(message);
        },
      },
      retry: { baseDelayMs: 0 },
    });
    registerNotificationSubscribers();
  });
  beforeEach(() => {
    sentMail.length = 0;
  });
}

export async function mailTo(email: string): Promise<SentMail[]> {
  await flushMail();
  return sentMail.filter((mail) => mail.to === email);
}

/** Pulls the token out of a link like /login?invite=... or /login?reset=... */
export function tokenFromMail(mail: SentMail, param: 'invite' | 'reset'): string {
  const match = mail.text.match(new RegExp(`[?&]${param}=([^\\s&]+)`));
  if (!match) throw new Error(`No ${param} link in email`);
  return decodeURIComponent(match[1]);
}
