import { checkCineProHealth } from './client';
import { useCineProStore } from '@/stores/cinepro';

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
let consecutiveFailures: number = 0;
const MAX_FAILURES: number = 3;

async function performHealthCheck(): Promise<boolean> {
  const store = useCineProStore.getState();
  if (!store.isEnabled) {
    return false;
  }
  const isHealthy = await checkCineProHealth(store.serverUrl);
  if (isHealthy) {
    consecutiveFailures = 0;
    if (store.connectionStatus !== 'connected') {
      useCineProStore.setState({ connectionStatus: 'connected' });
      store.loadProviders().catch((err: unknown) => {
        if (import.meta.env.DEV) {
          console.warn('[CinePro Health] Failed to reload providers:', err);
        }
      });
    }
  } else {
    consecutiveFailures += 1;
    if (consecutiveFailures >= MAX_FAILURES) {
      if (store.connectionStatus !== 'disconnected') {
        useCineProStore.setState({ connectionStatus: 'disconnected' });
      }
    }
  }
  return isHealthy;
}

function start(intervalMs: number = 60000): void {
  if (healthCheckInterval) {
    return;
  }
  void performHealthCheck();
  healthCheckInterval = setInterval(() => {
    void performHealthCheck();
  }, intervalMs);
}

function stop(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

/**
 * Resets the consecutive failure counter.
 * Call this when the server URL changes to avoid stale state
 * from the previous server carrying over.
 */
function resetFailureCount(): void {
  consecutiveFailures = 0;
}

export const CineProHealthService = {
  start,
  stop,
  performHealthCheck,
  resetFailureCount,
};

// Prevent setInterval leak during Vite HMR reloads
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stop();
  });
}

