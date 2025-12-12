'use client';

import { useState, useCallback } from 'react';
import { useAccountingStore } from '@/lib/store';
import { classifyTransaction } from '@/lib/classifier';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Transaction } from '@/types';

export function FileUpload({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { setTransactions } = useAccountingStore();
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parseResults, setParseResults] = useState<{
    success: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(
        file => file.name.endsWith('.csv') || file.name.endsWith('.pdf')
      );
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const parseFiles = async () => {
    if (files.length === 0) return;

    setParsing(true);
    const allTransactions: Transaction[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          allErrors.push(`${file.name}: ${result.error || 'Parse failed'}`);
          continue;
        }

        if (result.errors && result.errors.length > 0) {
          allErrors.push(`${file.name}: ${result.errors.join(', ')}`);
        }
        if (result.warnings && result.warnings.length > 0) {
          allWarnings.push(`${file.name}: ${result.warnings.join(', ')}`);
        }

        // Classify and convert to Transaction objects
        const transactions: Transaction[] = result.transactions.map((parsed: any) => {
          const classification = classifyTransaction(parsed.description, parsed.type);

          return {
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: new Date(parsed.date),
            description: parsed.description,
            amount: parsed.amount,
            type: parsed.type,
            category: classification.category,
            subCategory: classification.subCategory,
            confidence: classification.confidence,
            manuallyReviewed: false,
          };
        });

        allTransactions.push(...transactions);
      } catch (error) {
        allErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Simple deduplication by creating a Set of transaction signatures
    const seen = new Set<string>();
    const uniqueTransactions = allTransactions.filter(t => {
      const sig = `${t.date.toISOString()}-${t.description}-${t.amount}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });

    // Sort by date
    uniqueTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    setTransactions(uniqueTransactions);
    setParseResults({
      success: uniqueTransactions.length,
      errors: allErrors,
      warnings: allWarnings,
    });
    setParsing(false);
  };

  const handleNext = () => {
    if (parseResults && parseResults.success > 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Bank Statements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="text-gray-600">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Upload files
                  </span>
                  <span className="text-gray-600"> or drag and drop</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    multiple
                    accept=".csv,.pdf"
                    onChange={handleFileInput}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500">CSV or PDF files up to 10MB</p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Selected Files:</h3>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Parse Button */}
          {files.length > 0 && !parseResults && (
            <Button
              onClick={parseFiles}
              disabled={parsing}
              className="w-full"
            >
              {parsing ? 'Parsing...' : 'Parse Bank Statements'}
            </Button>
          )}

          {/* Results */}
          {parseResults && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-900">
                  Successfully parsed {parseResults.success} transactions
                </h3>
              </div>

              {parseResults.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                    {parseResults.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parseResults.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                  <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                    {parseResults.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!parseResults || parseResults.success === 0}
        >
          Continue to Review Transactions
        </Button>
      </div>
    </div>
  );
}
