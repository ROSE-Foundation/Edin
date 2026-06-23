import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MailService } from './mail.service.js';

const mockSendMail = vi.fn();
const mockCreateTransport = vi.fn(() => ({ sendMail: mockSendMail }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: (...args: unknown[]) => mockCreateTransport(...args),
  },
}));

function buildService(config: Record<string, unknown>): MailService {
  return new MailService({
    get: (key: string) => config[key],
  } as unknown as ConfigService);
}

describe('MailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'abc' });
  });

  it('no-ops and returns false when SMTP_HOST is not configured', async () => {
    const service = buildService({ SMTP_PORT: 587, SMTP_SECURE: 'false' });

    const result = await service.sendMail({ to: 'a@b.com', subject: 'Hi', text: 'body' });

    expect(result).toBe(false);
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('builds the transport and sends with the configured sender', async () => {
    const service = buildService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 465,
      SMTP_SECURE: 'true',
      SMTP_USER: 'user@example.com',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM: 'Edin <no-reply@edin.dev>',
    });

    const result = await service.sendMail({
      to: ['ops@edin.dev'],
      subject: 'New application',
      text: 'body',
      html: '<p>body</p>',
    });

    expect(result).toBe(true);
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'user@example.com', pass: 'secret' },
    });
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'Edin <no-reply@edin.dev>',
      to: ['ops@edin.dev'],
      subject: 'New application',
      text: 'body',
      html: '<p>body</p>',
    });
  });

  it('falls back to SMTP_USER as sender when SMTP_FROM is unset', async () => {
    const service = buildService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_SECURE: 'false',
      SMTP_USER: 'user@example.com',
      SMTP_PASSWORD: 'secret',
    });

    await service.sendMail({ to: 'a@b.com', subject: 'Hi', text: 'body' });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'user@example.com' }),
    );
  });

  it('returns false and swallows transport errors', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('connection refused'));
    const service = buildService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_SECURE: 'false',
      SMTP_FROM: 'no-reply@edin.dev',
    });

    const result = await service.sendMail({ to: 'a@b.com', subject: 'Hi', text: 'body' });

    expect(result).toBe(false);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('does not enable auth when only SMTP_USER is set without SMTP_PASSWORD', async () => {
    const service = buildService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_SECURE: 'false',
      SMTP_USER: 'user@example.com',
      SMTP_FROM: 'no-reply@edin.dev',
    });

    await service.sendMail({ to: 'a@b.com', subject: 'Hi', text: 'body' });

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: undefined }));
  });

  it('returns false and skips when no sender (SMTP_FROM/SMTP_USER) is configured', async () => {
    const service = buildService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_SECURE: 'false',
    });

    const result = await service.sendMail({ to: 'a@b.com', subject: 'Hi', text: 'body' });

    expect(result).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
