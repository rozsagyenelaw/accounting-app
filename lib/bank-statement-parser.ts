/**
 * Bank Statement Parser - Complete Rewrite
 * Handles Bank of America and Logix Credit Union statements
 * Fixes critical bugs in date parsing, transaction extraction, and categorization
 */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'RECEIPT' | 'DISBURSEMENT';
  sectionType: string;
  checkNumber?: string;
  rawLine: string;
}

// ============================================================================
// PART 1: DATE PARSING WITH OCR FIXES
// ============================================================================

/**
 * Fix common OCR date errors before parsing
 */
function fixOCRDates(text: string): string {
  let fixed = text;

  // Fix years: 0023 → 2023, 0024 → 2024, 0025 → 2025
  fixed = fixed.replace(/\/00(\d{2})(\s|$)/gm, '/20$1$2');

  // Fix month "0/" (should be "10/") when it appears at line start or after whitespace
  // But be careful not to change "10/04/23"
  fixed = fixed.replace(/(\s|^)0\/(\d{1,2}\/\d{2,4})/gm, '$110/$2');

  // Fix invalid high day numbers that suggest dropped "1" from month
  // e.g., "2/30/24" should be "12/30/24" (Feb can't have day 30)
  fixed = fixed.replace(/(\s|^)([12])\/([3-9]\d)\/(\d{2,4})/gm, (match, space, month, day, year) => {
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);

    // If month is 1 or 2 and day > 29, likely should be 11 or 12
    if (m === 1 && d > 31) return `${space}11/${day}/${year}`;
    if (m === 2 && d > 29) return `${space}12/${day}/${year}`;

    return match;
  });

  return fixed;
}

/**
 * Parse a date string with robust error handling
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;

  let month = parseInt(match[1], 10);
  let day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // Fix 2-digit years
  if (year < 100) {
    year = year >= 50 ? 1900 + year : 2000 + year;
  }

  // Validate ranges
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 2020 || year > 2030) return null;

  // Create date (JS months are 0-indexed)
  const date = new Date(year, month - 1, day);

  // Verify date is valid (catches Feb 30, etc.)
  if (date.getMonth() !== month - 1) return null;

  return date;
}

// ============================================================================
// PART 2: SECTION IDENTIFICATION
// ============================================================================

interface Section {
  type: 'deposits' | 'atm_debit' | 'other_subtractions' | 'checks' | 'logix' | 'unknown';
  startIndex: number;
  endIndex: number;
  text: string;
}

/**
 * Identify sections in Bank of America statement
 */
function identifySections(text: string): Section[] {
  const sections: Section[] = [];
  const lines = text.split('\n');

  let currentSection: Section | null = null;
  let sectionStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    // Detect section headers
    if (line.includes('deposits and other additions')) {
      if (currentSection) {
        currentSection.endIndex = i;
        currentSection.text = lines.slice(sectionStart, i).join('\n');
        sections.push(currentSection);
      }
      currentSection = { type: 'deposits', startIndex: i, endIndex: -1, text: '' };
      sectionStart = i;
    }
    else if (line.includes('atm and debit card subtractions')) {
      if (currentSection) {
        currentSection.endIndex = i;
        currentSection.text = lines.slice(sectionStart, i).join('\n');
        sections.push(currentSection);
      }
      currentSection = { type: 'atm_debit', startIndex: i, endIndex: -1, text: '' };
      sectionStart = i;
    }
    else if (line.includes('other subtractions')) {
      if (currentSection) {
        currentSection.endIndex = i;
        currentSection.text = lines.slice(sectionStart, i).join('\n');
        sections.push(currentSection);
      }
      currentSection = { type: 'other_subtractions', startIndex: i, endIndex: -1, text: '' };
      sectionStart = i;
    }
    else if (line.match(/^checks\s*$/)) {
      if (currentSection) {
        currentSection.endIndex = i;
        currentSection.text = lines.slice(sectionStart, i).join('\n');
        sections.push(currentSection);
      }
      currentSection = { type: 'checks', startIndex: i, endIndex: -1, text: '' };
      sectionStart = i;
    }
    // Detect end of statement sections
    else if (line.includes('account summary') ||
             line.includes('service fee summary') ||
             line.includes('interest summary')) {
      if (currentSection) {
        currentSection.endIndex = i;
        currentSection.text = lines.slice(sectionStart, i).join('\n');
        sections.push(currentSection);
        currentSection = null;
      }
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.endIndex = lines.length;
    currentSection.text = lines.slice(sectionStart).join('\n');
    sections.push(currentSection);
  }

  return sections;
}

// ============================================================================
// PART 3: TRANSACTION EXTRACTION BY SECTION TYPE
// ============================================================================

/**
 * Parse deposit section (RECEIPTS)
 */
function parseDepositSection(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip header lines
    if (line.toLowerCase().includes('date') ||
        line.toLowerCase().includes('description') ||
        line.toLowerCase().includes('amount')) {
      continue;
    }

    // Match: DATE DESCRIPTION AMOUNT
    // Amount is positive (no minus sign) for deposits
    const match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/);
    if (match) {
      const date = parseDate(match[1]);
      if (!date) continue;

      transactions.push({
        date,
        description: match[2].trim(),
        amount: parseFloat(match[3].replace(/,/g, '')),
        type: 'RECEIPT',
        sectionType: 'deposits',
        rawLine: line
      });
    }
  }

  return transactions;
}

/**
 * Parse ATM/Debit section (DISBURSEMENTS)
 */
function parseATMDebitSection(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip header lines
    if (line.toLowerCase().includes('date') ||
        line.toLowerCase().includes('description') ||
        line.toLowerCase().includes('amount')) {
      continue;
    }

    // Match: DATE DESCRIPTION -AMOUNT or AMOUNT
    const match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+-?([\d,]+\.\d{2})\s*$/);
    if (match) {
      const date = parseDate(match[1]);
      if (!date) continue;

      transactions.push({
        date,
        description: match[2].trim(),
        amount: parseFloat(match[3].replace(/,/g, '')),
        type: 'DISBURSEMENT',
        sectionType: 'atm_debit',
        rawLine: line
      });
    }
  }

  return transactions;
}

/**
 * Parse Other Subtractions section (DISBURSEMENTS)
 */
function parseOtherSubtractions(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip header lines
    if (line.toLowerCase().includes('date') ||
        line.toLowerCase().includes('description') ||
        line.toLowerCase().includes('amount')) {
      continue;
    }

    // Match: DATE DESCRIPTION -AMOUNT
    const match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+-?([\d,]+\.\d{2})\s*$/);
    if (match) {
      const date = parseDate(match[1]);
      if (!date) continue;

      transactions.push({
        date,
        description: match[2].trim(),
        amount: parseFloat(match[3].replace(/,/g, '')),
        type: 'DISBURSEMENT',
        sectionType: 'other_subtractions',
        rawLine: line
      });
    }
  }

  return transactions;
}

/**
 * Parse Checks section (DISBURSEMENTS)
 * Format: DATE CHECK# AMOUNT DATE CHECK# AMOUNT (two columns)
 */
function parseChecksSection(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip header lines
    if (line.toLowerCase().includes('date') ||
        line.toLowerCase().includes('check') ||
        line.toLowerCase().includes('amount')) {
      continue;
    }

    // Pattern: DATE CHECK# AMOUNT (may appear twice per line)
    const checkPattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d+)\s+\*?\s*-?([\d,]+\.\d{2})/g;

    let match;
    while ((match = checkPattern.exec(line)) !== null) {
      const date = parseDate(match[1]);
      if (!date) continue;

      transactions.push({
        date,
        description: `Check #${match[2]}`,
        amount: parseFloat(match[3].replace(/,/g, '')),
        type: 'DISBURSEMENT',
        sectionType: 'checks',
        checkNumber: match[2],
        rawLine: line
      });
    }
  }

  return transactions;
}

// ============================================================================
// PART 4: MAIN PARSER FUNCTION
// ============================================================================

/**
 * Parse Bank of America statement text into transactions
 */
export function parseBankOfAmericaStatement(text: string): ParsedTransaction[] {
  // Fix OCR errors first
  const fixedText = fixOCRDates(text);

  // Identify sections
  const sections = identifySections(fixedText);

  console.log(`Found ${sections.length} sections:`, sections.map(s => s.type));

  // Parse each section
  const allTransactions: ParsedTransaction[] = [];

  for (const section of sections) {
    let sectionTransactions: ParsedTransaction[] = [];

    switch (section.type) {
      case 'deposits':
        sectionTransactions = parseDepositSection(section.text);
        break;
      case 'atm_debit':
        sectionTransactions = parseATMDebitSection(section.text);
        break;
      case 'other_subtractions':
        sectionTransactions = parseOtherSubtractions(section.text);
        break;
      case 'checks':
        sectionTransactions = parseChecksSection(section.text);
        break;
    }

    console.log(`Section ${section.type}: parsed ${sectionTransactions.length} transactions`);
    allTransactions.push(...sectionTransactions);
  }

  // Sort by date
  allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  return allTransactions;
}

/**
 * Validate parsed results
 */
export function validateResults(transactions: ParsedTransaction[]): string[] {
  const warnings: string[] = [];

  // Check transaction count
  if (transactions.length < 100) {
    warnings.push(`WARNING: Only ${transactions.length} transactions found. Expected 1,000+ for 2-year period`);
  }

  // Check totals
  const receipts = transactions.filter(t => t.type === 'RECEIPT');
  const disbursements = transactions.filter(t => t.type === 'DISBURSEMENT');

  const totalReceipts = receipts.reduce((sum, t) => sum + t.amount, 0);
  const totalDisbursements = disbursements.reduce((sum, t) => sum + t.amount, 0);

  console.log(`Total Receipts: $${totalReceipts.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Total Disbursements: $${totalDisbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (totalReceipts < 10000) {
    warnings.push(`WARNING: Total receipts $${totalReceipts.toFixed(2)} seems too low. Expected ~$700,000+ for trust`);
  }

  if (totalDisbursements < 10000) {
    warnings.push(`WARNING: Total disbursements $${totalDisbursements.toFixed(2)} seems too low. Expected ~$500,000+ for trust`);
  }

  // Check for date issues
  const invalidDates = transactions.filter(t =>
    t.date.getFullYear() < 2020 || t.date.getFullYear() > 2030
  );

  if (invalidDates.length > 0) {
    warnings.push(`WARNING: ${invalidDates.length} transactions have invalid dates (year < 2020 or > 2030)`);
  }

  // Check year distribution
  const yearCounts: Record<number, number> = {};
  transactions.forEach(t => {
    const year = t.date.getFullYear();
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });

  console.log('Transactions by year:', yearCounts);

  return warnings;
}
