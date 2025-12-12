# California Conservatorship & Trust Accounting App

A full-stack web application for automating California conservatorship and trust accounting petitions based on bank statements. This application generates court-required GC-400 series forms for the California Judicial Council.

## Features

- **Bank Statement Processing**: Upload and parse PDF or CSV bank statements
- **AI Transaction Classification**: Automatically categorize transactions into California Judicial Council form categories
- **Transaction Review Interface**: Review and manually adjust transaction categorizations
- **PDF Form Generation**: Generate complete GC-400 series court petition packages
- **Mathematical Reconciliation**: Automatic validation of charges vs credits
- **Multi-Bank Support**: Handle statements from Bank of America, Chase, Wells Fargo, and more

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Hook Form** - Form state management
- **Zustand** - Global state management with persistence

### Backend/Processing
- **pdf-lib** - PDF form generation and filling
- **pdf-parse** - PDF statement parsing
- **Papa Parse** - CSV statement parsing
- **date-fns** - Date formatting and parsing

### Deployment
- **Netlify** - Hosting and serverless functions
- **GitHub** - Version control

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/[your-username]/accounting-app.git
cd accounting-app
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
accounting-app/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Basic UI components (Button, Input, etc.)
│   └── CaseInformationForm.tsx
├── lib/                   # Core business logic
│   ├── classifier.ts     # Transaction classification engine
│   ├── parser.ts         # Bank statement parsers
│   └── store.ts          # Zustand state management
├── types/                 # TypeScript type definitions
│   └── index.ts          # All type definitions
├── utils/                 # Utility functions
├── public/               # Static assets
└── README.md             # This file
```

## Usage

### 1. Enter Case Information

Fill out the case details form with:
- Trust/Conservatorship name
- Case number
- Court information
- Petitioner and trustor/conservatee details
- Accounting period dates
- Bond amount

### 2. Add Asset Information

Enter details about:
- Bank accounts (name, account number, balances)
- Real property (address, appraised value)
- Other non-cash assets

### 3. Upload Bank Statements

Upload bank statements in PDF or CSV format. The system will:
- Extract all transactions
- Parse dates, descriptions, and amounts
- Distinguish receipts from disbursements
- Auto-classify each transaction

### 4. Review Transactions

Review the automatically classified transactions:
- View confidence scores
- Manually adjust categories if needed
- Add check numbers where applicable
- Flag items for further review

### 5. Generate Forms

The system generates:
- Cover Petition (pages 1-4)
- GC-400(SUM) - Summary of Account
- GC-400(PH) - Property on Hand at Beginning
- Schedule A - Receipts (by category)
- Schedule C - Disbursements (by category)
- Schedule E - Property on Hand at End

## Transaction Categories

### Receipts (Schedule A)

- **A(2) - Interest**: Bank interest, investment interest
- **A(3) - Pensions, Annuities**: Trust distributions, pension payments
- **A(5) - Social Security, VA Benefits**: SSA, SSI, SSDI, VA payments
- **A(6) - Other Receipts**: Refunds, reimbursements, miscellaneous

### Disbursements (Schedule C)

- **C(1) - Caregiver Expenses**: In-home care, nursing
- **C(2) - Residential Facility Expenses**: Utilities, maintenance, security
- **C(4) - Fiduciary and Attorney Fees**: Legal fees, trustee compensation
- **C(5) - General Administration**: Court fees, bond premiums
- **C(6) - Medical Expenses**: Doctors, hospitals, prescriptions
- **C(7) - Living Expenses**: Food, clothing, entertainment, etc.
- **C(8) - Taxes**: Income tax, property tax
- **C(9) - Other Disbursements**: Charitable donations, miscellaneous

## Classification Engine

The transaction classifier uses keyword-based matching with confidence scoring:

1. **Keyword Matching**: Compares transaction descriptions against category-specific keywords
2. **Weighted Scoring**: Different keywords have different weights based on specificity
3. **Confidence Score**: 0-100 scale indicating classification certainty
4. **Sub-Category Support**: Automatically assigns sub-categories for C(2) and C(7)

Low confidence transactions (< 70%) are flagged for manual review.

## Bank Statement Formats

### Supported CSV Formats

The parser automatically detects column headers for:
- Date fields: "Date", "Posted Date", "Transaction Date"
- Description: "Description", "Memo", "Detail", "Payee"
- Amount: "Amount", "Debit", "Credit", "Withdrawal", "Deposit"

### Supported PDF Formats

Basic PDF parsing is supported but CSV is recommended for best results. The parser looks for transaction patterns like:

```
01/15/2024 AMAZON.COM $45.67
```

## Form Generation

Forms are generated in compliance with California Judicial Council standards:
- Proper page numbering
- Correct form headers and footers
- Category subtotals
- Mathematical reconciliation
- Court-compliant formatting

## Data Persistence

Session data is stored in browser localStorage, allowing users to:
- Save work in progress
- Return to incomplete accountings
- Export transaction data

## Deployment to Netlify

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Deploy

Or use the Netlify CLI:

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Important Notes

⚠️ **Legal Disclaimer**: This application assists with petition preparation but should not replace legal counsel. Always verify generated forms with an attorney familiar with California probate law.

⚠️ **Court Requirements**: Some courts have specific local rules beyond standard GC-400 forms. Verify local requirements before filing.

⚠️ **Data Security**: Sensitive client data is stored only in browser localStorage. Do not share or export data to untrusted systems.

## Future Enhancements (Phase 2)

- Machine learning-enhanced classification
- Bond calculator based on estate value
- Declaration generator for attorney fees
- Multi-account reconciliation
- Investment gain/loss tracking
- User authentication and cloud storage
- Template system for recurring accountings
- Proof of service document generation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues or questions:
- Create an issue in the GitHub repository
- Contact the development team

## Resources

- [California Judicial Council Forms](https://www.courts.ca.gov/forms.htm)
- [GC-400 Series Forms](https://www.courts.ca.gov/documents/gc400.pdf)
- [California Probate Code](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=PROB&division=4.&title=&part=1.&chapter=3.&article=)

## Changelog

### Version 0.1.0 (Initial Release)
- Basic case information form
- Bank statement parsing (CSV and PDF)
- Transaction classification engine
- TypeScript type system
- State management with Zustand
- UI component library

---

**Built with** ❤️ **for California probate professionals**
