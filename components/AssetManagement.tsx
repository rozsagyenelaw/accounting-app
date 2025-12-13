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

  // Calculate beginning balances for non-first accounts
  // Uses local state values, not stored values, so it updates in real-time
  const calculatedBeginningBalances = useMemo(() => {
    if (isFirstAccount || !caseInfo.accountType) {
      return null;
    }
    try {
      // Parse the current input values
      const endingCash = parseFloat(endingCashBalance) || 0;
      const endingNonCash = parseFloat(endingNonCashBalance) || 0;

      // Calculate total receipts and disbursements from store
      const receipts = transactions
        .filter(t => t.type === 'RECEIPT')
        .reduce((sum, t) => sum + t.amount, 0);

      const disbursements = transactions
        .filter(t => t.type === 'DISBURSEMENT')
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate beginning cash balance
      // Beginning = Ending + Disbursements - Receipts
      const beginningCash = endingCash + disbursements - receipts;

      // Beginning non-cash defaults to same as ending
      const beginningNonCash = endingNonCash;

      return {
        cash: beginningCash,
        nonCash: beginningNonCash,
      };
    } catch (error) {
      console.error('Error calculating beginning balances:', error);
      return { cash: 0, nonCash: 0 };
    }
  }, [isFirstAccount, caseInfo.accountType, endingCashBalance, endingNonCashBalance, transactions]);

  // For non-first accounts, default beginning non-cash to ending non-cash
  useEffect(() => {
    if (!isFirstAccount && endingNonCashBalance && !beginningNonCashBalance) {
      setBeginningNonCashBalance(endingNonCashBalance);
    }
  }, [isFirstAccount, endingNonCashBalance, beginningNonCashBalance]);

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
      beginningCashBalance: isFirstAccount ? parseFloat(beginningCashBalance) || 0 : undefined,
      beginningNonCashBalance: isFirstAccount ? parseFloat(beginningNonCashBalance) || 0 : undefined,
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
            {isFirstAccount
              ? 'For the FIRST account, enter both beginning and ending balances.'
              : 'For subsequent accounts, only enter ending balances. Beginning balances will be auto-calculated.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* FIRST Account - Show all balance inputs */}
          {isFirstAccount && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-blue-900">Beginning Balances (Start of Period)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="beginning-cash">Beginning Cash Balance *</Label>
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
                  <p className="text-xs text-gray-500 mt-1">Opening cash balance when conservatorship/trust started</p>
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
                  <p className="text-xs text-gray-500 mt-1">Real property and other assets at start</p>
                </div>
              </div>
            </div>
          )}

          {/* Ending Balances - All Accounts */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-green-900">Ending Balances (End of Period)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ending-cash">Ending Cash Balance *</Label>
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
                <p className="text-xs text-gray-500 mt-1">Total cash in all bank accounts at period end</p>
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
                <p className="text-xs text-gray-500 mt-1">Real property and other assets at period end</p>
              </div>
            </div>
          </div>

          {/* SECOND+ Accounts - Show calculated beginning balances */}
          {!isFirstAccount && calculatedBeginningBalances && (
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">Calculated Beginning Balances (Auto-Calculated)</h3>
              <p className="text-xs text-gray-600 mb-3">
                These values are automatically calculated using the formula:<br/>
                <code className="bg-white px-2 py-1 rounded">Beginning Cash = ${parseFloat(endingCashBalance) || 0} (Ending) + ${transactions.filter(t => t.type === 'DISBURSEMENT').reduce((sum, t) => sum + t.amount, 0).toFixed(2)} (Disbursements) - ${transactions.filter(t => t.type === 'RECEIPT').reduce((sum, t) => sum + t.amount, 0).toFixed(2)} (Receipts)</code>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Beginning Cash Balance (Calculated)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <Input
                      type="text"
                      value={calculatedBeginningBalances.cash.toFixed(2)}
                      disabled
                      className="pl-7 bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <Label>Beginning Non-Cash Assets</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={beginningNonCashBalance}
                      onChange={(e) => setBeginningNonCashBalance(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Defaults to ending value (edit if property was sold/bought)</p>
                </div>
              </div>
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
