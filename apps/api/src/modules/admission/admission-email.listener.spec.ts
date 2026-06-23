import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdmissionEmailListener } from './admission-email.listener.js';
import type { ApplicationSubmittedEvent } from './admission-email.listener.js';
import { MailService } from '../../common/mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';

const APPLICATION = {
  applicantName: 'Jane Doe',
  applicantEmail: 'jane@example.com',
  domain: 'Technology' as const,
  statementOfInterest: 'I want to contribute to the technology domain.',
};

function build(config: Record<string, unknown>) {
  const findUnique = vi.fn().mockResolvedValue(APPLICATION);
  const contributorFindUnique = vi.fn();
  const sendMail = vi.fn().mockResolvedValue(true);
  const createPasswordSetupToken = vi.fn().mockResolvedValue('raw-token-123');

  const prisma = {
    application: { findUnique },
    contributor: { findUnique: contributorFindUnique },
  } as unknown as PrismaService;
  const mail = { sendMail } as unknown as MailService;
  const configService = {
    get: (key: string) => config[key],
  } as unknown as ConfigService;
  const authService = { createPasswordSetupToken } as unknown as AuthService;

  const listener = new AdmissionEmailListener(prisma, mail, configService, authService);
  return { listener, findUnique, contributorFindUnique, sendMail, createPasswordSetupToken };
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

  describe('handleApplicationApproved', () => {
    const newAccountEvent = {
      applicationId: 'app-1',
      adminId: 'admin-1',
      correlationId: 'corr-1',
      setPasswordContributorId: 'contrib-1',
    };

    it('emails the set-password link only to a newly-created account', async () => {
      const { listener, contributorFindUnique, sendMail, createPasswordSetupToken } = build({
        FRONTEND_URL: 'http://localhost:3000',
      });
      contributorFindUnique.mockResolvedValueOnce({ name: 'Jane Doe', email: 'jane@example.com' });

      await listener.handleApplicationApproved(newAccountEvent);

      expect(createPasswordSetupToken).toHaveBeenCalledWith('contrib-1');
      const arg = sendMail.mock.calls[0][0];
      expect(arg.to).toBe('jane@example.com');
      expect(arg.text).toContain('http://localhost:3000/set-password?token=raw-token-123');
      expect(arg.html).toContain('/set-password?token=raw-token-123');
    });

    it('skips entirely when no new account was created (no setPasswordContributorId)', async () => {
      const { listener, contributorFindUnique, sendMail, createPasswordSetupToken } = build({
        FRONTEND_URL: 'http://localhost:3000',
      });

      await listener.handleApplicationApproved({
        applicationId: 'app-1',
        adminId: 'admin-1',
        correlationId: 'corr-1',
        setPasswordContributorId: null,
      });

      expect(contributorFindUnique).not.toHaveBeenCalled();
      expect(createPasswordSetupToken).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('swallows errors so approval is never affected', async () => {
      const { listener, contributorFindUnique, sendMail, createPasswordSetupToken } = build({
        FRONTEND_URL: 'http://localhost:3000',
      });
      contributorFindUnique.mockResolvedValueOnce({ name: 'Jane Doe', email: 'jane@example.com' });
      createPasswordSetupToken.mockRejectedValueOnce(new Error('token failure'));

      await expect(listener.handleApplicationApproved(newAccountEvent)).resolves.toBeUndefined();
      expect(sendMail).not.toHaveBeenCalled();
    });
  });
});
