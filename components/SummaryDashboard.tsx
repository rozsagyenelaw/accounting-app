'use client';

import { useMemo } from 'react';
import { useAccountingStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  calculateSummary,
  organizeScheduleA,
  organizeScheduleC,
  validateReconciliation,
} from '@/lib/calculations';
import { generatePDF } from '@/lib/pdf-generator';
import { format } from 'date-fns';

export function SummaryDashboard({ onBack }: { onBack: () => void }) {
  const { caseInfo, assets, transactions } = useAccountingStore();

  const summary = useMemo(() => calculateSummary(transactions, assets), [transactions, assets]);
  const scheduleA = useMemo(() => organizeScheduleA(transactions), [transactions]);
  const scheduleC = useMemo(() => organizeScheduleC(transactions), [transactions]);
  const reconciliation = useMemo(() => validateReconciliation(summary), [summary]);

  const handleGeneratePDF = async () => {
    try {
      await generatePDF({
        caseInfo,
        assets,
        transactions,
        summary,
        scheduleA,
        scheduleC,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check the console for details.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Reconciliation Status */}
      <Card className={reconciliation.isBalanced ? 'border-green-500' : 'border-red-500'}>
        <CardHeader>
          <CardTitle className={reconciliation.isBalanced ? 'text-green-700' : 'text-red-700'}>
            {reconciliation.isBalanced ? '✓ Accounts Balanced' : '⚠ Accounts Not Balanced'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Total Charges</div>
              <div className="text-2xl font-bold">
                ${reconciliation.charges.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Credits</div>
              <div className="text-2xl font-bold">
                ${reconciliation.credits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Difference</div>
              <div className={`text-2xl font-bold ${reconciliation.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                ${reconciliation.difference.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Case Name:</span> {caseInfo.trustConservatorshipName}
            </div>
            <div>
              <span className="font-medium">Case Number:</span> {caseInfo.caseNumber}
            </div>
            <div>
              <span className="font-medium">Court:</span> {caseInfo.courtName}
            </div>
            <div>
              <span className="font-medium">Period:</span>{' '}
              {caseInfo.periodStartDate && format(new Date(caseInfo.periodStartDate), 'MM/dd/yyyy')} -{' '}
              {caseInfo.periodEndDate && format(new Date(caseInfo.periodEndDate), 'MM/dd/yyyy')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Bank Accounts:</span> {assets.bankAccounts.length}
            </div>
            <div>
              <span className="font-medium">Real Property:</span> {assets.realProperty.length}
            </div>
            <div>
              <span className="font-medium">Other Assets:</span> {assets.otherNonCashAssets.length}
            </div>
            <div>
              <span className="font-medium">Total Transactions:</span> {transactions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
              <div>
                <div className="text-sm text-gray-500">Cash Assets at Beginning</div>
                <div className="text-lg font-semibold">
                  ${summary.beginningCashAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Non-Cash Assets at Beginning</div>
                <div className="text-lg font-semibold">
                  ${summary.beginningNonCashAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded">
              <div>
                <div className="text-sm text-gray-500">Total Receipts</div>
                <div className="text-lg font-semibold text-green-700">
                  ${summary.totalReceipts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Disbursements</div>
                <div className="text-lg font-semibold text-red-700">
                  ${summary.totalDisbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
              <div>
                <div className="text-sm text-gray-500">Cash Assets at End</div>
                <div className="text-lg font-semibold">
                  ${summary.endingCashAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Non-Cash Assets at End</div>
                <div className="text-lg font-semibold">
                  ${summary.endingNonCashAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule A - Receipts */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule A - Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>A(2) Interest</span>
              <span className="font-semibold">
                ${scheduleA.A2_Interest.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>A(3) Pensions, Annuities</span>
              <span className="font-semibold">
                ${scheduleA.A3_PensionsAnnuities.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>A(5) Social Security, VA Benefits</span>
              <span className="font-semibold">
                ${scheduleA.A5_SocialSecurityVA.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>A(6) Other Receipts</span>
              <span className="font-semibold">
                ${scheduleA.A6_OtherReceipts.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule C - Disbursements */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule C - Disbursements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>C(1) Caregiver</span>
              <span className="font-semibold">
                ${scheduleC.C1_Caregiver.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>C(2) Residential Facility</span>
              <span className="font-semibold">
                ${Object.values(scheduleC.C2_ResidentialFacility)
                  .flat()
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>C(4) Fiduciary & Attorney Fees</span>
              <span className="font-semibold">
                ${scheduleC.C4_FiduciaryAttorney.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>C(5) General Administration</span>
              <span className="font-semibold">
                ${scheduleC.C5_GeneralAdmin.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>C(6) Medical</span>
              <span className="font-semibold">
                ${scheduleC.C6_Medical.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>C(7) Living Expenses</span>
              <span className="font-semibold">
                ${Object.values(scheduleC.C7_LivingExpenses)
                  .flat()
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>C(8) Taxes</span>
              <span className="font-semibold">
                ${scheduleC.C8_Taxes.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>C(9) Other Disbursements</span>
              <span className="font-semibold">
                ${scheduleC.C9_OtherDisbursements.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to Review
        </Button>
        <Button
          type="button"
          onClick={handleGeneratePDF}
          disabled={!reconciliation.isBalanced}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Generate GC-400 Forms (PDF)
        </Button>
      </div>

      {!reconciliation.isBalanced && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> The accounts must be balanced before generating PDF forms.
            Please review your transactions and asset balances to ensure charges equal credits.
          </p>
        </div>
      )}
    </div>
  );
}
