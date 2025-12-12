# Quick Start Guide

## Installation and Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 16 with React 19
- TypeScript
- Tailwind CSS
- PDF processing libraries (pdf-lib, pdf-parse)
- CSV parser (papaparse)
- Form management (react-hook-form)
- State management (zustand)

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` if you want to customize any settings (all are optional).

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure Overview

```
accounting-app/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Home page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── ui/                      # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   └── CaseInformationForm.tsx  # Main case info form
│
├── lib/                         # Core business logic
│   ├── classifier.ts            # Transaction categorization
│   ├── parser.ts                # Bank statement parsing
│   └── store.ts                 # State management
│
├── types/                       # TypeScript definitions
│   ├── index.ts                 # Main type definitions
│   └── pdf-parse.d.ts          # PDF parser types
│
├── utils/                       # Utility functions
│
└── public/                      # Static assets
```

## Key Files to Understand

### 1. Type Definitions (`types/index.ts`)

Defines all TypeScript types for:
- Transaction categories (Schedule A receipts, Schedule C disbursements)
- Case information
- Assets (bank accounts, real property, non-cash assets)
- Form data structures

### 2. Transaction Classifier (`lib/classifier.ts`)

The heart of the automatic categorization:
- Keyword-based matching
- Confidence scoring
- Sub-category assignment for C(2) and C(7)

Example usage:
```typescript
import { classifyTransaction } from '@/lib/classifier';

const result = classifyTransaction('CVS PHARMACY', 'DISBURSEMENT');
// Returns: { category: 'C6_MEDICAL', confidence: 85, matchedKeywords: ['cvs', 'pharmacy'] }
```

### 3. Bank Statement Parser (`lib/parser.ts`)

Handles both CSV and PDF bank statements:
```typescript
import { parseStatement } from '@/lib/parser';

const file = // ... File object from upload
const result = await parseStatement(file);
// Returns: { transactions: [...], errors: [...], warnings: [...] }
```

### 4. State Management (`lib/store.ts`)

Zustand store with persistence:
```typescript
import { useAccountingStore } from '@/lib/store';

function MyComponent() {
  const { caseInfo, updateCaseInfo } = useAccountingStore();
  // ...
}
```

## Testing the Classifier

You can test the transaction classifier directly in your browser console:

```javascript
// Open the browser console at http://localhost:3000

// Import the classifier (you'll need to expose it first)
import { classifyTransaction } from '@/lib/classifier';

// Test some transactions
classifyTransaction('AMAZON.COM', 'DISBURSEMENT');
// Expected: C7_LIVING_EXPENSES, ONLINE_SHOPPING

classifyTransaction('SOCIAL SECURITY ADMIN', 'RECEIPT');
// Expected: A5_SOCIAL_SECURITY_VA

classifyTransaction('CVS PHARMACY', 'DISBURSEMENT');
// Expected: C6_MEDICAL
```

## Creating Custom Components

### Example: Custom Select Component

```typescript
import * as React from "react"
import { clsx } from "clsx"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={clsx(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2",
          "text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Select.displayName = "Select"

export { Select }
```

## Common Development Tasks

### Adding a New Transaction Category

1. Update the type in `types/index.ts`:
```typescript
export type DisbursementCategory =
  | 'C1_CAREGIVER'
  | 'C2_RESIDENTIAL_FACILITY'
  | 'C10_NEW_CATEGORY'; // Add your new category
```

2. Add display name:
```typescript
export const DISBURSEMENT_CATEGORY_NAMES: Record<DisbursementCategory, string> = {
  // ... existing categories
  C10_NEW_CATEGORY: 'Schedule C(10) - New Category Description',
};
```

3. Add classification rules in `lib/classifier.ts`:
```typescript
const DISBURSEMENT_RULES: KeywordRule[] = [
  // ... existing rules
  {
    keywords: ['keyword1', 'keyword2'],
    category: 'C10_NEW_CATEGORY' as DisbursementCategory,
    weight: 1.5,
  },
];
```

### Adding a Sub-Category

For categories C2 (Residential Facility) or C7 (Living Expenses):

1. Update the sub-category type in `types/index.ts`
2. Add display name
3. Add keyword rule with `subCategory` field

### Testing the Build

```bash
# Test production build
npm run build

# Run production server
npm start
```

## Deployment to Netlify

### Option 1: GitHub Integration

1. Push your code to GitHub
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect to your GitHub repository
5. Build settings are auto-detected from `netlify.toml`
6. Deploy!

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## Troubleshooting

### Build Fails with "Cannot find module"

Make sure all dependencies are installed:
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

Check your `tsconfig.json` is up to date:
```bash
npm run build
```

Next.js will auto-update the config if needed.

### PDF Parsing Not Working

PDF parsing works best with simple, text-based PDFs. If you encounter issues:
1. Try exporting your bank statement as CSV instead
2. Check if the PDF is image-based (requires OCR, not yet supported)
3. Look at the warnings in the parser result

### State Not Persisting

The Zustand store uses localStorage. Check:
1. Browser supports localStorage
2. Not in private/incognito mode
3. No browser extensions blocking storage

## Next Steps

After getting familiar with the codebase, you can:

1. **Build the Transaction Review Interface**
   - Create a table component for transaction display
   - Add filtering and sorting
   - Implement category override dropdown

2. **Implement PDF Form Generation**
   - Set up pdf-lib for form filling
   - Create templates for each GC-400 form
   - Add pagination and page numbering

3. **Add File Upload**
   - Create upload component with drag-and-drop
   - Add progress indicators
   - Handle multiple files

4. **Create Summary Dashboard**
   - Calculate totals by category
   - Show reconciliation (charges = credits)
   - Display warnings for imbalances

## Getting Help

- Review the comprehensive [README.md](./README.md)
- Check [Next.js Documentation](https://nextjs.org/docs)
- Review [California Judicial Council Forms](https://www.courts.ca.gov/forms.htm)

## Contributing

When making changes:
1. Create a feature branch
2. Write clear commit messages
3. Test the build before committing
4. Update documentation if needed

```bash
git checkout -b feature/my-new-feature
# Make changes
npm run build  # Test
git add .
git commit -m "Add my new feature"
git push origin feature/my-new-feature
```
