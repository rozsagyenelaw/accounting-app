'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Download, CheckCircle2 } from 'lucide-react';

interface AccountingData {
  caseNumber?: string;
  trustName?: string;
  accountPeriodStart?: string;
  accountPeriodEnd?: string;
  cashAssetsBeginning?: number;
  nonCashAssets?: number;
  receipts?: number;
  disbursements?: number;
  cashAssetsEnding?: number;
  interestReceipts?: number;
  pensionReceipts?: number;
  socialSecurityReceipts?: number;
  otherReceipts?: number;
  caregiverExpenses?: number;
  residentialCareExpenses?: number;
  fiduciaryFees?: number;
  livingExpenses?: number;
  medicalExpenses?: number;
  otherDisbursements?: number;
}

export function PdfFormFiller() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [filledPdfUrl, setFilledPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountingData>({});

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setTemplateFile(file);
    setError(null);

    // Upload to server
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload template');
      }

      const data = await response.json();
      console.log('Template uploaded:', data);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFillForm = async () => {
    if (!templateFile) {
      setError('Please upload a template PDF first');
      return;
    }

    setIsFilling(true);
    setError(null);

    try {
      const response = await fetch('/api/pdf-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName: templateFile.name,
          data: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fill PDF');
      }

      const data = await response.json();
      setFilledPdfUrl(data.fileUrl);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsFilling(false);
    }
  };

  const updateFormData = (field: keyof AccountingData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PDF Form Filler</CardTitle>
          <CardDescription>
            Upload a fillable PDF template and provide accounting data to auto-fill the form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Upload */}
          <div>
            <Label htmlFor="template">Upload PDF Template</Label>
            <Input
              id="template"
              type="file"
              accept=".pdf"
              onChange={handleTemplateUpload}
              disabled={isUploading}
            />
            {templateFile && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Template uploaded: {templateFile.name}
              </p>
            )}
          </div>

          {/* Form Data Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="caseNumber">Case Number</Label>
              <Input
                id="caseNumber"
                value={formData.caseNumber || ''}
                onChange={(e) => updateFormData('caseNumber', e.target.value)}
                placeholder="e.g., 21STPB01645"
              />
            </div>

            <div>
              <Label htmlFor="trustName">Trust/Estate Name</Label>
              <Input
                id="trustName"
                value={formData.trustName || ''}
                onChange={(e) => updateFormData('trustName', e.target.value)}
                placeholder="e.g., The Bonnie Drexler Revocable Trust"
              />
            </div>

            <div>
              <Label htmlFor="periodStart">Account Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                value={formData.accountPeriodStart || ''}
                onChange={(e) => updateFormData('accountPeriodStart', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="periodEnd">Account Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={formData.accountPeriodEnd || ''}
                onChange={(e) => updateFormData('accountPeriodEnd', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="cashBeginning">Cash Assets (Beginning)</Label>
              <Input
                id="cashBeginning"
                type="number"
                step="0.01"
                value={formData.cashAssetsBeginning || ''}
                onChange={(e) => updateFormData('cashAssetsBeginning', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="nonCash">Non-Cash Assets</Label>
              <Input
                id="nonCash"
                type="number"
                step="0.01"
                value={formData.nonCashAssets || ''}
                onChange={(e) => updateFormData('nonCashAssets', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="receipts">Total Receipts</Label>
              <Input
                id="receipts"
                type="number"
                step="0.01"
                value={formData.receipts || ''}
                onChange={(e) => updateFormData('receipts', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="disbursements">Total Disbursements</Label>
              <Input
                id="disbursements"
                type="number"
                step="0.01"
                value={formData.disbursements || ''}
                onChange={(e) => updateFormData('disbursements', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="cashEnding">Cash Assets (Ending)</Label>
              <Input
                id="cashEnding"
                type="number"
                step="0.01"
                value={formData.cashAssetsEnding || ''}
                onChange={(e) => updateFormData('cashAssetsEnding', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="interestReceipts">Interest Receipts</Label>
              <Input
                id="interestReceipts"
                type="number"
                step="0.01"
                value={formData.interestReceipts || ''}
                onChange={(e) => updateFormData('interestReceipts', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="pensionReceipts">Pension Receipts</Label>
              <Input
                id="pensionReceipts"
                type="number"
                step="0.01"
                value={formData.pensionReceipts || ''}
                onChange={(e) => updateFormData('pensionReceipts', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="socialSecurityReceipts">Social Security Receipts</Label>
              <Input
                id="socialSecurityReceipts"
                type="number"
                step="0.01"
                value={formData.socialSecurityReceipts || ''}
                onChange={(e) => updateFormData('socialSecurityReceipts', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="livingExpenses">Living Expenses</Label>
              <Input
                id="livingExpenses"
                type="number"
                step="0.01"
                value={formData.livingExpenses || ''}
                onChange={(e) => updateFormData('livingExpenses', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="medicalExpenses">Medical Expenses</Label>
              <Input
                id="medicalExpenses"
                type="number"
                step="0.01"
                value={formData.medicalExpenses || ''}
                onChange={(e) => updateFormData('medicalExpenses', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="residentialCare">Residential Care Expenses</Label>
              <Input
                id="residentialCare"
                type="number"
                step="0.01"
                value={formData.residentialCareExpenses || ''}
                onChange={(e) => updateFormData('residentialCareExpenses', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="fiduciaryFees">Fiduciary Fees</Label>
              <Input
                id="fiduciaryFees"
                type="number"
                step="0.01"
                value={formData.fiduciaryFees || ''}
                onChange={(e) => updateFormData('fiduciaryFees', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Fill Button */}
          <Button
            onClick={handleFillForm}
            disabled={!templateFile || isFilling}
            className="w-full"
          >
            {isFilling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Filling PDF...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Fill PDF Form
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success and Download */}
          {filledPdfUrl && (
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span>PDF filled successfully!</span>
                <a href={filledPdfUrl} download>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
