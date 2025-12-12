# PDF Form Templates - Upload Instructions

## Where to Save Fillable PDFs

Save all fillable PDF forms in this directory:
`/public/forms/templates/`

## File Naming Convention

Use these exact filenames when uploading fillable PDFs:

### Summary Form
- **GC-400-SUM.pdf** - Summary of Account (Standard & Simplified)

### Property on Hand at Beginning of Period
- **GC-400-PH-1.pdf** - Cash Assets on Hand at Beginning
- **GC-400-PH-2.pdf** - Non-Cash Assets on Hand at Beginning

### Schedule A - Receipts
- **GC-400-A-2.pdf** - Schedule A, Receipts - Interest
- **GC-400-A-3.pdf** - Schedule A, Receipts - Pensions, Annuities
- **GC-400-A-5.pdf** - Schedule A, Receipts - Social Security
- **GC-400-A-6.pdf** - Schedule A, Receipts - Other Receipts

### Schedule C - Disbursements
- **GC-400-C-1.pdf** - Schedule C, Disbursements - Caregiver Expenses
- **GC-400-C-2.pdf** - Schedule C, Disbursements - Residential/Long-Term Care
- **GC-400-C-4.pdf** - Schedule C, Disbursements - Fiduciary and Attorney Fees
- **GC-400-C-5.pdf** - Schedule C, Disbursements - General Administration
- **GC-400-C-7.pdf** - Schedule C, Disbursements - Living Expenses
- **GC-400-C-8.pdf** - Schedule C, Disbursements - Medical Expenses
- **GC-400-C-11.pdf** - Schedule C, Disbursements - Other Expenses

### Schedule E - Property on Hand at End of Period
- **GC-400-E-1.pdf** - Schedule E, Cash Assets on Hand at End
- **GC-400-E-2.pdf** - Schedule E, Non-Cash Assets on Hand at End

## Total Forms Needed: 16

## How to Upload

1. Download fillable versions of the forms from California Courts website or other source
2. Rename each file to match the exact names listed above (case-sensitive)
3. Save them to: `/Users/rozsagyene/accounting-app/public/forms/templates/`
4. The application will automatically detect and use these fillable forms

## Verification

After uploading, you can verify a PDF is fillable by running:
```bash
npx tsx scripts/check-pdf-fields.ts public/forms/templates/GC-400-SUM.pdf
```

This will show you all the fillable fields in the PDF.

## Notes

- Use exact filenames with dashes (GC-400-SUM.pdf, not gc400sum.pdf)
- Ensure PDFs are the fillable/interactive versions
- All files should be placed in this `/public/forms/templates/` directory
