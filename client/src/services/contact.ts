import { API_BASE_URL } from '../config/api';

export const MESSAGE_MAX = 1000;

export interface ContactPayload {
  email: string;
  phone: string;
  message: string;
}

export async function postContactMessage(payload: ContactPayload): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = 'Something went wrong — please try again.';

    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) {
        message = json.error;
      }
    } catch {
      const text = await res.text();
      if (text) {
        message = text;
      }
    }

    if (res.status === 429) {
      message = "You've sent a few messages recently — please wait a bit and try again.";
    }

    throw new Error(message);
  }
}
