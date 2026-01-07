import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
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
import WatchPage from './pages/WatchPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';
import BrowsePage from './pages/BrowsePage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
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
                  <Route path="/watch/movie/:id" element={<WatchPage type="movie" />} />
                  <Route path="/watch/tv/:id" element={<WatchPage type="tv" />} />
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
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
