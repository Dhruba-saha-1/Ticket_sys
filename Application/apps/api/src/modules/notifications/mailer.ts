import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailTransport {
  sendMail(message: MailMessage & { from: string }): Promise<unknown>;
}

export interface RetryPolicy {
  retries: number;
  baseDelayMs: number;
}

let transport: MailTransport | undefined;
let retryPolicy: RetryPolicy = { retries: 3, baseDelayMs: 1000 };
const pending = new Set<Promise<boolean>>();

function getTransport(): MailTransport {
  if (!transport) {
    const smtp = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    transport = { sendMail: (message) => smtp.sendMail(message) };
  }
  return transport;
}

/** Test hook: swap the SMTP transport and retry timing. */
export function configureMailer(options: { transport?: MailTransport; retry?: Partial<RetryPolicy> }): void {
  if (options.transport) transport = options.transport;
  if (options.retry) retryPolicy = { ...retryPolicy, ...options.retry };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function deliver(message: MailMessage): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    try {
      await getTransport().sendMail({ from: env.MAIL_FROM, ...message });
      return true;
    } catch (err) {
      if (attempt >= retryPolicy.retries) {
        logger.error({ err, to: message.to, subject: message.subject }, 'Mail delivery failed');
        return false;
      }
      logger.warn({ err, attempt: attempt + 1 }, 'Mail delivery failed, retrying');
      await sleep(retryPolicy.baseDelayMs * 2 ** attempt);
    }
  }
}

/** Sends in the background with retries. Never rejects; resolves to whether delivery succeeded. */
export function sendMail(message: MailMessage): Promise<boolean> {
  const delivery = deliver(message);
  pending.add(delivery);
  void delivery.finally(() => pending.delete(delivery));
  return delivery;
}

/** Resolves once every in-flight email has been delivered or given up on. */
export async function flushMail(): Promise<void> {
  await Promise.all([...pending]);
}
