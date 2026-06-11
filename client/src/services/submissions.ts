import { API_BASE_URL } from '../config/api';

export const CONSENT_TEXT = `I took this photo (or have permission to share it), everyone pictured is okay with it being posted, and I give Barry O's permission to use it on their website and social media.`;

export const MAX_UPLOAD_BYTES = 8_000_000;

export async function postSubmission(formData: FormData): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/submissions`, {
    method: 'POST',
    body: formData,
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
      message = "You've sent a few photos recently — please wait a bit and try again.";
    }

    throw new Error(message);
  }
}
