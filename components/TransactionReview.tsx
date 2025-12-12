'use client';

import { useState, useMemo } from 'react';
import { useAccountingStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import {
  CATEGORY_NAMES,
  C2_SUBCATEGORY_NAMES,
  C7_SUBCATEGORY_NAMES,
  type TransactionCategory,
  type C2SubCategory,
  type C7SubCategory,
} from '@/types';

export function TransactionReview({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { transactions, updateTransaction } = useAccountingStore();

  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'confidence'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by type
    if (filterType) {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      if (sortField === 'date') {
        aVal = a.date.getTime();
        bVal = b.date.getTime();
      } else if (sortField === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else {
        aVal = a.confidence || 0;
        bVal = b.confidence || 0;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [transactions, filterCategory, filterType, searchTerm, sortField, sortDirection]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const totalReceipts = transactions
    .filter(t => t.type === 'RECEIPT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDisbursements = transactions
    .filter(t => t.type === 'DISBURSEMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  const lowConfidenceCount = transactions.filter(t => (t.confidence || 0) < 70).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{transactions.length}</div>
            <div className="text-sm text-gray-500">Total Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              ${totalReceipts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500">Total Receipts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              ${totalDisbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500">Total Disbursements</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{lowConfidenceCount}</div>
            <div className="text-sm text-gray-500">Need Review (Low Confidence)</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Description</Label>
              <Input
                id="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-type">Transaction Type</Label>
              <Select
                id="filter-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="RECEIPT">Receipts</option>
                <option value="DISBURSEMENT">Disbursements</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-category">Category</Label>
              <Select
                id="filter-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredAndSortedTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('date')}
                  >
                    Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('amount')}
                  >
                    Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sub-Category
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('confidence')}
                  >
                    Confidence {sortField === 'confidence' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check #
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {format(transaction.date, 'MM/dd/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate" title={transaction.description}>
                      {transaction.description}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          transaction.type === 'RECEIPT'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type === 'RECEIPT' ? 'Receipt' : 'Disbursement'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                      ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Select
                        value={transaction.category || ''}
                        onChange={(e) =>
                          updateTransaction(transaction.id, {
                            category: e.target.value as TransactionCategory,
                            manuallyReviewed: true,
                          })
                        }
                        className="text-xs"
                      >
                        <option value="">Select Category</option>
                        {Object.entries(CATEGORY_NAMES)
                          .filter(([key]) =>
                            transaction.type === 'RECEIPT'
                              ? key.startsWith('A')
                              : key.startsWith('C')
                          )
                          .map(([key, name]) => (
                            <option key={key} value={key}>
                              {name}
                            </option>
                          ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(transaction.category === 'C2_RESIDENTIAL_FACILITY' ||
                        transaction.category === 'C7_LIVING_EXPENSES') && (
                        <Select
                          value={transaction.subCategory || ''}
                          onChange={(e) =>
                            updateTransaction(transaction.id, {
                              subCategory: e.target.value as C2SubCategory | C7SubCategory,
                              manuallyReviewed: true,
                            })
                          }
                          className="text-xs"
                        >
                          <option value="">Select Sub-Category</option>
                          {transaction.category === 'C2_RESIDENTIAL_FACILITY' &&
                            Object.entries(C2_SUBCATEGORY_NAMES).map(([key, name]) => (
                              <option key={key} value={key}>
                                {name}
                              </option>
                            ))}
                          {transaction.category === 'C7_LIVING_EXPENSES' &&
                            Object.entries(C7_SUBCATEGORY_NAMES).map(([key, name]) => (
                              <option key={key} value={key}>
                                {name}
                              </option>
                            ))}
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          (transaction.confidence || 0) >= 80
                            ? 'bg-green-100 text-green-800'
                            : (transaction.confidence || 0) >= 70
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.confidence || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Input
                        type="text"
                        value={transaction.checkNumber || ''}
                        onChange={(e) =>
                          updateTransaction(transaction.id, {
                            checkNumber: e.target.value,
                          })
                        }
                        placeholder="#"
                        className="w-20 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Continue to Summary
        </Button>
      </div>
    </div>
  );
}
