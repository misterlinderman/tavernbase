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
import CalendarPage from './pages/public/CalendarPage';
import LoginPage from './pages/admin/LoginPage';
import OverviewPage from './pages/admin/OverviewPage';
import SubmissionsPage from './pages/admin/SubmissionsPage';
import EventsPage from './pages/admin/EventsPage';
import AnnouncementPage from './pages/admin/AnnouncementPage';
import ChristmasPage from './pages/admin/ChristmasPage';
import HoursPage from './pages/admin/HoursPage';
import MediaPage from './pages/admin/MediaPage';
import AdminLeaguesPage from './pages/admin/LeaguesPage';
import LeagueDetailPage from './pages/admin/LeagueDetailPage';
import LeaguesPage from './pages/public/LeaguesPage';
import LeaguePublicPage from './pages/public/LeaguePublicPage';
import CaptainLayout from './components/captain/CaptainLayout';
import CaptainLoginPage from './pages/captain/CaptainLoginPage';
import CaptainPage from './pages/captain/CaptainPage';
import PlayerLayout from './components/player/PlayerLayout';
import PlayerLoginPage from './pages/player/PlayerLoginPage';
import PlayerPage from './pages/player/PlayerPage';
import PlayerScoresPage from './pages/player/PlayerScoresPage';
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
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/:leagueId" element={<LeaguePublicPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/captain/login" element={<CaptainLoginPage />} />
          <Route path="/captain" element={<CaptainLayout />}>
            <Route index element={<CaptainPage />} />
          </Route>
          <Route path="/player/login" element={<PlayerLoginPage />} />
          <Route path="/player" element={<PlayerLayout />}>
            <Route index element={<PlayerPage />} />
            <Route path="scores" element={<PlayerScoresPage />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="announcement" element={<AnnouncementPage />} />
            <Route path="christmas" element={<ChristmasPage />} />
            <Route path="hours" element={<HoursPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="leagues" element={<AdminLeaguesPage />} />
            <Route path="leagues/:leagueId" element={<LeagueDetailPage />} />
          </Route>
        </Routes>
        <PublicContactModal />
        <PublicEasterEgg />
      </ContactModalProvider>
    </ToastProvider>
  );
}

export default App;
