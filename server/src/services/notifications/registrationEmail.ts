import type { RegistrationStatus } from '../../constants/leagues';
import type { IRegistration } from '../../models/leagues/Registration';
import { League, Payment, Player } from '../../models';
import { formatEntryFeeDisplay, resolveLeagueRegistration } from '../leagues/registration';

export type RegistrationEmailTemplate =
  | 'registrationReceived'
  | 'registrationApproved'
  | 'registrationRejected'
  | 'paymentReceipt';

export type RegistrationEmailDelivery = 'manual_copy' | 'resend';

export interface RegistrationEmailNotification {
  template: RegistrationEmailTemplate;
  registrationId: string;
  leagueId: string;
  leagueName: string;
  recipientName: string;
  recipientEmail: string;
  entrantLabel: string;
  status: RegistrationStatus;
  emailSubject: string;
  emailBody: string;
  delivery: RegistrationEmailDelivery;
  emailSent: boolean;
}

export interface RegistrationEmailContext {
  registrationId: string;
  leagueId: string;
  leagueName: string;
  recipientName: string;
  recipientEmail: string;
  entrantLabel: string;
  status: RegistrationStatus;
}

function resolveClientUrl(): string {
  return process.env.CLIENT_URL?.replace(/\/$/, '') ?? 'http://localhost:5173';
}

export function isTransactionalEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function entrantLabelForRegistration(registration: Pick<IRegistration, 'entrantType' | 'teamName'>): string {
  if (registration.entrantType === 'player') {
    return 'Individual player entry';
  }

  return registration.teamName?.trim() || 'Team registration';
}

export async function loadRegistrationEmailContext(
  registration: IRegistration
): Promise<RegistrationEmailContext | null> {
  const [player, league] = await Promise.all([
    Player.findById(registration.submittedByPlayerId).select('name email').lean(),
    League.findById(registration.leagueId).select('name').lean(),
  ]);

  if (!player?.email?.trim() || !league) {
    return null;
  }

  return {
    registrationId: String(registration._id),
    leagueId: String(registration.leagueId),
    leagueName: league.name,
    recipientName: player.name,
    recipientEmail: player.email.trim(),
    entrantLabel: entrantLabelForRegistration(registration),
    status: registration.status,
  };
}

function nextStepForStatus(status: RegistrationStatus, leagueId: string): string {
  switch (status) {
    case 'pending_payment':
      return `Complete payment at ${resolveClientUrl()}/register/${leagueId}`;
    case 'pending_approval':
      return 'Your registration is in the queue — the manager will review it shortly.';
    case 'waitlisted':
      return 'You are on the waitlist. We will email you if a spot opens up.';
    case 'approved':
      return `You are confirmed for the season. View details at ${resolveClientUrl()}/captain/teams`;
    default:
      return 'Contact your league manager if you have questions.';
  }
}

export function registrationReceived(context: RegistrationEmailContext): RegistrationEmailNotification {
  return {
    template: 'registrationReceived',
    ...context,
    emailSubject: `Registration received — ${context.leagueName}`,
    emailBody: [
      `Hi ${context.recipientName},`,
      '',
      `We received your registration for ${context.leagueName} (${context.entrantLabel}).`,
      '',
      nextStepForStatus(context.status, context.leagueId),
      '',
      'Thanks for playing!',
    ].join('\n'),
    delivery: isTransactionalEmailConfigured() ? 'resend' : 'manual_copy',
    emailSent: false,
  };
}

export function registrationApproved(context: RegistrationEmailContext): RegistrationEmailNotification {
  return {
    template: 'registrationApproved',
    ...context,
    status: 'approved',
    emailSubject: `Registration approved — ${context.leagueName}`,
    emailBody: [
      `Hi ${context.recipientName},`,
      '',
      `Your registration for ${context.leagueName} (${context.entrantLabel}) has been approved.`,
      '',
      `View your team at ${resolveClientUrl()}/captain/teams`,
      '',
      'See you at the tavern!',
    ].join('\n'),
    delivery: isTransactionalEmailConfigured() ? 'resend' : 'manual_copy',
    emailSent: false,
  };
}

export function registrationRejected(
  context: RegistrationEmailContext,
  reason?: string
): RegistrationEmailNotification {
  const reasonLine = reason?.trim()
    ? `Reason: ${reason.trim()}`
    : 'Contact your league manager if you have questions.';

  return {
    template: 'registrationRejected',
    ...context,
    status: 'rejected',
    emailSubject: `Registration update — ${context.leagueName}`,
    emailBody: [
      `Hi ${context.recipientName},`,
      '',
      `Your registration for ${context.leagueName} (${context.entrantLabel}) was not approved.`,
      '',
      reasonLine,
    ].join('\n'),
    delivery: isTransactionalEmailConfigured() ? 'resend' : 'manual_copy',
    emailSent: false,
  };
}

export function paymentReceipt(
  context: RegistrationEmailContext,
  options: { amountCents: number; currency?: string; paidAt?: Date }
): RegistrationEmailNotification {
  const amountDisplay = formatEntryFeeDisplay(options.amountCents, options.currency ?? 'usd');
  const paidLine = options.paidAt
    ? `Paid on ${options.paidAt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : 'Payment received';

  return {
    template: 'paymentReceipt',
    ...context,
    emailSubject: `Payment receipt — ${context.leagueName}`,
    emailBody: [
      `Hi ${context.recipientName},`,
      '',
      `This confirms your entry fee for ${context.leagueName} (${context.entrantLabel}).`,
      '',
      `Amount: ${amountDisplay}`,
      paidLine,
      '',
      'Keep this email for your records.',
    ].join('\n'),
    delivery: isTransactionalEmailConfigured() ? 'resend' : 'manual_copy',
    emailSent: false,
  };
}

function buildNotification(
  context: RegistrationEmailContext,
  template: RegistrationEmailTemplate,
  options?: { reason?: string; amountCents?: number; currency?: string; paidAt?: Date }
): RegistrationEmailNotification {
  switch (template) {
    case 'registrationReceived':
      return registrationReceived(context);
    case 'registrationApproved':
      return registrationApproved(context);
    case 'registrationRejected':
      return registrationRejected(context, options?.reason);
    case 'paymentReceipt':
      if (options?.amountCents === undefined) {
        throw new Error('paymentReceipt requires amountCents');
      }

      return paymentReceipt(context, {
        amountCents: options.amountCents,
        currency: options.currency,
        paidAt: options.paidAt,
      });
    default:
      throw new Error(`Unknown registration email template: ${template satisfies never}`);
  }
}

async function sendViaResend(notification: RegistrationEmailNotification): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return false;
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || 'Tavern Base <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [notification.recipientEmail],
        subject: notification.emailSubject,
        text: notification.emailBody,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function logRegistrationEmailEvent(notification: RegistrationEmailNotification): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.info('[registration email]', {
    template: notification.template,
    registrationId: notification.registrationId,
    leagueId: notification.leagueId,
    delivery: notification.delivery,
    emailSent: notification.emailSent,
  });
}

export async function deliverRegistrationEmail(
  notification: RegistrationEmailNotification
): Promise<RegistrationEmailNotification> {
  if (notification.delivery === 'resend') {
    notification.emailSent = await sendViaResend(notification);
  }

  logRegistrationEmailEvent(notification);
  return notification;
}

export async function dispatchRegistrationEmail(
  registration: IRegistration,
  template: RegistrationEmailTemplate,
  options?: { reason?: string; amountCents?: number; currency?: string; paidAt?: Date }
): Promise<RegistrationEmailNotification | null> {
  const context = await loadRegistrationEmailContext(registration);

  if (!context) {
    return null;
  }

  if (template === 'paymentReceipt' && options?.amountCents === undefined) {
    const league = await League.findById(registration.leagueId).select('registration').lean();
    const settings = resolveLeagueRegistration(league?.registration);

    if (registration.paymentId) {
      const payment = await Payment.findById(registration.paymentId).select('amountCents paidAt').lean();

      if (payment) {
        options = {
          ...options,
          amountCents: payment.amountCents,
          currency: settings.currency,
          paidAt: payment.paidAt ?? options?.paidAt,
        };
      }
    }

    if (options?.amountCents === undefined) {
      options = {
        ...options,
        amountCents: settings.entryFeeCents ?? 0,
        currency: settings.currency,
      };
    }
  }

  const notification = buildNotification(context, template, options);
  return deliverRegistrationEmail(notification);
}

// Legacy aliases used during L12.4 — keep exports stable for any external imports
export const buildRegistrationApprovedNotification = registrationApproved;
export const buildRegistrationRejectedNotification = (
  options: RegistrationEmailContext & { reason?: string }
): RegistrationEmailNotification => registrationRejected(options, options.reason);

export const buildRegistrationPromotedNotification = (
  options: RegistrationEmailContext & { nextStatus: RegistrationStatus }
): RegistrationEmailNotification =>
  registrationReceived({ ...options, status: options.nextStatus });

export function logRegistrationNotification(notification: RegistrationEmailNotification): void {
  logRegistrationEmailEvent(notification);
}
