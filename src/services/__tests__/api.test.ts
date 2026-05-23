import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setAuthToken, getAuthToken, authApi, myListApi, checkBackendHealth } from '../api';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAuthToken(null);
  });

  describe('Token management', () => {
    it('should set and get auth token', () => {
      expect(getAuthToken()).toBeNull();
      setAuthToken('test-token-123');
      expect(getAuthToken()).toBe('test-token-123');
    });

    it('should persist token to localStorage', () => {
      setAuthToken('my-token');
      expect(localStorage.getItem('auth_token')).toBe('my-token');
    });

    it('should clear token from localStorage when set to null', () => {
      setAuthToken('my-token');
      setAuthToken(null);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const original = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('Storage full'); };
      expect(() => setAuthToken('token')).not.toThrow();
      localStorage.setItem = original;
    });
  });

  describe('apiRequest behavior', () => {
    it('should send JSON content-type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await authApi.getMe();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('should include credentials: include', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await authApi.getMe();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.credentials).toBe('include');
    });

    it('should add Authorization header when token is set', async () => {
      setAuthToken('my-bearer-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await authApi.getMe();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer my-bearer-token');
    });

    it('should not add Authorization header when no token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await authApi.getMe();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBeUndefined();
    });

    it('should prepend API_BASE_URL to endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await authApi.getMe();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/me');
    });
  });

  describe('Error handling', () => {
    it('should return error object on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: 'Unauthorized' }),
      });

      const result = await authApi.getMe();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should use generic HTTP error message when no error in body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const result = await authApi.getMe();
      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP error 500');
    });

    it('should return network error on fetch rejection', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await authApi.getMe();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });

    it('should return generic message for non-Error throws', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      const result = await authApi.getMe();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('authApi', () => {
    it('should call POST /auth/register with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { user: { id: '1' }, token: 'abc' } }),
      });

      await authApi.register('test@test.com', 'Pass1!', 'Test User');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/register');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.email).toBe('test@test.com');
      expect(body.name).toBe('Test User');
    });

    it('should call POST /auth/login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { user: {}, token: 'tok' } }),
      });

      await authApi.login('test@test.com', 'pass');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/login');
      expect(options.method).toBe('POST');
    });

    it('should call POST /auth/logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authApi.logout();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/logout');
      expect(options.method).toBe('POST');
    });

    it('should call PUT /auth/password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authApi.changePassword('oldPass1!', 'NewPass1!');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/password');
      expect(options.method).toBe('PUT');
    });
  });

  describe('myListApi', () => {
    it('should call GET /my-list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await myListApi.getMyList();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/my-list');
      expect(options.method).toBeUndefined(); // GET is default
    });

    it('should call POST /my-list/add', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: '1' } }),
      });

      const content = { id: 550, title: 'Fight Club' };
      await myListApi.addToList(content, 'movie');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/my-list/add');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.contentType).toBe('movie');
    });

    it('should call DELETE /my-list/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await myListApi.removeFromList('item-123');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/my-list/item-123');
      expect(options.method).toBe('DELETE');
    });
  });

  describe('checkBackendHealth', () => {
    it('should return true when health endpoint responds ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await checkBackendHealth();
      expect(result).toBe(true);
    });

    it('should return false when health endpoint fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await checkBackendHealth();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network down'));

      const result = await checkBackendHealth();
      expect(result).toBe(false);
    });
  });
});
