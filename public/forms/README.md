# PDF Forms Management

This directory manages PDF form templates and filled forms for the California Conservatorship & Trust Accounting application.

## Directory Structure

```
forms/
├── README.md                    # This file
├── templates/                   # Store fillable PDF templates here
│   └── GC-400.pdf              # Main conservatorship accounting form (upload your template)
├── filled/                      # Automatically filled PDFs are saved here
└── conservatorship/             # Additional conservatorship-related forms
```

## How to Use the PDF Form Filling System

### 1. Upload a Fillable PDF Template

Place your fillable PDF template (e.g., the official California GC-400 form) in the `templates/` directory:

- Name the main template: `GC-400.pdf`
- You can also upload additional templates with custom names

### 2. Automatic Form Filling

When you click "Generate GC-400 Forms (PDF)" in the application:

1. The system will **first try to use the fillable template** (`templates/GC-400.pdf`)
2. If a template exists, it will automatically fill in all the fields with your accounting data
3. The filled PDF will be saved to the `filled/` directory and downloaded to your computer
4. If no template exists, the system will fall back to generating a PDF from scratch

### 3. Form Field Mapping

The application automatically maps your accounting data to common field names in GC-400 forms:

#### Case Information Fields
- `case_number`, `caseNumber` → Case Number
- `trust_name`, `trustName`, `estate_name` → Trust/Estate Name
- `period_start`, `periodStart` → Account Period Start Date
- `period_end`, `periodEnd` → Account Period End Date

#### Financial Summary Fields
- `cash_assets_beginning`, `cashAssetsBeginning` → Beginning Cash Assets
- `non_cash_assets`, `nonCashAssets` → Non-Cash Assets
- `total_receipts`, `receipts` → Total Receipts
- `total_disbursements`, `disbursements` → Total Disbursements
- `cash_assets_ending`, `cashAssetsEnding` → Ending Cash Assets

#### Schedule A - Receipts
- `interest_receipts`, `interestReceipts` → Interest Income
- `pension_receipts`, `pensionReceipts` → Pension/Annuity Income
- `social_security_receipts`, `socialSecurityReceipts` → Social Security/VA Benefits
- `other_receipts`, `otherReceipts` → Other Receipts

#### Schedule C - Disbursements
- `caregiver_expenses`, `caregiverExpenses` → Caregiver Expenses
- `residential_care_expenses`, `residentialCareExpenses` → Residential/Care Facility
- `fiduciary_fees`, `fiduciaryFees` → Fiduciary & Attorney Fees
- `living_expenses`, `livingExpenses` → Living Expenses
- `medical_expenses`, `medicalExpenses` → Medical Expenses
- `other_disbursements`, `otherDisbursements` → Other Disbursements

### 4. Debugging Form Fields

If your PDF template uses different field names, you can inspect the field names using the API:

```bash
GET /api/pdf-fill?template=GC-400.pdf
```

This will return a list of all field names in your PDF template, which you can use to update the field mappings in the code.

### 5. Manual Form Filling (Optional)

You can also manually fill forms using the standalone PDF Form Filler component:

1. Navigate to the application
2. Use the "Upload PDF Template" section
3. Fill in the form fields manually
4. Click "Fill PDF Form" to generate the filled PDF

## File Naming Convention

Filled PDFs are automatically named with the following pattern:

```
GC-400_{CaseNumber}_{Date}.pdf
```

Example: `GC-400_21STPB01645_2025-12-12.pdf`

## Technical Details

### PDF Filling Technology

- **Library**: pdf-lib (for reading and writing PDF forms)
- **Server-side Processing**: Next.js API routes (`/api/pdf-fill`, `/api/upload-template`)
- **Client-side Integration**: Seamlessly integrated with the existing workflow

### Supported PDF Features

- ✅ Text fields
- ✅ Checkboxes
- ✅ Dropdown menus
- ✅ Number fields (automatically formatted with 2 decimal places)
- ✅ Date fields

### Data Flow

1. User completes the accounting workflow (steps 1-4)
2. User clicks "Generate GC-400 Forms (PDF)" on the Summary Dashboard
3. System checks for `templates/GC-400.pdf`
4. If found: Fills the template with data → Saves to `filled/` → Downloads
5. If not found: Generates PDF from scratch → Downloads

## Troubleshooting

### Template not being used

- Ensure the template is named exactly `GC-400.pdf`
- Place it in the `public/forms/templates/` directory
- Check browser console for errors

### Fields not filling correctly

- Use the debug API endpoint to view field names
- Update field mappings in `/lib/pdf-fill.ts` if needed
- Ensure your PDF template has fillable form fields (not just a static document)

### Permission errors

- Ensure the `filled/` directory has write permissions
- Check that the Next.js server has access to the `public/forms/` directory

## Next Steps

Once you upload your fillable GC-400 PDF template:

1. Place the PDF in `public/forms/templates/GC-400.pdf`
2. Run through the application workflow with real data
3. Click "Generate GC-400 Forms (PDF)"
4. Verify that all fields are correctly filled
5. If needed, adjust field mappings in the code

---

**Note**: This system ensures that actual PDF forms (not just generated documents) are properly filled out with your accounting data, meeting legal filing requirements for California conservatorship and trust accounting.
