import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { SupportBanner } from './components/SupportBanner';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import Movies from './pages/Movies';
import TVShows from './pages/TVShows';
import SearchPage from './pages/SearchPage';
import NewPopularPage from './pages/NewPopularPage';
import MyListPage from './pages/MyListPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SettingsPage from './pages/SettingsPage';
import BrowsePage from './pages/BrowsePage';
import ContinueWatchingPage from './pages/ContinueWatchingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SmartPlayerProvider } from './contexts/SmartPlayerContext';
import { SmartPlayerPage } from './pages/SmartPlayerPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import SupportPage from './pages/legal/SupportPage';
import { CineProHealthService } from './services/cinepro-adapter';
import { LenisProvider } from './components/layout/LenisProvider';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { usePageTracking } from './hooks/usePageTracking';
import { ThemeProvider } from './stores/theme';

import { useServiceWorker } from './hooks/useServiceWorker';

function AnalyticsTracker(): null {
  usePageTracking();
  return null;
}

/** Legacy `/account` → `/settings`, keeping query + hash (e.g. #appearance). */
function AccountToSettingsRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: '/settings', search, hash }} replace />;
}

function App() {
  useServiceWorker();
  useEffect(() => {
    CineProHealthService.start();
    return () => {
      CineProHealthService.stop();
    };
  }, []);
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider applyGlobal>
          <AuthProvider>
            <ToastProvider>
              <Router>
                <LenisProvider>
                  <ScrollToTop />
                  <AnalyticsTracker />
                  <SmartPlayerProvider>
                    <div className="min-h-screen bg-background-main">
                      <Navbar />
                      <SupportBanner />
                      <main>
                        <Routes>
                          {/* Public Routes */}
                          <Route path="/" element={<HomePage />} />
                          <Route path="/new-popular" element={<NewPopularPage />} />
                          <Route path="/movies" element={<Movies />} />
                          <Route path="/browse" element={<BrowsePage />} />
                          <Route path="/tv-shows" element={<TVShows />} />
                          <Route path="/collections" element={<CollectionsPage />} />
                          <Route path="/collection/:id" element={<CollectionDetailPage />} />
                          <Route path="/movie/:id" element={<DetailPage type="movie" />} />
                          <Route path="/tv/:id" element={<DetailPage type="tv" />} />
                          <Route path="/watch/movie/:id" element={<SmartPlayerPage type="movie" />} />
                          <Route path="/watch/tv/:id" element={<SmartPlayerPage type="tv" />} />
                          <Route path="/search" element={<SearchPage />} />

                          {/* Legal & support (Phase 0 monetization pre-flight) */}
                          <Route path="/privacy" element={<PrivacyPage />} />
                          <Route path="/settings/privacy" element={<PrivacyPage />} />
                          <Route path="/cookies" element={<PrivacyPage />} />
                          <Route path="/terms" element={<TermsPage />} />
                          <Route path="/legal" element={<TermsPage />} />
                          <Route path="/support" element={<SupportPage />} />

                          {/* Auth Routes */}
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/signup" element={<SignupPage />} />

                          {/* Protected Routes */}
                          <Route path="/my-list" element={
                            <ProtectedRoute>
                              <MyListPage />
                            </ProtectedRoute>
                          } />
                          <Route path="/continue-watching" element={
                            <ProtectedRoute>
                              <ContinueWatchingPage />
                            </ProtectedRoute>
                          } />
                          {/* Public settings (profile section gated inside page) */}
                          <Route path="/settings" element={<SettingsPage />} />
                          {/* Legacy account URL → settings (preserve hash via client location) */}
                          <Route path="/account" element={<AccountToSettingsRedirect />} />

                          {/* Fallback */}
                          <Route path="*" element={<HomePage />} />
                        </Routes>
                      </main>
                      <Footer />
                    </div>
                  </SmartPlayerProvider>
                </LenisProvider>
              </Router>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
