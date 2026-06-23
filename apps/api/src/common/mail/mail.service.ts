import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { AppConfig } from '../../config/app.config.js';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  correlationId?: string;
}

/**
 * Generic SMTP mail capability built on nodemailer.
 *
 * The transport is created lazily from SMTP_* config the first time a mail is
 * sent. When SMTP_HOST is not configured, sendMail no-ops with a warn log so
 * the application still boots and runs (e.g. in dev/test) without email setup.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private getTransporter(): Transporter | null {
    const host = this.config.get('SMTP_HOST', { infer: true });
    if (!host) {
      return null;
    }

    if (!this.transporter) {
      const user = this.config.get('SMTP_USER', { infer: true });
      const pass = this.config.get('SMTP_PASSWORD', { infer: true });

      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get('SMTP_PORT', { infer: true }),
        secure: this.config.get('SMTP_SECURE', { infer: true }) === 'true',
        // Only enable auth when BOTH user and password are set; a half-configured pair fails confusingly.
        auth: user && pass ? { user, pass } : undefined,
      });
    }

    return this.transporter;
  }

  /**
   * Sends an email. Returns true when handed to the transport, false when the
   * transport is not configured or delivery failed. Never throws — callers can
   * treat email as best-effort.
   */
  async sendMail(options: SendMailOptions): Promise<boolean> {
    const { to, subject, text, html, correlationId } = options;

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('SMTP not configured (SMTP_HOST unset); skipping email', {
        module: 'mail',
        subject,
        correlationId,
      });
      return false;
    }

    const from =
      this.config.get('SMTP_FROM', { infer: true }) ??
      this.config.get('SMTP_USER', { infer: true });

    if (!from) {
      this.logger.warn('No sender configured (SMTP_FROM/SMTP_USER unset); skipping email', {
        module: 'mail',
        subject,
        correlationId,
      });
      return false;
    }

    try {
      await transporter.sendMail({ from, to, subject, text, html });
      this.logger.log('Email sent', {
        module: 'mail',
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        correlationId,
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to send email', {
        module: 'mail',
        subject,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
