import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../services/analytics';

function derivePageTitle(pathname: string): string {
  const routes: Record<string, string> = {
    '/': 'Home',
    '/movies': 'Movies',
    '/tv-shows': 'TV Shows',
    '/search': 'Search',
    '/new-popular': 'New & Popular',
    '/browse': 'Browse',
    '/collections': 'Collections',
    '/my-list': 'My List',
    '/continue-watching': 'Continue Watching',
    '/account': 'Account',
    '/login': 'Login',
    '/signup': 'Sign Up',
    '/privacy': 'Privacy Policy',
    '/settings/privacy': 'Privacy Policy',
    '/cookies': 'Privacy Policy',
    '/terms': 'Terms of Service',
    '/legal': 'Terms of Service',
    '/support': 'Support',
  };
  if (routes[pathname]) {
    return routes[pathname];
  }
  if (pathname.startsWith('/movie/')) {
    return 'Movie Detail';
  }
  if (pathname.startsWith('/tv/')) {
    return 'TV Show Detail';
  }
  if (pathname.startsWith('/watch/')) {
    return 'Watch';
  }
  if (pathname.startsWith('/collection/')) {
    return 'Collection Detail';
  }
  return 'CINEFLIX';
}

export function usePageTracking(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const title = derivePageTitle(pathname);
    analytics.trackPageView(pathname, title);
  }, [pathname]);
}
