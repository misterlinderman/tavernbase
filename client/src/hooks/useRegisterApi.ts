import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

export function useRegisterApi() {
  const { getAccessTokenSilently } = useAuth0();

  const registerFetch = useCallback(
    async <T>(path: string, options?: RequestInit): Promise<T> => {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      });

      if (!res.ok) {
        const body = await res.text();
        let message = body;

        try {
          const parsed = JSON.parse(body) as { error?: string };
          message = parsed.error ?? body;
        } catch {
          // use raw body
        }

        throw new Error(message || 'Request failed');
      }

      const json = await res.json();
      return json.data as T;
    },
    [getAccessTokenSilently]
  );

  return { registerFetch };
}
