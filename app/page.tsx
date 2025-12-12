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
  const { currentStep, setCurrentStep, initializeSession } = useAccountingStore();

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const goToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const goToPreviousStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const resetWorkflow = () => {
    if (confirm('Are you sure you want to start over? All data will be lost.')) {
      window.location.reload();
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
            <Button variant="outline" onClick={resetWorkflow}>
              Start Over
            </Button>
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
