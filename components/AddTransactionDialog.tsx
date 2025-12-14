'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  RECEIPT_CATEGORY_NAMES,
  DISBURSEMENT_CATEGORY_NAMES,
  type TransactionCategory,
} from '@/types';

interface AddTransactionDialogProps {
  onAdd: (transaction: {
    date: Date;
    description: string;
    type: 'RECEIPT' | 'DISBURSEMENT';
    amount: number;
    category: TransactionCategory;
    subCategory?: string;
  }) => void;
  onCancel: () => void;
}

export function AddTransactionDialog({ onAdd, onCancel }: AddTransactionDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'RECEIPT' | 'DISBURSEMENT'>('RECEIPT');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !description || !amount || !category) {
      alert('Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    onAdd({
      date: new Date(date),
      description,
      type,
      amount: amountNum,
      category: category as TransactionCategory,
      subCategory: subCategory || undefined,
    });
  };

  const categoryOptions = type === 'RECEIPT'
    ? Object.entries(RECEIPT_CATEGORY_NAMES)
    : Object.entries(DISBURSEMENT_CATEGORY_NAMES);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Add Transaction</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter transaction description"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <Select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as 'RECEIPT' | 'DISBURSEMENT');
                  setCategory(''); // Reset category when type changes
                }}
                required
              >
                <option value="RECEIPT">Receipt</option>
                <option value="DISBURSEMENT">Disbursement</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select category...</option>
                {categoryOptions.map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="subCategory">Sub-Category (Optional)</Label>
              <Input
                id="subCategory"
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="Enter sub-category if applicable"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Transaction
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
