'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccountingStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { BankAccount, RealProperty, NonCashAsset } from '@/types';

export function AssetManagement({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { caseInfo, assets, updateAssets, transactions } = useAccountingStore();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(assets.bankAccounts || []);
  const [realProperty, setRealProperty] = useState<RealProperty[]>(assets.realProperty || []);
  const [otherAssets, setOtherAssets] = useState<NonCashAsset[]>(assets.otherNonCashAssets || []);

  // Balance fields - use string to allow proper input handling
  const [beginningCashBalance, setBeginningCashBalance] = useState<string>(assets.beginningCashBalance?.toString() || '');
  const [beginningNonCashBalance, setBeginningNonCashBalance] = useState<string>(assets.beginningNonCashBalance?.toString() || '');
  const [endingCashBalance, setEndingCashBalance] = useState<string>(assets.endingCashBalance?.toString() || '');
  const [endingNonCashBalance, setEndingNonCashBalance] = useState<string>(assets.endingNonCashBalance?.toString() || '');

  // Determine if this is the first account
  // Default to true if accountType is not set yet
  const isFirstAccount = useMemo(() => {
    return !caseInfo.accountType || caseInfo.accountType === 'FIRST';
  }, [caseInfo.accountType]);

  // Calculate EXPECTED ending balances and reconciliation difference
  const reconciliationInfo = useMemo(() => {
    try {
      // Parse the current input values
      const beginningCash = parseFloat(beginningCashBalance) || 0;
      const beginningNonCash = parseFloat(beginningNonCashBalance) || 0;
      const endingCash = parseFloat(endingCashBalance) || 0;
      const endingNonCash = parseFloat(endingNonCashBalance) || 0;

      // Calculate total receipts and disbursements from transactions
      const receipts = transactions
        .filter(t => t.type === 'RECEIPT')
        .reduce((sum, t) => sum + t.amount, 0);

      const disbursements = transactions
        .filter(t => t.type === 'DISBURSEMENT')
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate EXPECTED ending cash balance using formula:
      // Expected Ending = Beginning + Receipts - Disbursements
      const expectedEndingCash = beginningCash + receipts - disbursements;

      // Calculate reconciliation difference
      const cashDifference = endingCash - expectedEndingCash;

      return {
        receipts,
        disbursements,
        expectedEndingCash,
        actualEndingCash: endingCash,
        cashDifference,
        isReconciled: Math.abs(cashDifference) < 0.01, // Allow 1 cent rounding
      };
    } catch (error) {
      console.error('Error calculating reconciliation:', error);
      return {
        receipts: 0,
        disbursements: 0,
        expectedEndingCash: 0,
        actualEndingCash: 0,
        cashDifference: 0,
        isReconciled: false,
      };
    }
  }, [beginningCashBalance, endingCashBalance, beginningNonCashBalance, endingNonCashBalance, transactions]);

  // Auto-populate ending balances from bank accounts when they change
  useEffect(() => {
    const totalOpening = bankAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
    const totalClosing = bankAccounts.reduce((sum, acc) => sum + (acc.closingBalance || 0), 0);

    // Only auto-populate if user hasn't manually entered values
    if (!beginningCashBalance && totalOpening > 0) {
      setBeginningCashBalance(totalOpening.toFixed(2));
    }
    if (!endingCashBalance && totalClosing > 0) {
      setEndingCashBalance(totalClosing.toFixed(2));
    }
  }, [bankAccounts, beginningCashBalance, endingCashBalance]);

  // Default ending non-cash to beginning non-cash (unless property sold/bought)
  useEffect(() => {
    if (beginningNonCashBalance && !endingNonCashBalance) {
      setEndingNonCashBalance(beginningNonCashBalance);
    }
  }, [beginningNonCashBalance, endingNonCashBalance]);

  const addBankAccount = () => {
    setBankAccounts([
      ...bankAccounts,
      {
        id: `bank-${Date.now()}`,
        bankName: '',
        accountNumber: '',
        accountType: 'CHECKING',
        openingBalance: 0,
        closingBalance: 0,
      },
    ]);
  };

  const updateBankAccount = (id: string, updates: Partial<BankAccount>) => {
    setBankAccounts(bankAccounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc));
  };

  const deleteBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter(acc => acc.id !== id));
  };

  const addRealProperty = () => {
    setRealProperty([
      ...realProperty,
      {
        id: `property-${Date.now()}`,
        address: '',
        appraisedValue: 0,
        appraisalDate: new Date(),
      },
    ]);
  };

  const updateRealPropertyItem = (id: string, updates: Partial<RealProperty>) => {
    setRealProperty(realProperty.map(prop => prop.id === id ? { ...prop, ...updates } : prop));
  };

  const deleteRealProperty = (id: string) => {
    setRealProperty(realProperty.filter(prop => prop.id !== id));
  };

  const addOtherAsset = () => {
    setOtherAssets([
      ...otherAssets,
      {
        id: `other-${Date.now()}`,
        description: '',
        value: 0,
        valuationDate: new Date(),
      },
    ]);
  };

  const updateOtherAsset = (id: string, updates: Partial<NonCashAsset>) => {
    setOtherAssets(otherAssets.map(asset => asset.id === id ? { ...asset, ...updates } : asset));
  };

  const deleteOtherAsset = (id: string) => {
    setOtherAssets(otherAssets.filter(asset => asset.id !== id));
  };

  const handleNext = () => {
    updateAssets({
      bankAccounts,
      realProperty,
      otherNonCashAssets: otherAssets,
      // Save user-entered BEGINNING balances
      beginningCashBalance: parseFloat(beginningCashBalance) || 0,
      beginningNonCashBalance: parseFloat(beginningNonCashBalance) || 0,
      // Save user-entered ENDING balances (NOT calculated)
      endingCashBalance: parseFloat(endingCashBalance) || 0,
      endingNonCashBalance: parseFloat(endingNonCashBalance) || 0,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bankAccounts.map((account) => (
            <div key={account.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`bank-name-${account.id}`}>Bank Name *</Label>
                  <Input
                    id={`bank-name-${account.id}`}
                    value={account.bankName}
                    onChange={(e) => updateBankAccount(account.id, { bankName: e.target.value })}
                    placeholder="e.g., Chase"
                  />
                </div>
                <div>
                  <Label htmlFor={`account-number-${account.id}`}>Account Number (Last 4) *</Label>
                  <Input
                    id={`account-number-${account.id}`}
                    value={account.accountNumber}
                    onChange={(e) => updateBankAccount(account.id, { accountNumber: e.target.value })}
                    placeholder="e.g., 1234"
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label htmlFor={`account-type-${account.id}`}>Account Type *</Label>
                  <Select
                    id={`account-type-${account.id}`}
                    value={account.accountType}
                    onChange={(e) => updateBankAccount(account.id, { accountType: e.target.value as any })}
                  >
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="MONEY_MARKET">Money Market</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`opening-balance-${account.id}`}>Opening Balance *</Label>
                  <Input
                    id={`opening-balance-${account.id}`}
                    type="number"
                    step="0.01"
                    value={account.openingBalance}
                    onChange={(e) => updateBankAccount(account.id, { openingBalance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor={`closing-balance-${account.id}`}>Closing Balance *</Label>
                  <Input
                    id={`closing-balance-${account.id}`}
                    type="number"
                    step="0.01"
                    value={account.closingBalance}
                    onChange={(e) => updateBankAccount(account.id, { closingBalance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteBankAccount(account.id)}
              >
                Remove Account
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addBankAccount}>
            + Add Bank Account
          </Button>
        </CardContent>
      </Card>

      {/* Real Property */}
      <Card>
        <CardHeader>
          <CardTitle>Real Property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {realProperty.map((property) => (
            <div key={property.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor={`property-address-${property.id}`}>Property Address *</Label>
                  <Input
                    id={`property-address-${property.id}`}
                    value={property.address}
                    onChange={(e) => updateRealPropertyItem(property.id, { address: e.target.value })}
                    placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
                  />
                </div>
                <div>
                  <Label htmlFor={`property-value-${property.id}`}>Appraised Value *</Label>
                  <Input
                    id={`property-value-${property.id}`}
                    type="number"
                    step="0.01"
                    value={property.appraisedValue}
                    onChange={(e) => updateRealPropertyItem(property.id, { appraisedValue: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor={`appraisal-date-${property.id}`}>Appraisal Date *</Label>
                  <Input
                    id={`appraisal-date-${property.id}`}
                    type="date"
                    value={property.appraisalDate instanceof Date ? property.appraisalDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => updateRealPropertyItem(property.id, { appraisalDate: new Date(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`property-description-${property.id}`}>Description (Optional)</Label>
                  <Input
                    id={`property-description-${property.id}`}
                    value={property.description || ''}
                    onChange={(e) => updateRealPropertyItem(property.id, { description: e.target.value })}
                    placeholder="e.g., Single family residence"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteRealProperty(property.id)}
              >
                Remove Property
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addRealProperty}>
            + Add Real Property
          </Button>
        </CardContent>
      </Card>

      {/* Other Non-Cash Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Other Non-Cash Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {otherAssets.map((asset) => (
            <div key={asset.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`asset-description-${asset.id}`}>Description *</Label>
                  <Input
                    id={`asset-description-${asset.id}`}
                    value={asset.description}
                    onChange={(e) => updateOtherAsset(asset.id, { description: e.target.value })}
                    placeholder="e.g., Vehicle, Artwork"
                  />
                </div>
                <div>
                  <Label htmlFor={`asset-value-${asset.id}`}>Value *</Label>
                  <Input
                    id={`asset-value-${asset.id}`}
                    type="number"
                    step="0.01"
                    value={asset.value}
                    onChange={(e) => updateOtherAsset(asset.id, { value: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor={`asset-date-${asset.id}`}>Valuation Date *</Label>
                  <Input
                    id={`asset-date-${asset.id}`}
                    type="date"
                    value={asset.valuationDate instanceof Date ? asset.valuationDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => updateOtherAsset(asset.id, { valuationDate: new Date(e.target.value) })}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteOtherAsset(asset.id)}
              >
                Remove Asset
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addOtherAsset}>
            + Add Other Asset
          </Button>
        </CardContent>
      </Card>

      {/* Beginning and Ending Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Account Balances Summary</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Enter both beginning balances (from prior period) and actual ending balances (from bank statements).
            The app will check if they reconcile with your transactions.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Beginning Balances - User Input */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-blue-900">Beginning Balances (Start of Period)</h3>
            <p className="text-xs text-gray-600 mb-3">
              For FIRST account: Enter starting balances when conservatorship/trust began<br/>
              For SECOND+ accounts: Copy ending balances from previous accounting period
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="beginning-cash">Beginning Cash Assets *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input
                    id="beginning-cash"
                    type="number"
                    step="0.01"
                    value={beginningCashBalance}
                    onChange={(e) => setBeginningCashBalance(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Goes on Line 1a of GC-400(SUM)</p>
              </div>
              <div>
                <Label htmlFor="beginning-non-cash">Beginning Non-Cash Assets *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input
                    id="beginning-non-cash"
                    type="number"
                    step="0.01"
                    value={beginningNonCashBalance}
                    onChange={(e) => setBeginningNonCashBalance(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Goes on Line 1b of GC-400(SUM)</p>
              </div>
            </div>
          </div>

          {/* Ending Balances - User Input */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-green-900">Ending Balances (End of Period)</h3>
            <p className="text-xs text-gray-600 mb-3">
              Enter the ACTUAL balances from your bank statements as of the end date.
              These should match the closing balances of your individual bank accounts.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ending-cash">Ending Cash Assets *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input
                    id="ending-cash"
                    type="number"
                    step="0.01"
                    value={endingCashBalance}
                    onChange={(e) => setEndingCashBalance(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Goes on Line 13a of GC-400(SUM)</p>
              </div>
              <div>
                <Label htmlFor="ending-non-cash">Ending Non-Cash Assets *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input
                    id="ending-non-cash"
                    type="number"
                    step="0.01"
                    value={endingNonCashBalance}
                    onChange={(e) => setEndingNonCashBalance(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Usually same as beginning (edit if property was sold/bought). Goes on Line 13b.</p>
              </div>
            </div>
          </div>

          {/* Reconciliation Check */}
          {reconciliationInfo && (beginningCashBalance || endingCashBalance) && (
            <div className={`border rounded-lg p-4 space-y-3 ${
              reconciliationInfo.isReconciled
                ? 'bg-green-50 border-green-300'
                : 'bg-yellow-50 border-yellow-300'
            }`}>
              <h3 className={`font-semibold ${
                reconciliationInfo.isReconciled ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {reconciliationInfo.isReconciled ? '✓ Reconciled' : '⚠ Reconciliation Check'}
              </h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Beginning Cash:</span>
                  <span className="font-mono">${parseFloat(beginningCashBalance || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>+ Receipts:</span>
                  <span className="font-mono">${reconciliationInfo.receipts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>- Disbursements:</span>
                  <span className="font-mono">${reconciliationInfo.disbursements.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-1 mt-1"></div>
                <div className="flex justify-between font-semibold">
                  <span>Expected Ending:</span>
                  <span className="font-mono">${reconciliationInfo.expectedEndingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Actual Ending:</span>
                  <span className="font-mono">${reconciliationInfo.actualEndingCash.toFixed(2)}</span>
                </div>
                {!reconciliationInfo.isReconciled && (
                  <div className={`flex justify-between font-bold pt-2 border-t ${
                    Math.abs(reconciliationInfo.cashDifference) < 0.01
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}>
                    <span>Difference:</span>
                    <span className="font-mono">
                      {reconciliationInfo.cashDifference > 0 ? '+' : ''}
                      ${reconciliationInfo.cashDifference.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              {!reconciliationInfo.isReconciled && Math.abs(reconciliationInfo.cashDifference) > 0.01 && (
                <p className="text-xs text-yellow-800 mt-2">
                  ⚠ The ending balance doesn't match the expected value. This may indicate missing transactions,
                  errors in transaction amounts, or other gains/losses that need to be recorded.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={handleNext}>
          Continue to Upload Statements
        </Button>
      </div>
    </div>
  );
}
