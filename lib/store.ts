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

  // Calculate beginning balances for non-first accounts
  calculateBeginningBalances: () => { cash: number; nonCash: number };
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
      setTransactions: (transactions) => {
        set({ transactions });
        // Auto-save to database
        if (typeof window !== 'undefined') {
          fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions }),
          }).catch(err => console.error('[Store] Failed to save transactions:', err));
        }
      },

      addTransaction: (transaction) => {
        set((state) => {
          const newTransactions = [...state.transactions, transaction];
          // Auto-save to database
          if (typeof window !== 'undefined') {
            fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactions: newTransactions }),
            }).catch(err => console.error('[Store] Failed to save transactions:', err));
          }
          return { transactions: newTransactions };
        });
      },

      updateTransaction: (id, updates) => {
        set((state) => {
          const newTransactions = state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          );
          // Auto-save to database
          if (typeof window !== 'undefined') {
            fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactions: newTransactions }),
            }).catch(err => console.error('[Store] Failed to save transactions:', err));
          }
          return { transactions: newTransactions };
        });
      },

      deleteTransaction: (id) => {
        set((state) => {
          const newTransactions = state.transactions.filter((t) => t.id !== id);
          // Auto-save to database
          if (typeof window !== 'undefined') {
            fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactions: newTransactions }),
            }).catch(err => console.error('[Store] Failed to save transactions:', err));
          }
          return { transactions: newTransactions };
        });
      },

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

      // Calculate beginning balances for non-first accounts
      // Formula: Beginning = Ending Cash + Ending Non-Cash + Disbursements - Receipts
      calculateBeginningBalances: () => {
        const state = get();
        const { assets, transactions } = state;

        const endingCash = assets.endingCashBalance || 0;
        const endingNonCash = assets.endingNonCashBalance || 0;

        // Calculate total receipts and disbursements
        const receipts = transactions
          .filter(t => t.type === 'RECEIPT')
          .reduce((sum, t) => sum + t.amount, 0);

        const disbursements = transactions
          .filter(t => t.type === 'DISBURSEMENT')
          .reduce((sum, t) => sum + t.amount, 0);

        // Calculate beginning cash balance
        // Beginning = Ending + Disbursements - Receipts
        const beginningCash = endingCash + disbursements - receipts;

        // Beginning non-cash defaults to same as ending (unless property was sold/bought)
        const beginningNonCash = endingNonCash;

        return {
          cash: beginningCash,
          nonCash: beginningNonCash,
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
