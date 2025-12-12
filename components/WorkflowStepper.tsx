'use client';

import { useAccountingStore } from '@/lib/store';

const steps = [
  { id: 1, name: 'Case Information', description: 'Enter case details' },
  { id: 2, name: 'Assets', description: 'Bank accounts & property' },
  { id: 3, name: 'Upload Statements', description: 'Bank statements' },
  { id: 4, name: 'Review Transactions', description: 'Categorize & review' },
  { id: 5, name: 'Summary', description: 'Review & generate forms' },
];

export function WorkflowStepper() {
  const { currentStep } = useAccountingStore();

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li
            key={step.id}
            className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    step.id <= currentStep + 1
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-500'
                  }`}
                >
                  <span className="text-sm font-medium">{step.id}</span>
                </div>
                <div className="mt-2 text-center">
                  <span
                    className={`text-sm font-medium ${
                      step.id <= currentStep + 1 ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </span>
                  <p className="text-xs text-gray-500 hidden md:block">{step.description}</p>
                </div>
              </div>
              {stepIdx !== steps.length - 1 && (
                <div
                  className={`hidden md:block flex-1 h-0.5 mx-4 ${
                    step.id < currentStep + 1 ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  style={{ marginTop: '-50px' }}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
