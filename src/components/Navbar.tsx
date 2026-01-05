import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  User,
  ChevronDown,
  Home,
  Film,
  Tv,
  Star,
  TrendingUp,
  Bookmark,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Maximize,
  Minimize,
  LayoutGrid,
  Heart
} from 'lucide-react';
import SearchModal from './SearchModal';
import { useAuth } from '../contexts/AuthContext';
import SignUpPromoBubble from './SignUpPromoBubble';
import { renderAvatarById } from '../constants/avatars';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Auth context
  const { user, isAuthenticated, logout } = useAuth();

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchModalOpen(true);
      }
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      }
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleOpenSearchModal = () => {
      setIsSearchModalOpen(true);
    };

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('open-search-modal', handleOpenSearchModal);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('open-search-modal', handleOpenSearchModal);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const notifications = [
    { id: 1, title: 'New Marvel movie added', time: '2 min ago', type: 'new' },
    { id: 2, title: 'Your watchlist updated', time: '1 hour ago', type: 'update' },
    { id: 3, title: 'New season available', time: '3 hours ago', type: 'new' },
  ];

  const navigationItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Movies', path: '/movies', icon: Film },
    { name: 'TV Shows', path: '/tv-shows', icon: Tv },
    { name: 'Collections', path: '/collections', icon: Star },
    { name: 'New & Popular', path: '/new-popular', icon: TrendingUp },
    { name: 'Browse', path: '/browse', icon: LayoutGrid },
    { name: 'My List', path: '/my-list', icon: Bookmark },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
          ? 'bg-black/20 backdrop-blur-xl border-b border-white/10 shadow-2xl'
          : 'bg-black/10 backdrop-blur-md'
          }`}
      >
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4 sm:space-x-8">
              <Link
                to="/"
                className="flex-shrink-0 transition-all duration-300 hover:scale-105 group"
              >
                <img
                  src={`${import.meta.env.BASE_URL}cineflix-logo.png`}
                  alt="CineFlix"
                  className="h-14 sm:h-28 lg:h-36 w-auto"
                />
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center space-x-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative group ${location.pathname === item.path
                        ? 'text-white bg-netflix-red shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Search */}
              <div ref={searchRef} className="relative">
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="lg:hidden flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-black/30 backdrop-blur-md rounded-full transition-all duration-300 border border-white/20 hover:border-netflix-red/50 hover:bg-black/50 hover:scale-110 group relative"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:text-netflix-red transition-colors" />
                </button>

                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="hidden lg:flex items-center bg-black/20 backdrop-blur-md rounded-xl transition-all duration-300 border border-white/20 hover:border-netflix-red/50 hover:bg-black/30 group"
                >
                  <Search className="w-5 h-5 text-gray-400 ml-3 group-hover:text-white transition-colors" />
                  <span className="text-gray-400 px-3 py-3 group-hover:text-white transition-colors text-sm">
                    Search movies, TV shows...
                  </span>
                  <kbd className="flex items-center space-x-1 bg-gray-700/50 text-gray-400 text-xs px-2 py-1 rounded mr-3 group-hover:bg-gray-600/50 group-hover:text-gray-300 transition-colors">
                    <span>⌘</span>
                    <span>K</span>
                  </kbd>
                </button>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
                title="Toggle theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="hidden sm:block p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
                title={isFullscreen ? "Exit fullscreen (F11)" : "Enter fullscreen (F11)"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>

              {/* Notifications - Only show when authenticated */}
              {isAuthenticated && (
                <div ref={notificationsRef} className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-netflix-red rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{notifications.length}</span>
                    </span>
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#13132B]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-700/50">
                        <h3 className="text-white font-semibold">Notifications</h3>
                      </div>
                      {notifications.map((notification) => (
                        <div key={notification.id} className="px-4 py-3 hover:bg-gray-700/50 transition-colors">
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${notification.type === 'new' ? 'bg-green-500' : 'bg-blue-500'
                              }`}></div>
                            <div className="flex-1">
                              <p className="text-sm text-white">{notification.title}</p>
                              <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User Profile / Sign In */}
              {isAuthenticated ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ring-2 ring-gray-700/50 overflow-hidden">
                      {user?.avatar ? (
                        renderAvatarById(user.avatar, "w-full h-full")
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-netflix-red via-red-600 to-red-700 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-200">Account</span>
                    <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-300 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-[#13132B] backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 py-2 z-50 transform origin-top-right transition-all duration-200 animate-scale-in">
                      {/* User Info */}
                      <div className="px-5 py-4 border-b border-gray-800/50">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg ring-2 ring-black/50 overflow-hidden">
                            {user?.avatar ? (
                              renderAvatarById(user.avatar, "w-full h-full")
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-netflix-red via-red-600 to-red-700 flex items-center justify-center">
                                <span className="text-white text-lg font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-base truncate">{user?.name}</p>
                            <p className="text-gray-400 text-xs truncate mt-0.5">{user?.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2 px-2 space-y-0.5">
                        <Link
                          to="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 group"
                        >
                          <User className="w-4 h-4 text-gray-400 group-hover:text-netflix-red transition-colors" />
                          <span className="font-medium">My Profile</span>
                        </Link>
                        <Link
                          to="/my-list"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 group"
                        >
                          <Heart className="w-4 h-4 text-gray-400 group-hover:text-netflix-red transition-colors" />
                          <span className="font-medium">My List</span>
                        </Link>
                        <Link
                          to="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 group"
                        >
                          <Settings className="w-4 h-4 text-gray-400 group-hover:text-netflix-red transition-colors" />
                          <span className="font-medium">Account Settings</span>
                        </Link>
                      </div>

                      {/* Footer Actions */}
                      <div className="border-t border-gray-800/50 py-2 px-2 mt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 group"
                        >
                          <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                          <span className="font-medium group-hover:text-red-400 transition-colors">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Link
                    to="/signup"
                    className="spectrum-animated-wrapper"
                  >
                    <div className="spectrum-btn-inner px-3 sm:px-4 py-2 space-x-2">
                      <User className="w-4 h-4 text-white" />
                      <span className="hidden sm:inline text-white font-medium text-sm">Sign Up</span>
                    </div>
                  </Link>
                  <SignUpPromoBubble />
                </div>
              )}
            </div>
          </div>
        </div >
      </nav >

      {/* Mobile Menu */}
      {
        mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" ref={mobileMenuRef}>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="fixed top-14 sm:top-16 left-0 right-0 bg-black/20 backdrop-blur-xl border-b border-white/10 shadow-2xl">
              <div className="p-4 sm:p-6 space-y-3">
                {/* Mobile Search */}
                <div className="mb-4 p-4 bg-gradient-to-r from-netflix-red/10 to-red-600/5 rounded-xl border border-netflix-red/20">
                  <button
                    onClick={() => {
                      setIsSearchModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center space-x-3 w-full px-6 py-4 text-base font-medium bg-netflix-red/20 hover:bg-netflix-red/30 text-white border border-netflix-red/40 hover:border-netflix-red/60 rounded-xl transition-all duration-300"
                  >
                    <Search className="w-6 h-6 text-netflix-red" />
                    <span>Search Movies & TV Shows</span>
                  </button>
                </div>

                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${location.pathname === item.path
                        ? 'text-white bg-netflix-red shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {/* Mobile Auth Actions */}
                <div className="pt-4 border-t border-gray-700/50 mt-4">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Settings className="w-5 h-5" />
                        <span>Account Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-white bg-netflix-red hover:bg-red-700 rounded-lg transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span>Sign Up</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    </>
  );
};

export default Navbar;
