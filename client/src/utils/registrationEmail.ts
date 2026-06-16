import type { RegistrationEmailNotification } from '../types/leagues';

type ToastFn = (message: string, type: 'success' | 'error') => void;

export async function handleRegistrationEmailNotification(
  notification: RegistrationEmailNotification | null | undefined,
  toast: ToastFn,
  actionLabel: string
): Promise<void> {
  if (!notification) {
    return;
  }

  if (notification.delivery === 'resend' && notification.emailSent) {
    toast(`${actionLabel} — email sent to registrant`, 'success');
    return;
  }

  try {
    await navigator.clipboard.writeText(notification.emailBody);
    toast(`${actionLabel} — email copied for ${notification.recipientEmail}`, 'success');
  } catch {
    toast(`${actionLabel} — email ready for ${notification.recipientEmail}`, 'success');
  }
}

export async function copyRegistrationEmailBody(
  notification: RegistrationEmailNotification,
  toast: ToastFn
): Promise<void> {
  try {
    await navigator.clipboard.writeText(notification.emailBody);
    toast(`Email copied for ${notification.recipientEmail}`, 'success');
  } catch {
    toast(`Copy failed — use the preview below`, 'error');
  }
}
