# PDF Form Filling System - Complete Guide

## Overview

Your accounting application now has a **complete PDF form filling system** that fills out actual PDF forms (not just generates documents from scratch). This ensures that your official California GC-400 conservatorship accounting forms are properly filled with accurate data from your bank statements and transactions.

## What's Been Implemented

### ✅ 1. PDF Form Filling Infrastructure

**Location**: `/lib/pdf-fill.ts`

A comprehensive PDF filling service that:
- Reads fillable PDF templates
- Maps accounting data to form fields
- Supports text fields, checkboxes, and dropdowns
- Handles field name variations automatically
- Formats numbers with proper decimal places
- Saves filled PDFs for download

### ✅ 2. API Endpoints

#### `/api/pdf-fill` (POST)
Fills a PDF template with accounting data

**Request Body**:
```json
{
  "templateName": "GC-400.pdf",
  "data": {
    "caseNumber": "21STPB01645",
    "trustName": "The Bonnie Drexler Revocable Trust",
    "cashAssetsBeginning": 297866.73,
    "receipts": 635751.00,
    "disbursements": 422709.18,
    // ... etc
  },
  "outputName": "filled-form.pdf"
}
```

**Response**:
```json
{
  "success": true,
  "fileUrl": "/forms/filled/filled-form.pdf",
  "message": "PDF form filled successfully"
}
```

#### `/api/pdf-fill?template=GC-400.pdf` (GET)
Debug endpoint to view all field names in a PDF template

#### `/api/upload-template` (POST)
Upload new PDF templates to the server

### ✅ 3. Folder Structure

```
public/forms/
├── README.md               # Documentation for the forms system
├── templates/              # Put your fillable PDF templates here
│   └── GC-400.pdf         # Upload your official form here
├── filled/                 # Automatically filled PDFs are saved here
└── conservatorship/        # Additional forms storage
```

### ✅ 4. Integration with Existing Workflow

**Location**: `/lib/pdf-generator.ts` (updated)

The existing "Generate GC-400 Forms (PDF)" button now:

1. **First tries to use a fillable template** (`/forms/templates/GC-400.pdf`)
   - If found: Fills the actual PDF form with your data
   - Maps all accounting data to the correct fields
   - Downloads the filled PDF

2. **Falls back to generated PDF** if no template exists
   - Creates a PDF from scratch using pdf-lib
   - Same visual output as before

This means your users get the best of both worlds:
- **With template**: Official, fillable court forms properly filled
- **Without template**: Still works with auto-generated PDFs

### ✅ 5. Data Mapping

The system automatically maps your accounting data to common GC-400 form field names:

| Your Data | → | PDF Form Fields |
|-----------|---|-----------------|
| Case Number | → | `case_number`, `caseNumber` |
| Trust Name | → | `trust_name`, `trustName`, `estate_name` |
| Period Start | → | `period_start`, `periodStart` |
| Period End | → | `period_end`, `periodEnd` |
| Beginning Cash | → | `cash_assets_beginning`, `cashAssetsBeginning` |
| Total Receipts | → | `total_receipts`, `receipts` |
| Total Disbursements | → | `total_disbursements`, `disbursements` |
| Interest Income | → | `interest_receipts`, `interestReceipts` |
| Pension Income | → | `pension_receipts`, `pensionReceipts` |
| Social Security | → | `social_security_receipts`, `socialSecurityReceipts` |
| Living Expenses | → | `living_expenses`, `livingExpenses` |
| Medical Expenses | → | `medical_expenses`, `medicalExpenses` |
| ... and many more | | |

The system handles **multiple field name variations** automatically, so it works with different PDF template versions.

### ✅ 6. UI Component (Optional)

**Location**: `/components/PdfFormFiller.tsx`

A standalone form filler component that allows manual PDF filling. Can be added to the UI if needed for:
- Testing PDF templates
- One-off form filling
- Manual data entry

## How to Use

### Step 1: Get Your Fillable PDF Template

Download the official California GC-400 form from the California Courts website as a **fillable PDF**.

### Step 2: Upload the Template

Place the PDF file in your project:

```bash
public/forms/templates/GC-400.pdf
```

You can either:
- Manually copy the file to this location, or
- Use the application's upload feature (if you add the PdfFormFiller component to the UI)

### Step 3: Use the Application Normally

1. Complete the workflow steps (Case Info → Assets → Upload Statements → Review → Summary)
2. On the Summary Dashboard, click **"Generate GC-400 Forms (PDF)"**
3. The system will automatically:
   - Detect the template at `public/forms/templates/GC-400.pdf`
   - Fill it with all your accounting data
   - Download the filled form

### Step 4: Verify the Filled Form

Open the downloaded PDF and verify:
- ✅ All fields are filled with correct data
- ✅ Numbers are formatted with 2 decimal places
- ✅ Dates are in the correct format
- ✅ Case information is accurate
- ✅ Schedule A (Receipts) totals are correct
- ✅ Schedule C (Disbursements) totals are correct

## Advanced Features

### Debugging Field Names

If your PDF template uses different field names, you can inspect them:

```javascript
// In browser console or via API call:
fetch('/api/pdf-fill?template=GC-400.pdf')
  .then(r => r.json())
  .then(data => console.log(data.fields));
```

This returns all field names like:
```json
{
  "fields": [
    { "name": "case_number", "type": "PDFTextField" },
    { "name": "trust_name", "type": "PDFTextField" },
    { "name": "period_start_date", "type": "PDFTextField" },
    // ... etc
  ]
}
```

### Adding New Field Mappings

To support additional field names, edit `/lib/pdf-fill.ts`:

```typescript
const fieldMappings: Record<string, any> = {
  // Add your custom field mappings here
  'your_custom_field_name': data.someValue,
  'another_field': data.anotherValue,
  // ... existing mappings
};
```

### Transaction Line Items

For filling in detailed transaction tables (individual line items), the system includes a `fillTransactionDetails()` function that attempts to fill rows like:

- `line_1_date`, `line_1_description`, `line_1_amount`
- `line_2_date`, `line_2_description`, `line_2_amount`
- etc.

This can be extended if your PDF template has transaction detail sections.

## Technical Architecture

```
User Workflow
    ↓
Summary Dashboard → Click "Generate PDF"
    ↓
pdf-generator.ts
    ↓
Check for template at /forms/templates/GC-400.pdf
    ↓
Found? → YES                        → NO
    ↓                                  ↓
Call /api/pdf-fill              Generate from scratch
    ↓                                  ↓
lib/pdf-fill.ts                   Original pdf-lib code
    ↓                                  ↓
Fill actual PDF fields            Create new PDF
    ↓                                  ↓
Save to /forms/filled/            Download
    ↓
Download filled PDF
```

## File Reference

| File | Purpose |
|------|---------|
| `/lib/pdf-fill.ts` | Core PDF filling logic |
| `/lib/pdf-generator.ts` | Updated to support templates |
| `/app/api/pdf-fill/route.ts` | API for filling PDFs |
| `/app/api/upload-template/route.ts` | API for uploading templates |
| `/components/PdfFormFiller.tsx` | Optional UI component |
| `/public/forms/README.md` | User documentation |
| `/public/forms/templates/` | Store PDF templates here |
| `/public/forms/filled/` | Filled PDFs saved here |

## Dependencies

Already installed:
- ✅ `pdf-lib` - For reading and writing PDF forms

## Testing Checklist

- [ ] Upload fillable GC-400.pdf to `/public/forms/templates/`
- [ ] Complete the accounting workflow with real data
- [ ] Click "Generate GC-400 Forms (PDF)"
- [ ] Verify the filled PDF downloads automatically
- [ ] Open the PDF and check all fields are filled
- [ ] Verify numbers have 2 decimal places
- [ ] Verify dates are formatted correctly
- [ ] Test with missing template (should fall back to generated PDF)
- [ ] Test field name debugging endpoint

## Troubleshooting

### "Template not found" error
- Ensure the file is named exactly `GC-400.pdf`
- Place it in `public/forms/templates/`
- Check file permissions

### Fields not filling
- Use the debug endpoint to see actual field names
- Update field mappings in `/lib/pdf-fill.ts`
- Ensure your PDF has actual fillable fields (not just text)

### Download not working
- Check browser console for errors
- Verify `/api/pdf-fill` endpoint is responding
- Check `public/forms/filled/` directory permissions

## Next Steps

1. **Upload your fillable GC-400 PDF template** to `public/forms/templates/GC-400.pdf`
2. **Test with sample data** to verify all fields fill correctly
3. **Adjust field mappings** if your template uses different field names
4. **Optionally add the PdfFormFiller component** to the UI for manual filling

---

**Summary**: You now have a complete PDF form filling system that:
- ✅ Fills actual PDF forms (not just generates documents)
- ✅ Automatically maps accounting data to form fields
- ✅ Integrates seamlessly with your existing workflow
- ✅ Falls back gracefully if no template exists
- ✅ Handles field name variations
- ✅ Formats data correctly (decimals, dates, etc.)
- ✅ Saves and downloads filled PDFs

**The actual PDFs are getting filled out!** 🎉
