import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdmissionEmailListener } from './admission-email.listener.js';
import type { ApplicationSubmittedEvent } from './admission-email.listener.js';
import { MailService } from '../../common/mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const APPLICATION = {
  applicantName: 'Jane Doe',
  applicantEmail: 'jane@example.com',
  domain: 'Technology' as const,
  statementOfInterest: 'I want to contribute to the technology domain.',
};

function build(config: Record<string, unknown>) {
  const findUnique = vi.fn().mockResolvedValue(APPLICATION);
  const sendMail = vi.fn().mockResolvedValue(true);

  const prisma = { application: { findUnique } } as unknown as PrismaService;
  const mail = { sendMail } as unknown as MailService;
  const configService = {
    get: (key: string) => config[key],
  } as unknown as ConfigService;

  const listener = new AdmissionEmailListener(prisma, mail, configService);
  return { listener, findUnique, sendMail };
}

const baseEvent: ApplicationSubmittedEvent = {
  applicationId: 'app-1',
  applicantEmail: 'jane@example.com',
  domain: 'Technology',
  correlationId: 'corr-1',
};

describe('AdmissionEmailListener', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes to the per-domain recipient with full details and admin link', async () => {
    const { listener, sendMail } = build({
      FRONTEND_URL: 'http://localhost:3000',
      ADMISSION_NOTIFICATION_EMAIL_TECHNOLOGY: 'tech@edin.dev',
    });

    await listener.handleApplicationSubmitted(baseEvent);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toEqual(['tech@edin.dev']);
    expect(arg.subject).toBe('New Technology application: Jane Doe');
    expect(arg.text).toContain('jane@example.com');
    expect(arg.text).toContain('http://localhost:3000/admin/admission');
    expect(arg.html).toContain('http://localhost:3000/admin/admission');
  });

  it('splits a comma-separated recipient list into multiple addresses', async () => {
    const { listener, sendMail } = build({
      FRONTEND_URL: 'http://localhost:3000',
      ADMISSION_NOTIFICATION_EMAIL_TECHNOLOGY: 'tech@edin.dev, lead@edin.dev ',
    });

    await listener.handleApplicationSubmitted(baseEvent);

    expect(sendMail.mock.calls[0][0].to).toEqual(['tech@edin.dev', 'lead@edin.dev']);
  });

  it('falls back to the default recipient when the domain var is unset', async () => {
    const { listener, sendMail } = build({
      FRONTEND_URL: 'http://localhost:3000',
      ADMISSION_NOTIFICATION_EMAIL_DEFAULT: 'ops@edin.dev',
    });

    await listener.handleApplicationSubmitted({ ...baseEvent, domain: 'Finance' });

    expect(sendMail.mock.calls[0][0].to).toEqual(['ops@edin.dev']);
  });

  it('falls back to the default when the domain var is set but blank', async () => {
    const { listener, sendMail } = build({
      FRONTEND_URL: 'http://localhost:3000',
      ADMISSION_NOTIFICATION_EMAIL_TECHNOLOGY: '   ',
      ADMISSION_NOTIFICATION_EMAIL_DEFAULT: 'ops@edin.dev',
    });

    await listener.handleApplicationSubmitted(baseEvent);

    expect(sendMail.mock.calls[0][0].to).toEqual(['ops@edin.dev']);
  });

  it('drops malformed recipient addresses', async () => {
    const { listener, sendMail } = build({
      FRONTEND_URL: 'http://localhost:3000',
      ADMISSION_NOTIFICATION_EMAIL_TECHNOLOGY: 'not-an-email, ok@edin.dev',
    });

    await listener.handleApplicationSubmitted(baseEvent);

    expect(sendMail.mock.calls[0][0].to).toEqual(['ok@edin.dev']);
  });

  it('sanitizes CR/LF out of the subject line', async () => {
    const { listener, sendMail, findUnique } = build({
      FRONTEND_URL: 'http://localhost:3000',
      ADMISSION_NOTIFICATION_EMAIL_TECHNOLOGY: 'tech@edin.dev',
    });
    findUnique.mockResolvedValue({ ...APPLICATION, applicantName: 'Jane\r\nBcc: evil@x.com' });

    await listener.handleApplicationSubmitted(baseEvent);

    expect(sendMail.mock.calls[0][0].subject).not.toMatch(/[\r\n]/);
  });

  it('does not send and does not fetch when no recipient is configured', async () => {
    const { listener, sendMail, findUnique } = build({ FRONTEND_URL: 'http://localhost:3000' });

    await listener.handleApplicationSubmitted({ ...baseEvent, domain: 'Impact' });

    expect(sendMail).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('swallows errors so application creation is never affected', async () => {
    const { listener, findUnique, sendMail } = build({
      FRONTEND_URL: 'http://localhost:3000',
      ADMISSION_NOTIFICATION_EMAIL_TECHNOLOGY: 'tech@edin.dev',
    });
    findUnique.mockRejectedValueOnce(new Error('db down'));

    await expect(listener.handleApplicationSubmitted(baseEvent)).resolves.toBeUndefined();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
