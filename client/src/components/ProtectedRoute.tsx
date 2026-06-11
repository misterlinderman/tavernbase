import { ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Loading from './Loading';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    loginWithRedirect();
    return <Loading />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
