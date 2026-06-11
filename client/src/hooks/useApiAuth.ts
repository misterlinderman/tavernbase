import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api, { setAuthToken } from '../services/api';

/**
 * Hook to automatically add Auth0 token to API requests
 * Call this once in a high-level component to set up token handling
 */
export function useApiAuth() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const setupToken = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          setAuthToken(token);
        } catch (error) {
          console.error('Error getting access token:', error);
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }
    };

    setupToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  return api;
}

export default useApiAuth;
