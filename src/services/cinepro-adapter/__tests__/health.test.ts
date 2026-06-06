import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CineProHealthService } from '../health';
import { checkCineProHealth } from '../client';
import { useCineProStore } from '@/stores/cinepro';

vi.mock('../client', () => ({
  checkCineProHealth: vi.fn(),
  fetchCineProProviders: vi.fn(() => Promise.resolve([])),
}));

describe('CinePro Health Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCineProStore.setState({
      isEnabled: true,
      connectionStatus: 'disconnected',
      availableProviders: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    CineProHealthService.stop();
    vi.restoreAllMocks();
  });

  it('should transition status to connected if health check is successful', async () => {
    const mockHealthCheck = vi.mocked(checkCineProHealth);
    mockHealthCheck.mockResolvedValue(true);
    const isHealthy = await CineProHealthService.performHealthCheck();
    expect(isHealthy).toBe(true);
    expect(useCineProStore.getState().connectionStatus).toBe('connected');
  });

  it('should transition status to disconnected after multiple failed checks', async () => {
    const mockHealthCheck = vi.mocked(checkCineProHealth);
    mockHealthCheck.mockResolvedValue(false);
    useCineProStore.setState({ connectionStatus: 'connected' });
    await CineProHealthService.performHealthCheck();
    expect(useCineProStore.getState().connectionStatus).toBe('connected');
    await CineProHealthService.performHealthCheck();
    expect(useCineProStore.getState().connectionStatus).toBe('connected');
    await CineProHealthService.performHealthCheck();
    expect(useCineProStore.getState().connectionStatus).toBe('disconnected');
  });
});
