import { describe, expect, it, vi } from 'vitest';
import {
  isTransactionalEmailConfigured,
  logRegistrationEmailEvent,
  paymentReceipt,
  registrationApproved,
  registrationReceived,
  registrationRejected,
} from '../../services/notifications/registrationEmail';

describe('registrationEmail notifications', () => {
  const context = {
    registrationId: '507f1f77bcf86cd799439011',
    leagueId: '507f1f77bcf86cd799439012',
    leagueName: '2026 Fall Pool',
    recipientName: 'Alex Captain',
    recipientEmail: 'alex@example.com',
    entrantLabel: 'Sharks',
    status: 'pending_approval' as const,
  };

  it('builds registration received email', () => {
    const notification = registrationReceived(context);

    expect(notification.template).toBe('registrationReceived');
    expect(notification.emailSubject).toContain('2026 Fall Pool');
    expect(notification.emailBody).toContain('Sharks');
    expect(notification.delivery).toBe('manual_copy');
  });

  it('builds registration approved email', () => {
    const notification = registrationApproved(context);

    expect(notification.template).toBe('registrationApproved');
    expect(notification.emailBody).toContain('approved');
  });

  it('builds registration rejected email with reason', () => {
    const notification = registrationRejected(context, 'Division full');

    expect(notification.template).toBe('registrationRejected');
    expect(notification.emailBody).toContain('Division full');
  });

  it('builds payment receipt with amount and league name', () => {
    const notification = paymentReceipt(context, {
      amountCents: 5000,
      currency: 'usd',
      paidAt: new Date('2026-06-15T18:30:00.000Z'),
    });

    expect(notification.template).toBe('paymentReceipt');
    expect(notification.emailSubject).toContain('2026 Fall Pool');
    expect(notification.emailBody).toContain('$50.00');
    expect(notification.emailBody).toContain('2026 Fall Pool');
  });

  it('defaults to manual copy when Resend is not configured', () => {
    expect(isTransactionalEmailConfigured()).toBe(false);
    expect(registrationApproved(context).delivery).toBe('manual_copy');
  });

  it('logs without recipient email', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const notification = registrationApproved(context);

    logRegistrationEmailEvent(notification);

    expect(infoSpy).toHaveBeenCalledWith(
      '[registration email]',
      expect.objectContaining({
        template: 'registrationApproved',
        registrationId: context.registrationId,
        leagueId: context.leagueId,
      })
    );

    const payload = infoSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('recipientEmail');
    expect(JSON.stringify(payload)).not.toContain('alex@example.com');

    infoSpy.mockRestore();
    process.env.NODE_ENV = previousNodeEnv;
  });
});
