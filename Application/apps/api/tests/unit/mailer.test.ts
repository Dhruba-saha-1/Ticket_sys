import { configureMailer, sendMail } from '../../src/modules/notifications/mailer';

const message = { to: 'a@example.com', subject: 'Hi', text: 'Hi', html: '<p>Hi</p>' };

describe('mailer', () => {
  it('sends with the configured from address', async () => {
    const sendMailMock = jest.fn().mockResolvedValue(undefined);
    configureMailer({ transport: { sendMail: sendMailMock }, retry: { baseDelayMs: 0 } });

    await expect(sendMail(message)).resolves.toBe(true);
    expect(sendMailMock).toHaveBeenCalledWith({ ...message, from: 'no-reply@example.com' });
  });

  it('retries 3 times, then gives up without throwing', async () => {
    const sendMailMock = jest.fn().mockRejectedValue(new Error('SMTP down'));
    configureMailer({ transport: { sendMail: sendMailMock }, retry: { baseDelayMs: 0 } });

    await expect(sendMail(message)).resolves.toBe(false);
    expect(sendMailMock).toHaveBeenCalledTimes(4);
  });

  it('succeeds if a retry gets through', async () => {
    const sendMailMock = jest.fn().mockRejectedValueOnce(new Error('blip')).mockResolvedValue(undefined);
    configureMailer({ transport: { sendMail: sendMailMock }, retry: { baseDelayMs: 0 } });

    await expect(sendMail(message)).resolves.toBe(true);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });
});
