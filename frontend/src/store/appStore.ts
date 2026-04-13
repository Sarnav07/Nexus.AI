import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────────────────────────
export type OrchestratorStatus = 'online' | 'degraded' | 'offline';

export interface RiskParams {
  maxDrawdownBps: number;      // e.g. 1000 = 10%
  maxPositionSizeBps: number;  // e.g. 500 = 5%
  isPaused: boolean;
}

export type ModalMode = 'deposit' | 'withdraw' | null;

// ── Store Interface ───────────────────────────────────────────────────────────
interface AppStore {
  // ── Orchestrator Health ───────────────────────────────────────────────────
  orchestratorStatus: OrchestratorStatus;
  setOrchestratorStatus: (status: OrchestratorStatus) => void;

  // ── Vault Risk Params (global, cached from contract) ─────────────────────
  // Stored here so every component can read without re-querying the chain
  riskParams: RiskParams | null;
  setRiskParams: (params: RiskParams | null) => void;

  // ── Modal State ───────────────────────────────────────────────────────────
  activeModal: ModalMode;
  setModal: (mode: ModalMode) => void;

  // ── Signal Feed (total count, for dashboard counter) ─────────────────────
  totalSignals: number;
  setTotalSignals: (count: number) => void;
}

// ── Zustand Store ─────────────────────────────────────────────────────────────
export const useAppStore = create<AppStore>((set) => ({
  // Orchestrator Health
  orchestratorStatus: 'offline',
  setOrchestratorStatus: (status) => set({ orchestratorStatus: status }),

  // Risk Params
  riskParams: null,
  setRiskParams: (params) => set({ riskParams: params }),

  // Modal
  activeModal: null,
  setModal: (mode) => set({ activeModal: mode }),

  // Signals
  totalSignals: 0,
  setTotalSignals: (count) => set({ totalSignals: count }),
}));

// ── Convenience selectors ─────────────────────────────────────────────────────
export const useIsPaused = () => useAppStore((s) => s.riskParams?.isPaused ?? false);
export const useIsOrchestratorOnline = () =>
  useAppStore((s) => s.orchestratorStatus === 'online');
