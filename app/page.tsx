'use client';

import { useEffect } from 'react';
import { useAccountingStore } from '@/lib/store';
import { WorkflowStepper } from '@/components/WorkflowStepper';
import { CaseInformationForm } from '@/components/CaseInformationForm';
import { AssetManagement } from '@/components/AssetManagement';
import { FileUpload } from '@/components/FileUpload';
import { TransactionReview } from '@/components/TransactionReview';
import { SummaryDashboard } from '@/components/SummaryDashboard';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { currentStep, setCurrentStep, initializeSession, resetSession, setTransactions } = useAccountingStore();

  useEffect(() => {
    initializeSession();

    // Load transactions from database on startup
    const loadFromDatabase = async () => {
      try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
          const data = await response.json();
          if (data.transactions && data.transactions.length > 0) {
            // Convert date strings back to Date objects
            const transactions = data.transactions.map((t: any) => ({
              ...t,
              date: new Date(t.date),
            }));
            setTransactions(transactions);
            console.log(`[App] Loaded ${transactions.length} transactions from database`);
          }
        }
      } catch (error) {
        console.error('[App] Failed to load transactions from database:', error);
      }
    };

    loadFromDatabase();
  }, [initializeSession, setTransactions]);

  const goToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const goToPreviousStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const resetWorkflow = () => {
    const confirmMessage =
      'Are you sure you want to start over?\n\n' +
      'This will permanently delete:\n' +
      '• All case information\n' +
      '• All assets and balances\n' +
      '• All uploaded transactions\n' +
      '• All categorizations and reviews\n\n' +
      'This action cannot be undone.';

    if (confirm(confirmMessage)) {
      try {
        // Clear the Zustand persisted store
        resetSession();

        // Also clear localStorage to ensure complete reset
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accounting-session-storage');
        }

        // Reinitialize the session
        initializeSession();

        // Force navigation to step 0
        setCurrentStep(0);

        // Show success message
        alert('All data has been cleared. Starting fresh!');
      } catch (error) {
        console.error('Error resetting session:', error);
        alert('There was an error clearing the data. Please refresh the page manually.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                California Conservatorship & Trust Accounting
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Automated GC-400 Form Generation
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button variant="destructive" onClick={resetWorkflow}>
                Start Over
              </Button>
              <p className="text-xs text-gray-500">
                Clears all data and restarts
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkflowStepper />

        <div className="mt-8">
          {currentStep === 0 && <CaseInformationForm onNext={goToNextStep} />}
          {currentStep === 1 && (
            <AssetManagement onNext={goToNextStep} onBack={goToPreviousStep} />
          )}
          {currentStep === 2 && (
            <FileUpload onNext={goToNextStep} onBack={goToPreviousStep} />
          )}
          {currentStep === 3 && (
            <TransactionReview onNext={goToNextStep} onBack={goToPreviousStep} />
          )}
          {currentStep === 4 && <SummaryDashboard onBack={goToPreviousStep} />}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-500 text-center">
            This application assists with petition preparation. Please verify all forms with legal counsel before filing.
          </p>
        </div>
      </footer>
    </div>
  );
}
