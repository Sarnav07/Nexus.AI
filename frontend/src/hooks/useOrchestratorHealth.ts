import { useEffect } from 'react';
import { ORCHESTRATOR_URL } from '@/lib/contracts';
import { useAppStore } from '@/store/appStore';

const HEALTH_POLL_INTERVAL_MS = 15_000; // 15 seconds

/**
 * useOrchestratorHealth
 * Polls GET /api/health every 15s and updates the Zustand orchestratorStatus.
 * Must be mounted once at the app root level (inside App.tsx or a top-level layout).
 *
 * Status mapping:
 *   200 ok  → 'online'
 *   non-200 → 'degraded'
 *   network error / timeout → 'offline'
 */
export function useOrchestratorHealth() {
  const setStatus = useAppStore((s) => s.setOrchestratorStatus);

  useEffect(() => {
    async function checkHealth() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(`${ORCHESTRATOR_URL}/api/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          setStatus('online');
        } else {
          setStatus('degraded');
        }
      } catch {
        setStatus('offline');
      }
    }

    // Run immediately on mount
    checkHealth();

    // Then poll on interval
    const interval = setInterval(checkHealth, HEALTH_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [setStatus]);
}
