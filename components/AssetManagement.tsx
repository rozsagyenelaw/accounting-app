'use client';

import { useState } from 'react';
import { useAccountingStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { BankAccount, RealProperty, NonCashAsset } from '@/types';

export function AssetManagement({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { assets, updateAssets } = useAccountingStore();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(assets.bankAccounts || []);
  const [realProperty, setRealProperty] = useState<RealProperty[]>(assets.realProperty || []);
  const [otherAssets, setOtherAssets] = useState<NonCashAsset[]>(assets.otherNonCashAssets || []);

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
