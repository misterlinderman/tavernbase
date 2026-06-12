import { useLocation } from 'react-router-dom';
import { useAskEasterEgg } from '../../../hooks/useAskEasterEgg';
import { useSiteSettings } from '../../../hooks/useSiteSettings';
import AskModal from '../AskModal';

function PublicEasterEgg() {
  const { pathname } = useLocation();
  const isPublicRoute = !pathname.startsWith('/admin');
  const { isOpen, close } = useAskEasterEgg(isPublicRoute);
  const { settings } = useSiteSettings();

  if (!isPublicRoute) return null;

  return <AskModal isOpen={isOpen} onClose={close} contact={settings?.contact} />;
}

export default PublicEasterEgg;
