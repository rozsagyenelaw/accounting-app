'use client';

import { useForm } from 'react-hook-form';
import { useAccountingStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CaseInformation } from '@/types';

export function CaseInformationForm({ onNext }: { onNext: () => void }) {
  const { caseInfo, updateCaseInfo } = useAccountingStore();

  const { register, handleSubmit, formState: { errors } } = useForm<CaseInformation>({
    defaultValues: caseInfo as CaseInformation,
  });

  const onSubmit = (data: CaseInformation) => {
    updateCaseInfo(data);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-6">Case Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trust/Conservatorship Name */}
          <div className="col-span-2">
            <Label htmlFor="trustConservatorshipName">
              Trust/Conservatorship Name *
            </Label>
            <Input
              id="trustConservatorshipName"
              {...register('trustConservatorshipName', { required: 'This field is required' })}
              placeholder="e.g., The John Doe Revocable Trust"
            />
            {errors.trustConservatorshipName && (
              <p className="text-red-600 text-sm mt-1">{errors.trustConservatorshipName.message}</p>
            )}
          </div>

          {/* Case Number */}
          <div>
            <Label htmlFor="caseNumber">Case Number *</Label>
            <Input
              id="caseNumber"
              {...register('caseNumber', { required: 'This field is required' })}
              placeholder="e.g., 21 STPB01 645"
            />
            {errors.caseNumber && (
              <p className="text-red-600 text-sm mt-1">{errors.caseNumber.message}</p>
            )}
          </div>

          {/* Account Type */}
          <div>
            <Label htmlFor="accountType">Account Type *</Label>
            <select
              id="accountType"
              {...register('accountType', { required: 'This field is required' })}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="FIRST">First</option>
              <option value="SECOND">Second</option>
              <option value="THIRD">Third</option>
              <option value="FOURTH">Fourth</option>
              <option value="FIFTH">Fifth</option>
              <option value="SIXTH">Sixth</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.accountType && (
              <p className="text-red-600 text-sm mt-1">{errors.accountType.message}</p>
            )}
          </div>

          {/* Is Final */}
          <div className="flex items-center space-x-2 col-span-2">
            <input
              type="checkbox"
              id="isFinal"
              {...register('isFinal')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="isFinal" className="font-normal">
              This is a final accounting
            </Label>
          </div>

          {/* Court Name */}
          <div className="col-span-2">
            <Label htmlFor="courtName">Court Name *</Label>
            <Input
              id="courtName"
              {...register('courtName', { required: 'This field is required' })}
              placeholder="e.g., Superior Court of California, County of Los Angeles"
            />
            {errors.courtName && (
              <p className="text-red-600 text-sm mt-1">{errors.courtName.message}</p>
            )}
          </div>

          {/* Court Department */}
          <div>
            <Label htmlFor="courtDepartment">Court Department</Label>
            <Input
              id="courtDepartment"
              {...register('courtDepartment')}
              placeholder="e.g., Department 5"
            />
          </div>

          {/* Accounting Type */}
          <div>
            <Label htmlFor="accountingType">Accounting Type *</Label>
            <select
              id="accountingType"
              {...register('accountingType', { required: 'This field is required' })}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="CONSERVATORSHIP">Conservatorship</option>
              <option value="GUARDIANSHIP">Guardianship</option>
              <option value="TRUST">Trust</option>
            </select>
            {errors.accountingType && (
              <p className="text-red-600 text-sm mt-1">{errors.accountingType.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Parties Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Parties</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Petitioner Name */}
          <div>
            <Label htmlFor="petitionerName">Petitioner Name *</Label>
            <Input
              id="petitionerName"
              {...register('petitionerName', { required: 'This field is required' })}
              placeholder="e.g., Jane Smith"
            />
            {errors.petitionerName && (
              <p className="text-red-600 text-sm mt-1">{errors.petitionerName.message}</p>
            )}
          </div>

          {/* Petitioner Role */}
          <div>
            <Label htmlFor="petitionerRole">Petitioner Role *</Label>
            <select
              id="petitionerRole"
              {...register('petitionerRole', { required: 'This field is required' })}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="TRUSTEE">Trustee</option>
              <option value="CONSERVATOR">Conservator</option>
              <option value="GUARDIAN">Guardian</option>
            </select>
            {errors.petitionerRole && (
              <p className="text-red-600 text-sm mt-1">{errors.petitionerRole.message}</p>
            )}
          </div>

          {/* Trustor/Conservatee Name */}
          <div>
            <Label htmlFor="trustorConservateeName">Trustor/Conservatee Name *</Label>
            <Input
              id="trustorConservateeName"
              {...register('trustorConservateeName', { required: 'This field is required' })}
              placeholder="e.g., John Doe"
            />
            {errors.trustorConservateeName && (
              <p className="text-red-600 text-sm mt-1">{errors.trustorConservateeName.message}</p>
            )}
          </div>

          {/* Trustor/Conservatee Address */}
          <div>
            <Label htmlFor="trustorConservateeAddress">Trustor/Conservatee Address *</Label>
            <Input
              id="trustorConservateeAddress"
              {...register('trustorConservateeAddress', { required: 'This field is required' })}
              placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
            />
            {errors.trustorConservateeAddress && (
              <p className="text-red-600 text-sm mt-1">{errors.trustorConservateeAddress.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Attorney Information (Optional) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Attorney Information (Optional)</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="attorneyName">Attorney Name</Label>
            <Input
              id="attorneyName"
              {...register('attorneyName')}
              placeholder="e.g., Robert Johnson"
            />
          </div>

          <div>
            <Label htmlFor="attorneyFirm">Attorney Firm</Label>
            <Input
              id="attorneyFirm"
              {...register('attorneyFirm')}
              placeholder="e.g., Johnson & Associates"
            />
          </div>

          <div>
            <Label htmlFor="attorneyBarNumber">Bar Number</Label>
            <Input
              id="attorneyBarNumber"
              {...register('attorneyBarNumber')}
              placeholder="e.g., 123456"
            />
          </div>

          <div>
            <Label htmlFor="attorneyAddress">Attorney Address</Label>
            <Input
              id="attorneyAddress"
              {...register('attorneyAddress')}
              placeholder="e.g., 456 Law Street, Los Angeles, CA 90002"
            />
          </div>
        </div>
      </div>

      {/* Bond and Accounting Period */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Bond and Accounting Period</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bond Amount */}
          <div>
            <Label htmlFor="currentBondAmount">Current Bond Amount *</Label>
            <Input
              id="currentBondAmount"
              type="number"
              step="0.01"
              {...register('currentBondAmount', {
                required: 'This field is required',
                valueAsNumber: true,
              })}
              placeholder="e.g., 250000"
            />
            {errors.currentBondAmount && (
              <p className="text-red-600 text-sm mt-1">{errors.currentBondAmount.message}</p>
            )}
          </div>

          <div></div>

          {/* Period Start Date */}
          <div>
            <Label htmlFor="periodStartDate">Accounting Period Start Date *</Label>
            <Input
              id="periodStartDate"
              type="date"
              {...register('periodStartDate', {
                required: 'This field is required',
                valueAsDate: true,
              })}
            />
            {errors.periodStartDate && (
              <p className="text-red-600 text-sm mt-1">{errors.periodStartDate.message}</p>
            )}
          </div>

          {/* Period End Date */}
          <div>
            <Label htmlFor="periodEndDate">Accounting Period End Date *</Label>
            <Input
              id="periodEndDate"
              type="date"
              {...register('periodEndDate', {
                required: 'This field is required',
                valueAsDate: true,
              })}
            />
            {errors.periodEndDate && (
              <p className="text-red-600 text-sm mt-1">{errors.periodEndDate.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          Continue to Assets
        </Button>
      </div>
    </form>
  );
}
