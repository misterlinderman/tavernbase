import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import AdminLayout from './components/admin/AdminLayout';
import { ToastProvider } from './components/admin/shared/Toast';
import Loading from './components/Loading';
import { useApiAuth } from './hooks/useApiAuth';
import HomePage from './pages/public/HomePage';
import SubmitPage from './pages/public/SubmitPage';
import ThankYouPage from './pages/public/ThankYouPage';
import CalendarPage from './pages/public/CalendarPage';
import LoginPage from './pages/admin/LoginPage';
import OverviewPage from './pages/admin/OverviewPage';
import SubmissionsPage from './pages/admin/SubmissionsPage';
import EventsPage from './pages/admin/EventsPage';
import AnnouncementPage from './pages/admin/AnnouncementPage';
import FeaturedBannerPage from './pages/admin/FeaturedBannerPage';
import HoursPage from './pages/admin/HoursPage';
import MediaPage from './pages/admin/MediaPage';
import AdminLeaguesPage from './pages/admin/LeaguesPage';
import LeaguePeoplePage from './pages/admin/LeaguePeoplePage';
import RegistrationQueuePage from './pages/admin/RegistrationQueuePage';
import LeagueDetailPage from './pages/admin/LeagueDetailPage';
import LeaguesPage from './pages/public/LeaguesPage';
import LeaguePublicPage from './pages/public/LeaguePublicPage';
import RegisterPage from './pages/public/RegisterPage';
import RegisterLeaguePage from './pages/public/RegisterLeaguePage';
import RegisterTeamPage from './pages/public/RegisterTeamPage';
import RegisterPlayerPage from './pages/public/RegisterPlayerPage';
import RegisterPaymentSuccessPage from './pages/public/RegisterPaymentSuccessPage';
import RegisterPaymentCancelPage from './pages/public/RegisterPaymentCancelPage';
import CaptainLayout from './components/captain/CaptainLayout';
import CaptainLoginPage from './pages/captain/CaptainLoginPage';
import CaptainPage from './pages/captain/CaptainPage';
import CaptainTeamsPage from './pages/captain/CaptainTeamsPage';
import CaptainRosterPage from './pages/captain/CaptainRosterPage';
import CaptainReturningRegisterPage from './pages/captain/CaptainReturningRegisterPage';
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
          <Route path="/christmas-party" element={<Navigate to="/" replace />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/:leagueId" element={<LeaguePublicPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/payment/success" element={<RegisterPaymentSuccessPage />} />
          <Route path="/register/payment/cancel" element={<RegisterPaymentCancelPage />} />
          <Route path="/register/:leagueId" element={<RegisterLeaguePage />} />
          <Route path="/register/:leagueId/team" element={<RegisterTeamPage />} />
          <Route path="/register/:leagueId/player" element={<RegisterPlayerPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/captain/login" element={<CaptainLoginPage />} />
          <Route path="/captain" element={<CaptainLayout />}>
            <Route index element={<CaptainPage />} />
            <Route path="teams" element={<CaptainTeamsPage />} />
            <Route path="teams/:teamId/roster" element={<CaptainRosterPage />} />
            <Route
              path="register/:targetLeagueId/:priorTeamId"
              element={<CaptainReturningRegisterPage />}
            />
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
            <Route path="featured-banner" element={<FeaturedBannerPage />} />
            <Route path="christmas" element={<Navigate to="/admin/featured-banner" replace />} />
            <Route path="hours" element={<HoursPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="leagues" element={<AdminLeaguesPage />} />
            <Route path="leagues/registrations" element={<RegistrationQueuePage />} />
            <Route path="leagues/people" element={<LeaguePeoplePage />} />
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
