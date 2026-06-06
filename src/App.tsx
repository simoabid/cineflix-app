import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
import AccountPage from './pages/AccountPage';
import BrowsePage from './pages/BrowsePage';
import ContinueWatchingPage from './pages/ContinueWatchingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SmartPlayerProvider } from './contexts/SmartPlayerContext';
import { SmartPlayerModal } from './components/SmartPlayerModal';
import WatchRedirect from './pages/WatchRedirect';
import { CineProHealthService } from './services/cinepro-adapter';

function App() {
  useEffect(() => {
    CineProHealthService.start();
    return () => {
      CineProHealthService.stop();
    };
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <ToastProvider>
            <SmartPlayerProvider>
              <Router>
                <div className="min-h-screen bg-netflix-black">
                  <Navbar />
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
                      <Route path="/watch/movie/:id" element={<WatchRedirect type="movie" />} />
                      <Route path="/watch/tv/:id" element={<WatchRedirect type="tv" />} />
                      <Route path="/search" element={<SearchPage />} />

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
                      <Route path="/account" element={
                        <ProtectedRoute>
                          <AccountPage />
                        </ProtectedRoute>
                      } />

                      {/* Fallback */}
                      <Route path="*" element={<HomePage />} />
                    </Routes>
                  </main>
                  <Footer />
                  <SmartPlayerModal />
                </div>
              </Router>
            </SmartPlayerProvider>
          </ToastProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
