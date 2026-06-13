import { useLocation } from 'react-router-dom';
import ContactModal from '../ContactModal';
import { useContactModal } from '../ContactModal/ContactModalContext';
import { useSiteSettings } from '../../../hooks/useSiteSettings';

function PublicContactModal() {
  const { pathname } = useLocation();
  const isPublicRoute = !pathname.startsWith('/admin');
  const { isOpen, close } = useContactModal();
  const { settings } = useSiteSettings();

  if (!isPublicRoute || !settings) return null;

  return (
    <ContactModal
      isOpen={isOpen}
      onClose={close}
      contact={settings.contact}
      hours={settings.hours}
    />
  );
}

export default PublicContactModal;
