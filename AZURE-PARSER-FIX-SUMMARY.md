# Azure Document Intelligence Parser - Logix Dividend Fix

## Problem Identified

The app was showing **1067 transactions** but was **missing 35 Logix dividend transactions** totaling **$31,328.72**.

### Root Cause

In `/lib/azure-document-parser.ts` at **line 228**, the paragraph/text parsing had a conditional check:

```typescript
if (result.paragraphs && transactions.length < 100) {
```

This meant:
- ✅ Azure would parse **tables** (Bank of America transactions work fine)
- ❌ Azure would **skip paragraph parsing** if more than 100 transactions were already found from tables
- ❌ **Logix dividends appear in paragraph/text format**, not tables
- ❌ After parsing 1067 Bank of America transactions from tables, the parser would **never check paragraphs** for Logix dividends

## Fix Applied

**File**: `/Users/rozsagyene/accounting-app/lib/azure-document-parser.ts`
**Lines**: 226-255

### Changes Made:

1. **Removed the conditional check** - Paragraph parsing now **ALWAYS runs**
   - Before: `if (result.paragraphs && transactions.length < 100)`
   - After: `if (result.paragraphs)`

2. **Added comprehensive logging** to track what's being parsed:
   ```typescript
   console.log(`[Azure Parser] Processing ${result.paragraphs.length} paragraphs for text-based transactions...`);
   console.log(`[Azure Parser] Found ${textTransactions.length} transactions in text/paragraphs`);
   console.log(`[Azure Parser] Added ${addedFromText} unique transactions from text parsing`);
   ```

3. **Added user-visible warning** when text transactions are found:
   ```typescript
   warnings.push(`✨ Added ${addedFromText} transactions from text parsing (not in tables)`);
   ```

4. **Enhanced comments** to explain that Logix statements use text format:
   ```typescript
   // Bank of America sometimes has transactions in text format, not tables
   // Logix statements may also have dividends in text format
   ```

## Receipt Pattern Verification

The parser already has the correct patterns to identify Logix dividends as **RECEIPTS** (line 32-33):

```typescript
/DEPOSIT DIVIDEND/i,  // Logix credit union dividends
/DIVIDEND/i,
```

✅ This means Logix dividends will be correctly categorized as income.

## Expected Result

After this fix, when you re-upload your bank statement PDFs:

| Source | Expected Count | Expected Total |
|--------|---------------|----------------|
| Bank of America | ~1067 | (varies) |
| Logix Dividends | 35 | $31,328.72 |
| **TOTAL** | **~1102** | **(BofA + $31,328.72)** |

## Next Steps - ACTION REQUIRED

### 1. Test the Fix

You need to re-upload your bank statement PDFs to verify the fix works:

1. Open your accounting app in the browser
2. Navigate to the file upload section
3. Upload these files:
   - `/Users/rozsagyene/Downloads/drexler bank statemetns 2023-2025.xlsx` (Bank of America)
   - `/Users/rozsagyene/Downloads/drexler logix.pdf` (Logix dividends)
   - Any other Logix statement PDFs in `/Users/rozsagyene/Downloads/`

### 2. Verify Transaction Counts

After upload, check:

- [ ] Total transaction count increases from 1067 to ~1102
- [ ] Search for "Logix" in the app - you should see 35+ dividend transactions
- [ ] Check that dividends are categorized as **RECEIPTS** (income)
- [ ] Verify the total amount includes the $31,328.72 in dividends

### 3. Check Console Logs

Open browser developer tools (F12) and check the console for:

```
[Azure Parser] Processing XXX paragraphs for text-based transactions...
[Azure Parser] Found YYY transactions in text/paragraphs
[Azure Parser] Added ZZZ unique transactions from text parsing
```

You should see messages showing that text transactions were added.

### 4. Check for Warnings

The app should display a warning message:

```
✨ Added XX transactions from text parsing (not in tables)
```

This confirms the paragraph parsing is working.

## Reference: Logix Dividends from Bank Statements

The following 35 Logix dividend transactions were manually extracted from your bank statements and **should now be captured by Azure**:

**File**: `/Users/rozsagyene/accounting-app/logix-dividends-from-statements.json`

Summary:
- Date range: 04/01/2024 to 08/01/2025
- Count: 35 transactions
- Total: $31,328.72

Sample transactions:
1. 04/01/2024 - Logix Deposit dividend 6 - $75.99
2. 04/01/2024 - Logix Deposit dividend 25 - $379.58
3. 05/01/2024 - Logix Deposit dividend 7 - $325.89
... (see full list in JSON file)

## Technical Details

### Azure Document Intelligence Model

- **Model**: `prebuilt-layout`
- **Capabilities**:
  - ✅ Table extraction (Bank of America statements)
  - ✅ Paragraph/text extraction (Logix dividends)
  - ✅ Date/amount/description parsing

### Parser Logic Flow

1. **Azure analyzes PDF** → Returns tables + paragraphs
2. **Parse tables** → Extract Bank of America transactions
3. **Parse paragraphs** → Extract Logix dividends (NOW WORKING)
4. **Deduplicate** → Ensure no duplicate transactions
5. **Categorize** → Use GC-400 California conservatorship categories
6. **Return results** → Show in app UI

## Code Location

**Main Parser File**: `/Users/rozsagyene/accounting-app/lib/azure-document-parser.ts`

Key functions:
- `parseWithAzure()` - Main entry point (line 68)
- `parseTextTransactions()` - Parses paragraphs for Logix dividends (line 342)
- `isReceipt()` - Identifies receipts vs disbursements (line 44)

**API Route**: `/Users/rozsagyene/accounting-app/app/api/parse/route.ts`
- Calls Azure parser for PDFs (line 336-369)
- Applies GC-400 categorization

## Status

✅ **Fix Applied**: Paragraph parsing now runs unconditionally
✅ **Logging Added**: Better visibility into what's being parsed
✅ **Warnings Added**: User notification when text transactions found
⏳ **Testing Required**: User needs to re-upload PDFs to verify

---

**Created**: December 16, 2025
**Issue**: Missing Logix dividend transactions
**Solution**: Enhanced Azure parser to always parse paragraphs/text, not just tables
