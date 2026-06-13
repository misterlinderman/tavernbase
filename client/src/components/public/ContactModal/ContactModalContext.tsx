import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface ContactModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const ContactModalContext = createContext<ContactModalContextValue | null>(null);

export function ContactModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleHash = (): void => {
      if (window.location.hash !== '#contact') return;

      open();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [open]);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
    }),
    [close, isOpen, open],
  );

  return <ContactModalContext.Provider value={value}>{children}</ContactModalContext.Provider>;
}

export function useContactModal(): ContactModalContextValue {
  const context = useContext(ContactModalContext);

  if (!context) {
    throw new Error('useContactModal must be used within ContactModalProvider');
  }

  return context;
}

export interface ContactLinkProps {
  children: ReactNode;
  className?: string;
}

export function ContactLink({ children, className }: ContactLinkProps) {
  const { open } = useContactModal();

  return (
    <a
      href="#contact"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        open();
      }}
    >
      {children}
    </a>
  );
}
