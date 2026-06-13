import { Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import AdminLayout from './components/admin/AdminLayout';
import { ToastProvider } from './components/admin/shared/Toast';
import Loading from './components/Loading';
import { useApiAuth } from './hooks/useApiAuth';
import HomePage from './pages/public/HomePage';
import SubmitPage from './pages/public/SubmitPage';
import ThankYouPage from './pages/public/ThankYouPage';
import ChristmasTicketsPage from './pages/public/ChristmasTicketsPage';
import LoginPage from './pages/admin/LoginPage';
import OverviewPage from './pages/admin/OverviewPage';
import SubmissionsPage from './pages/admin/SubmissionsPage';
import EventsPage from './pages/admin/EventsPage';
import AnnouncementPage from './pages/admin/AnnouncementPage';
import ChristmasPage from './pages/admin/ChristmasPage';
import HoursPage from './pages/admin/HoursPage';
import MediaPage from './pages/admin/MediaPage';
import { ContactModalProvider } from './components/public/ContactModal/ContactModalContext';
import PublicContactModal from './components/public/PublicContactModal';
import PublicEasterEgg from './components/public/PublicEasterEgg';

function App() {
  const { isLoading } = useAuth0();

  useApiAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <ToastProvider>
      <ContactModalProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/christmas-party" element={<ChristmasTicketsPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="announcement" element={<AnnouncementPage />} />
            <Route path="christmas" element={<ChristmasPage />} />
            <Route path="hours" element={<HoursPage />} />
            <Route path="media" element={<MediaPage />} />
          </Route>
        </Routes>
        <PublicContactModal />
        <PublicEasterEgg />
      </ContactModalProvider>
    </ToastProvider>
  );
}

export default App;
