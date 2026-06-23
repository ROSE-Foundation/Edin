import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import type { ContributorDomain } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import { AuthService } from '../auth/auth.service.js';
import type { AppConfig } from '../../config/app.config.js';

export interface ApplicationSubmittedEvent {
  applicationId: string;
  applicantEmail: string;
  domain: ContributorDomain;
  correlationId?: string;
}

export interface ApplicationApprovedEvent {
  applicationId: string;
  adminId: string;
  correlationId?: string;
  /** Set only for brand-new accounts created at approval — drives the invite. */
  setPasswordContributorId?: string | null;
}

/** Basic sanity check for a recipient address (not full RFC 5322). */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Maps each contributor domain to its recipient env-var key. */
const DOMAIN_RECIPIENT_KEY: Record<ContributorDomain, keyof AppConfig> = {
  Technology: 'ADMISSION_NOTIFICATION_EMAIL_TECHNOLOGY',
  Finance: 'ADMISSION_NOTIFICATION_EMAIL_FINANCE',
  Impact: 'ADMISSION_NOTIFICATION_EMAIL_IMPACT',
  Governance: 'ADMISSION_NOTIFICATION_EMAIL_GOVERNANCE',
  // Nurea TV has no dedicated inbox — route to the default recipient.
  Nurea_TV: 'ADMISSION_NOTIFICATION_EMAIL_DEFAULT',
};

/**
 * Sends a best-effort email to the responsible inbox whenever a new admission
 * application is submitted. Failures (no recipient, SMTP down, transport error)
 * are logged and swallowed — they never affect application creation.
 */
@Injectable()
export class AdmissionEmailListener {
  private readonly logger = new Logger(AdmissionEmailListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly authService: AuthService,
  ) {}

  @OnEvent('admission.application.submitted')
  async handleApplicationSubmitted(event: ApplicationSubmittedEvent): Promise<void> {
    const { applicationId, domain, correlationId } = event;

    try {
      const recipients = this.resolveRecipients(domain);
      if (recipients.length === 0) {
        this.logger.warn('No notification recipient configured for domain; skipping email', {
          module: 'admission',
          applicationId,
          domain,
          correlationId,
        });
        return;
      }

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          applicantName: true,
          applicantEmail: true,
          domain: true,
          statementOfInterest: true,
        },
      });
      if (!application) {
        this.logger.warn('Application not found when building notification email', {
          module: 'admission',
          applicationId,
          correlationId,
        });
        return;
      }

      const adminUrl = `${this.config.get('FRONTEND_URL', { infer: true })}/admin/admission`;
      // Strip CR/LF and clamp length before placing the name in the Subject header (header-injection defense).
      const safeName = application.applicantName
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, 200);
      const subject = `New ${application.domain} application: ${safeName}`;
      const text = [
        `A new contributor application has been submitted.`,
        ``,
        `Name: ${application.applicantName}`,
        `Email: ${application.applicantEmail}`,
        `Domain: ${application.domain}`,
        ``,
        `Statement of interest:`,
        application.statementOfInterest,
        ``,
        `Review it in the admission queue: ${adminUrl}`,
      ].join('\n');
      const html = [
        `<p>A new contributor application has been submitted.</p>`,
        `<ul>`,
        `<li><strong>Name:</strong> ${escapeHtml(application.applicantName)}</li>`,
        `<li><strong>Email:</strong> ${escapeHtml(application.applicantEmail)}</li>`,
        `<li><strong>Domain:</strong> ${escapeHtml(application.domain)}</li>`,
        `</ul>`,
        `<p><strong>Statement of interest:</strong><br/>${escapeHtml(application.statementOfInterest).replace(/\n/g, '<br/>')}</p>`,
        `<p><a href="${adminUrl}">Review it in the admission queue</a></p>`,
      ].join('');

      await this.mailService.sendMail({ to: recipients, subject, text, html, correlationId });
    } catch (error) {
      this.logger.error('Failed to send admission notification email', {
        module: 'admission',
        applicationId,
        domain,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * On approval, sends a best-effort set-password invitation email to the
   * applicant with a one-time link. Failures never affect the approval.
   */
  @OnEvent('admission.application.approved')
  async handleApplicationApproved(event: ApplicationApprovedEvent): Promise<void> {
    const { applicationId, setPasswordContributorId, correlationId } = event;

    // Only brand-new accounts created at approval get a set-password invitation;
    // pre-existing accounts already have a way in.
    if (!setPasswordContributorId) {
      return;
    }

    try {
      const contributor = await this.prisma.contributor.findUnique({
        where: { id: setPasswordContributorId },
        select: { name: true, email: true },
      });

      if (!contributor?.email) {
        this.logger.warn('Approved contributor has no email; skipping set-password email', {
          module: 'admission',
          applicationId,
          correlationId,
        });
        return;
      }

      const rawToken = await this.authService.createPasswordSetupToken(setPasswordContributorId);
      const setPasswordUrl = `${this.config.get('FRONTEND_URL', { infer: true })}/set-password?token=${rawToken}`;

      const subject = 'Your Edin application is approved — set your password';
      const text = [
        `Hi ${contributor.name},`,
        ``,
        `Your application to Edin has been approved. Set your password to activate your account:`,
        setPasswordUrl,
        ``,
        `Your sign-in identifier is this email address (${contributor.email}). This link expires in 7 days.`,
      ].join('\n');
      const html = [
        `<p>Hi ${escapeHtml(contributor.name)},</p>`,
        `<p>Your application to Edin has been approved. Set your password to activate your account:</p>`,
        `<p><a href="${escapeHtml(setPasswordUrl)}">Set your password</a></p>`,
        `<p>Your sign-in identifier is this email address (${escapeHtml(contributor.email)}). This link expires in 7 days.</p>`,
      ].join('');

      await this.mailService.sendMail({
        to: contributor.email,
        subject,
        text,
        html,
        correlationId,
      });
    } catch (error) {
      this.logger.error('Failed to send set-password invitation email', {
        module: 'admission',
        applicationId,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Resolves the recipient list for a domain, falling back to the default address. */
  private resolveRecipients(domain: ContributorDomain): string[] {
    // Treat an unset OR blank domain var as "no domain recipient" so the default is consulted.
    const domainValue = this.config.get(DOMAIN_RECIPIENT_KEY[domain], { infer: true });
    const configured =
      (typeof domainValue === 'string' && domainValue.trim().length > 0
        ? domainValue
        : undefined) ?? this.config.get('ADMISSION_NOTIFICATION_EMAIL_DEFAULT', { infer: true });

    if (!configured || typeof configured !== 'string') {
      return [];
    }

    const recipients: string[] = [];
    for (const raw of configured.split(',')) {
      const address = raw.trim();
      if (address.length === 0) {
        continue;
      }
      if (!EMAIL_PATTERN.test(address)) {
        this.logger.warn('Ignoring malformed notification recipient address', {
          module: 'admission',
          domain,
          address,
        });
        continue;
      }
      recipients.push(address);
    }
    return recipients;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
