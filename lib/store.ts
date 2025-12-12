import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CaseInformation,
  Assets,
  Transaction,
  AccountingSession,
} from '@/types';

// ============================================================================
// Store State
// ============================================================================

interface AccountingStore {
  // Session
  sessionId: string | null;
  status: 'DRAFT' | 'REVIEW' | 'COMPLETED';

  // Data
  caseInfo: Partial<CaseInformation>;
  assets: Assets;
  transactions: Transaction[];

  // UI State
  currentStep: number;

  // Actions
  setCaseInfo: (caseInfo: Partial<CaseInformation>) => void;
  updateCaseInfo: (updates: Partial<CaseInformation>) => void;

  setAssets: (assets: Assets) => void;
  updateAssets: (updates: Partial<Assets>) => void;

  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  setCurrentStep: (step: number) => void;
  setStatus: (status: 'DRAFT' | 'REVIEW' | 'COMPLETED') => void;

  initializeSession: () => void;
  resetSession: () => void;

  // Computed
  getSession: () => AccountingSession | null;
}

// ============================================================================
// Initial State
// ============================================================================

const initialAssets: Assets = {
  bankAccounts: [],
  realProperty: [],
  otherNonCashAssets: [],
};

// ============================================================================
// Store
// ============================================================================

export const useAccountingStore = create<AccountingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      status: 'DRAFT',
      caseInfo: {},
      assets: initialAssets,
      transactions: [],
      currentStep: 0,

      // Case Info Actions
      setCaseInfo: (caseInfo) =>
        set({ caseInfo }),

      updateCaseInfo: (updates) =>
        set((state) => ({
          caseInfo: { ...state.caseInfo, ...updates },
        })),

      // Assets Actions
      setAssets: (assets) =>
        set({ assets }),

      updateAssets: (updates) =>
        set((state) => ({
          assets: { ...state.assets, ...updates },
        })),

      // Transaction Actions
      setTransactions: (transactions) =>
        set({ transactions }),

      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [...state.transactions, transaction],
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      // UI Actions
      setCurrentStep: (step) =>
        set({ currentStep: step }),

      setStatus: (status) =>
        set({ status }),

      // Session Actions
      initializeSession: () => {
        const sessionId = `session-${Date.now()}`;
        set({ sessionId, status: 'DRAFT' });
      },

      resetSession: () =>
        set({
          sessionId: null,
          status: 'DRAFT',
          caseInfo: {},
          assets: initialAssets,
          transactions: [],
          currentStep: 0,
        }),

      // Computed
      getSession: () => {
        const state = get();

        if (!state.sessionId) {
          return null;
        }

        return {
          id: state.sessionId,
          caseInfo: state.caseInfo as CaseInformation,
          assets: state.assets,
          transactions: state.transactions,
          createdAt: new Date(), // Would be stored in real implementation
          updatedAt: new Date(),
          status: state.status,
        };
      },
    }),
    {
      name: 'accounting-session-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        status: state.status,
        caseInfo: state.caseInfo,
        assets: state.assets,
        transactions: state.transactions,
        currentStep: state.currentStep,
      }),
    }
  )
);
