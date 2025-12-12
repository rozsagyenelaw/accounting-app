# California GC-400/GC-405 Forms Inventory

## Downloaded Fillable PDF Templates

All forms are official California Judicial Council forms (November 2024 versions) downloaded from courts.ca.gov.

### Summary Form
- **gc405sum.pdf** - GC-400(SUM)/GC-405(SUM) - Summary of Account (Standard & Simplified)

### Property on Hand at Beginning of Period
- **gc405ph1.pdf** - GC-400(PH)(1)/GC-405(PH)(1) - Cash Assets on Hand at Beginning
- **gc405ph2.pdf** - GC-400(PH)(2)/GC-405(PH)(2) - Non-Cash Assets on Hand at Beginning

### Schedule A - Receipts
- **gc400a2.pdf** - GC-400(A)(2) - Schedule A, Receipts - Interest
- **gc400a3.pdf** - GC-400(A)(3) - Schedule A, Receipts - Pensions, Annuities
- **gc400a5.pdf** - GC-400(A)(5) - Schedule A, Receipts - Social Security
- **gc400a6.pdf** - GC-400(A)(6) - Schedule A, Receipts - Other Receipts

### Schedule C - Disbursements
- **gc400c1.pdf** - GC-400(C)(1) - Schedule C, Disbursements - Caregiver Expenses
- **gc400c2.pdf** - GC-400(C)(2) - Schedule C, Disbursements - Residential/Long-Term Care
- **gc400c4.pdf** - GC-400(C)(4) - Schedule C, Disbursements - Fiduciary and Attorney Fees
- **gc400c5.pdf** - GC-400(C)(5) - Schedule C, Disbursements - General Administration
- **gc400c7.pdf** - GC-400(C)(7) - Schedule C, Disbursements - Living Expenses
- **gc400c8.pdf** - GC-400(C)(8) - Schedule C, Disbursements - Medical Expenses
- **gc400c11.pdf** - GC-400(C)(11) - Schedule C, Disbursements - Other Expenses

### Schedule E - Property on Hand at End of Period
- **gc400e1.pdf** - GC-400(E)(1) - Schedule E, Cash Assets on Hand at End
- **gc400e2.pdf** - GC-400(E)(2) - Schedule E, Non-Cash Assets on Hand at End

## Total Forms: 16

## Usage

These fillable PDF templates are used by the accounting application to generate official court-ready documents. The app's PDF filling system (`/lib/pdf-fill.ts`) will:

1. Read the appropriate template based on the data being filled
2. Map accounting data to the correct form fields
3. Fill all fields automatically
4. Save the completed form to `/public/forms/filled/`

## Form Field Mapping

The application automatically maps your accounting data to the form fields. See `/lib/pdf-fill.ts` for the complete field mapping configuration.

## Notes

- All forms are official California Judicial Council forms
- Forms are fillable PDFs with interactive fields
- Updated to November 2024 versions
- Source: https://courts.ca.gov/
