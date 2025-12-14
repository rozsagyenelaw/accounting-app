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

  // Debug: Log section info
  console.log(`[DEBUG] Found ${sections.length} sections:`);
  for (const section of sections) {
    console.log(`  - ${section.type}: lines ${section.startIndex}-${section.endIndex}, text length: ${section.text.length} chars`);
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
  console.log('[DEBUG] Deposits section sample (first 800 chars):');
  console.log(text.substring(0, 800));
  console.log('[DEBUG] --- End of deposits sample ---');

  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  console.log(`[DEBUG] Deposits section has ${lines.length} lines`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) continue;

    // Skip header lines
    const lineLower = line.toLowerCase();
    if (lineLower.includes('date') ||
        lineLower.includes('description') ||
        lineLower.includes('amount')) {
      continue;
    }

    // Log first 10 non-header lines for debugging
    if (transactions.length < 3 && line.trim().length > 10) {
      console.log(`[DEBUG] Deposits line ${i}: "${line}"`);
    }

    // Try multiple regex patterns to match different OCR formats

    // Pattern 1: Simple DATE DESCRIPTION AMOUNT
    let match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/);

    // Pattern 2: DATE with flexible whitespace and AMOUNT at end
    if (!match) {
      match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+)\s+([\d,]+\.\d{2})$/);
    }

    // Pattern 3: Handle amounts with + prefix
    if (!match) {
      match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+\+?([\d,]+\.\d{2})\s*$/);
    }

    if (match) {
      const date = parseDate(match[1]);
      if (!date) {
        console.log(`[DEBUG] Failed to parse date: "${match[1]}" from line: "${line}"`);
        continue;
      }

      const amount = parseFloat(match[3].replace(/,/g, ''));
      if (isNaN(amount) || amount <= 0) continue;

      transactions.push({
        date,
        description: match[2].trim(),
        amount,
        type: 'RECEIPT',
        sectionType: 'deposits',
        rawLine: line
      });

      if (transactions.length <= 3) {
        console.log(`[DEBUG] Parsed deposit: ${date.toISOString().split('T')[0]} | ${match[2].trim()} | $${amount}`);
      }
    }
  }

  console.log(`[DEBUG] Deposits section parsed ${transactions.length} transactions`);
  return transactions;
}

/**
 * Parse ATM/Debit section (DISBURSEMENTS) using HYBRID approach
 * Tries line-by-line regex first, then falls back to proximity matching
 */
function parseATMDebitSection(text: string): ParsedTransaction[] {
  console.log('[DEBUG] ATM/Debit section sample (first 800 chars):');
  console.log(text.substring(0, 800));
  console.log('[DEBUG] --- End of ATM/Debit sample ---');

  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  console.log(`[DEBUG] ATM/Debit section has ${lines.length} lines`);

  // STEP 1: Try line-by-line matching first (for all-on-one-line format)
  const lineByLineTransactions: ParsedTransaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Skip header lines
    const lineLower = line.toLowerCase();
    if (lineLower.includes('date') ||
        lineLower.includes('description') ||
        lineLower.includes('amount')) {
      continue;
    }

    // Pattern: DATE DESCRIPTION -AMOUNT or AMOUNT
    const match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$/);

    if (match) {
      const date = parseDate(match[1]);
      if (!date) continue;

      const amount = parseFloat(match[3].replace(/[$,\-]/g, ''));
      if (isNaN(amount) || amount <= 0) continue;

      lineByLineTransactions.push({
        date,
        description: match[2].trim(),
        amount,
        type: 'DISBURSEMENT',
        sectionType: 'atm_debit',
        rawLine: line
      });

      if (lineByLineTransactions.length <= 3) {
        console.log(`[DEBUG] Line-by-line matched: ${date.toISOString().split('T')[0]} | ${match[2].trim().substring(0, 40)} | $${amount}`);
      }
    }
  }

  console.log(`[DEBUG] Line-by-line matching found ${lineByLineTransactions.length} transactions`);

  // If line-by-line found enough transactions, use those
  if (lineByLineTransactions.length > 0) {
    return lineByLineTransactions;
  }

  // STEP 2: Fall back to proximity matching for split-across-lines format
  console.log(`[DEBUG] Falling back to proximity matching...`);

  // Step 1: Find all dates with their line numbers
  interface DateMatch {
    line: number;
    month: string;
    day: string;
    year: string;
    raw: string;
  }
  const dates: DateMatch[] = [];
  const datePattern = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(datePattern);
    // Look for date-only lines (relaxed constraint - removed strict length limit)
    // A line is date-only if it has a date pattern and doesn't have long merchant text
    if (match) {
      const lineWithoutDate = lines[i].replace(datePattern, '').trim();
      // If line has minimal text after removing date, it's a date-only line
      if (lineWithoutDate.length < 30) {
        dates.push({
          line: i,
          month: match[1],
          day: match[2],
          year: match[3],
          raw: match[0]
        });
        if (dates.length <= 10) {
          console.log(`[DEBUG] Found date at line ${i}: ${match[0]}`);
        }
      }
    }
  }

  // Step 2: Find all amounts with their line numbers
  interface AmountMatch {
    line: number;
    value: number;
    raw: string;
  }
  const amounts: AmountMatch[] = [];
  // Match amounts either:
  // 1. On a line by themselves: "  -127.33  "
  // 2. At the end of a line with text before: "SOMETHING -127.33"
  const amountPattern = /(-?\$?[\d,]+\.\d{2})\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    const match = line.match(amountPattern);
    if (match) {
      const value = parseFloat(match[1].replace(/[$,\-]/g, ''));
      if (!isNaN(value) && value > 0) {
        amounts.push({
          line: i,
          value,
          raw: match[1]
        });
        if (amounts.length <= 10) {
          console.log(`[DEBUG] Found amount at line ${i}: ${match[1]} -> $${value}`);
        }
      }
    }
  }

  // Step 3: Find all descriptions (lines with merchant keywords)
  interface DescriptionMatch {
    line: number;
    text: string;
  }
  const descriptions: DescriptionMatch[] = [];
  const merchantPattern = /GELSON|SPROUTS|TRADER JOE|AMAZON|AMZN|HOME DEPOT|STARBUCKS|CVS|TARGET|WALMART|COSTCO|SSA TREAS|FLETCHER JONES|WIRE|SPECTRUM|SOCALGAS|CHECKCARD|PURCHASE|LADWP|ATT DES|CHARTER COMM|RALPHS|VONS|WHOLE FOODS|CHEVRON|SHELL|ARCO|USPS|LA FITNESS|CHIPOTLE|TRUPANION|SHARP PET|JORDANS|SMILE|RUSTY|NORDSTROM|MACY|HOBBY LOBBY|MICHAELS|WALGREENS|RITE AID|DUNN-EDWARDS|VIOC|RING|BUILD\.COM|TRANSWORLD|ALL STAR|FATBURGER|OUTBACK|SHAKE SHACK|BOX THAI|RIBS USA|FRANKIE|SHARKY|VINTAGE GROCER|BAJA FRESH|SUGAR NAILS|ANYTIME WINDOWS|WEST COAST LOCK|CARFAX|STUDIO SMOG|Interest Earned|NST THE HOME|Deposit Dividend|DEBIT|ONLINE|PAYMENT|#\d{6,}/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header lines
    const lineLower = line.toLowerCase();
    if (lineLower.includes('date') && lineLower.includes('description') && lineLower.includes('amount')) {
      continue;
    }

    // Relaxed length requirement - accept any line with merchant keywords
    if (merchantPattern.test(line) && line.trim().length > 10) {
      descriptions.push({
        line: i,
        text: line.trim()
      });
      if (descriptions.length <= 10) {
        console.log(`[DEBUG] Found description at line ${i}: ${line.trim().substring(0, 60)}...`);
      }
    }
  }

  console.log(`[DEBUG] Found ${dates.length} dates, ${amounts.length} amounts, ${descriptions.length} descriptions`);

  // Step 4: Smart matching strategy
  // Strategy A: If counts are similar, try positional matching (table with separate columns)
  // Strategy B: Otherwise use proximity matching (inline or nearby)

  const usedDates = new Set<number>();
  const usedAmounts = new Set<number>();
  const usedDescriptions = new Set<number>();

  const minCount = Math.min(dates.length, amounts.length, descriptions.length);
  const maxCount = Math.max(dates.length, amounts.length, descriptions.length);
  const countsAreSimilar = minCount > 0 && (maxCount / minCount) < 2;

  if (countsAreSimilar && minCount >= 3) {
    // Strategy A: Positional matching (table format with columnar data)
    console.log(`[DEBUG] Using positional matching (table format detected)`);

    const transactionCount = Math.min(dates.length, amounts.length, descriptions.length);
    for (let i = 0; i < transactionCount; i++) {
      if (usedDates.has(i) || usedAmounts.has(i) || usedDescriptions.has(i)) continue;

      const dateMatch = dates[i];
      const desc = descriptions[i];
      const amount = amounts[i];

      // Parse the date
      let year = parseInt(dateMatch.year, 10);
      if (year < 100) {
        year = year >= 50 ? 1900 + year : 2000 + year;
      }

      const date = parseDate(`${dateMatch.month}/${dateMatch.day}/${year}`);

      if (date) {
        transactions.push({
          date,
          description: desc.text.substring(0, 100),
          amount: amount.value,
          type: 'DISBURSEMENT',
          sectionType: 'atm_debit',
          rawLine: `Positional match ${i}`
        });

        if (transactions.length <= 5) {
          console.log(`[DEBUG] Positional match ${i}: ${date.toISOString().split('T')[0]} | ${desc.text.substring(0, 30)}... | $${amount.value}`);
        }

        usedDates.add(i);
        usedAmounts.add(i);
        usedDescriptions.add(i);
      }
    }
  } else {
    // Strategy B: Proximity matching (inline or nearby format)
    console.log(`[DEBUG] Using proximity matching`);

    for (const desc of descriptions) {
      // Find nearest date: Try BEFORE description (within 50 lines for table format) or AFTER (within 10 lines)
      let nearestDate = dates
        .filter(d => d.line < desc.line && d.line > desc.line - 50 && !usedDates.has(d.line))
        .sort((a, b) => b.line - a.line)[0];

      if (!nearestDate) {
        nearestDate = dates
          .filter(d => d.line > desc.line && d.line < desc.line + 10 && !usedDates.has(d.line))
          .sort((a, b) => a.line - b.line)[0];
      }

      // Find nearest amount: Check same line first, then within 60 lines after (for table format where amounts are grouped at end)
      let nearestAmount = amounts.find(a => a.line === desc.line && !usedAmounts.has(a.line));

      if (!nearestAmount) {
        nearestAmount = amounts
          .filter(a => a.line > desc.line && a.line < desc.line + 60 && !usedAmounts.has(a.line))
          .sort((a, b) => a.line - b.line)[0];
      }

      if (nearestDate && nearestAmount) {
        // Parse the date
        let year = parseInt(nearestDate.year, 10);
        if (year < 100) {
          year = year >= 50 ? 1900 + year : 2000 + year;
        }

        const date = parseDate(`${nearestDate.month}/${nearestDate.day}/${year}`);

        if (date) {
          transactions.push({
            date,
            description: desc.text.substring(0, 100),
            amount: nearestAmount.value,
            type: 'DISBURSEMENT',
            sectionType: 'atm_debit',
            rawLine: `Lines ${nearestDate.line}-${nearestAmount.line}`
          });

          if (transactions.length <= 5) {
            console.log(`[DEBUG] Proximity matched: ${date.toISOString().split('T')[0]} | ${desc.text.substring(0, 30)}... | $${nearestAmount.value}`);
          }

          // Mark as used to avoid duplicates
          usedDates.add(nearestDate.line);
          usedAmounts.add(nearestAmount.line);
        }
      }
    }
  }

  console.log(`[DEBUG] ATM/Debit section parsed ${transactions.length} transactions using proximity matching`);
  return transactions;
}

/**
 * Parse Other Subtractions section (DISBURSEMENTS) using proximity matching
 * Handles OCR that splits transactions across multiple lines
 */
function parseOtherSubtractions(text: string): ParsedTransaction[] {
  console.log('[DEBUG] Other Subtractions section sample (first 800 chars):');
  console.log(text.substring(0, 800));
  console.log('[DEBUG] --- End of Other Subtractions sample ---');

  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  console.log(`[DEBUG] Other Subtractions section has ${lines.length} lines`);

  // Step 1: Find all dates with their line numbers
  interface DateMatch {
    line: number;
    month: string;
    day: string;
    year: string;
    raw: string;
  }
  const dates: DateMatch[] = [];
  const datePattern = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(datePattern);
    // Look for date-only lines (relaxed constraint - removed strict length limit)
    // A line is date-only if it has a date pattern and doesn't have long merchant text
    if (match) {
      const lineWithoutDate = lines[i].replace(datePattern, '').trim();
      // If line has minimal text after removing date, it's a date-only line
      if (lineWithoutDate.length < 30) {
        dates.push({
          line: i,
          month: match[1],
          day: match[2],
          year: match[3],
          raw: match[0]
        });
        if (dates.length <= 10) {
          console.log(`[DEBUG] Found date at line ${i}: ${match[0]}`);
        }
      }
    }
  }

  // Step 2: Find all amounts with their line numbers
  interface AmountMatch {
    line: number;
    value: number;
    raw: string;
  }
  const amounts: AmountMatch[] = [];
  // Match amounts either:
  // 1. On a line by themselves: "  -127.33  "
  // 2. At the end of a line with text before: "SOMETHING -127.33"
  const amountPattern = /(-?\$?[\d,]+\.\d{2})\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    const match = line.match(amountPattern);
    if (match) {
      const value = parseFloat(match[1].replace(/[$,\-]/g, ''));
      if (!isNaN(value) && value > 0) {
        amounts.push({
          line: i,
          value,
          raw: match[1]
        });
        if (amounts.length <= 10) {
          console.log(`[DEBUG] Found amount at line ${i}: ${match[1]} -> $${value}`);
        }
      }
    }
  }

  // Step 3: Find all descriptions (look for service keywords or any substantive text)
  interface DescriptionMatch {
    line: number;
    text: string;
  }
  const descriptions: DescriptionMatch[] = [];
  const merchantPattern = /WIRE|TRANSFER|FEE|SERVICE|CHARGE|INTEREST|ACH|PAYMENT|ONLINE|BILL PAY|CHECK|OVERDRAFT|RETURN|NSF|LADWP|ATT DES|CHARTER COMM|SPECTRUM|SOCALGAS|VERIZON|T-MOBILE|SPRINT|MORTGAGE|LOAN|INSURANCE|MEDICAL|DENTAL|VISION|GEICO|STATE FARM|ALLSTATE|PROGRESSIVE|#\d{6,}/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header lines
    const lineLower = line.toLowerCase();
    if (lineLower.includes('date') && lineLower.includes('description') && lineLower.includes('amount')) {
      continue;
    }

    // Relaxed length requirement
    if (merchantPattern.test(line) && line.trim().length > 10) {
      descriptions.push({
        line: i,
        text: line.trim()
      });
      if (descriptions.length <= 10) {
        console.log(`[DEBUG] Found description at line ${i}: ${line.trim().substring(0, 60)}...`);
      }
    }
  }

  console.log(`[DEBUG] Found ${dates.length} dates, ${amounts.length} amounts, ${descriptions.length} descriptions`);

  // Step 4: Smart matching strategy
  const usedDates = new Set<number>();
  const usedAmounts = new Set<number>();
  const usedDescriptions = new Set<number>();

  const minCount = Math.min(dates.length, amounts.length, descriptions.length);
  const maxCount = Math.max(dates.length, amounts.length, descriptions.length);
  const countsAreSimilar = minCount > 0 && (maxCount / minCount) < 2;

  if (countsAreSimilar && minCount >= 3) {
    // Strategy A: Positional matching
    console.log(`[DEBUG] Using positional matching (table format detected)`);

    const transactionCount = Math.min(dates.length, amounts.length, descriptions.length);
    for (let i = 0; i < transactionCount; i++) {
      if (usedDates.has(i) || usedAmounts.has(i) || usedDescriptions.has(i)) continue;

      const dateMatch = dates[i];
      const desc = descriptions[i];
      const amount = amounts[i];

      let year = parseInt(dateMatch.year, 10);
      if (year < 100) {
        year = year >= 50 ? 1900 + year : 2000 + year;
      }

      const date = parseDate(`${dateMatch.month}/${dateMatch.day}/${year}`);

      if (date) {
        transactions.push({
          date,
          description: desc.text.substring(0, 100),
          amount: amount.value,
          type: 'DISBURSEMENT',
          sectionType: 'other_subtractions',
          rawLine: `Positional match ${i}`
        });

        if (transactions.length <= 5) {
          console.log(`[DEBUG] Positional match ${i}: ${date.toISOString().split('T')[0]} | ${desc.text.substring(0, 30)}... | $${amount.value}`);
        }

        usedDates.add(i);
        usedAmounts.add(i);
        usedDescriptions.add(i);
      }
    }
  } else {
    // Strategy B: Proximity matching
    console.log(`[DEBUG] Using proximity matching`);

    for (const desc of descriptions) {
      let nearestDate = dates
        .filter(d => d.line < desc.line && d.line > desc.line - 50 && !usedDates.has(d.line))
        .sort((a, b) => b.line - a.line)[0];

      if (!nearestDate) {
        nearestDate = dates
          .filter(d => d.line > desc.line && d.line < desc.line + 10 && !usedDates.has(d.line))
          .sort((a, b) => a.line - b.line)[0];
      }

      let nearestAmount = amounts.find(a => a.line === desc.line && !usedAmounts.has(a.line));

      if (!nearestAmount) {
        nearestAmount = amounts
          .filter(a => a.line > desc.line && a.line < desc.line + 60 && !usedAmounts.has(a.line))
          .sort((a, b) => a.line - b.line)[0];
      }

      if (nearestDate && nearestAmount) {
        let year = parseInt(nearestDate.year, 10);
        if (year < 100) {
          year = year >= 50 ? 1900 + year : 2000 + year;
        }

        const date = parseDate(`${nearestDate.month}/${nearestDate.day}/${year}`);

        if (date) {
          transactions.push({
            date,
            description: desc.text.substring(0, 100),
            amount: nearestAmount.value,
            type: 'DISBURSEMENT',
            sectionType: 'other_subtractions',
            rawLine: `Lines ${nearestDate.line}-${nearestAmount.line}`
          });

          if (transactions.length <= 5) {
            console.log(`[DEBUG] Proximity matched: ${date.toISOString().split('T')[0]} | ${desc.text.substring(0, 30)}... | $${nearestAmount.value}`);
          }

          usedDates.add(nearestDate.line);
          usedAmounts.add(nearestAmount.line);
        }
      }
    }
  }

  console.log(`[DEBUG] Other Subtractions section parsed ${transactions.length} transactions using smart matching`);
  return transactions;
}

/**
 * Parse Checks section (DISBURSEMENTS)
 * Format: DATE CHECK# AMOUNT DATE CHECK# AMOUNT (two columns)
 */
function parseChecksSection(text: string): ParsedTransaction[] {
  console.log('[DEBUG] Checks section sample (first 800 chars):');
  console.log(text.substring(0, 800));
  console.log('[DEBUG] --- End of Checks sample ---');

  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  console.log(`[DEBUG] Checks section has ${lines.length} lines`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) continue;

    // Skip header lines
    const lineLower = line.toLowerCase();
    if (lineLower.includes('date') ||
        lineLower.includes('check') ||
        lineLower.includes('amount')) {
      continue;
    }

    // Log first 10 non-header lines for debugging
    if (transactions.length < 3 && line.trim().length > 10) {
      console.log(`[DEBUG] Checks line ${i}: "${line}"`);
    }

    // Pattern: DATE CHECK# AMOUNT (may appear twice per line)
    // More flexible pattern to handle OCR errors - check# might have garbage chars
    const checkPattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+[+*#]*\s*(\d+)\s*[*+]*\s+[^\d\-]*\s*-?([\d,]+\.\d{2})/g;

    let match;
    let matchCount = 0;
    while ((match = checkPattern.exec(line)) !== null) {
      const date = parseDate(match[1]);
      if (!date) {
        console.log(`[DEBUG] Failed to parse check date: "${match[1]}" from line: "${line}"`);
        continue;
      }

      const amount = parseFloat(match[3].replace(/,/g, ''));
      if (isNaN(amount) || amount <= 0) continue;

      transactions.push({
        date,
        description: `Check #${match[2]}`,
        amount,
        type: 'DISBURSEMENT',
        sectionType: 'checks',
        checkNumber: match[2],
        rawLine: line
      });

      matchCount++;
      if (transactions.length <= 6) {
        console.log(`[DEBUG] Parsed Check: ${date.toISOString().split('T')[0]} | Check #${match[2]} | $${amount}`);
      }
    }

    if (matchCount > 0 && i < 5) {
      console.log(`[DEBUG] Checks line ${i} matched ${matchCount} checks`);
    }
  }

  console.log(`[DEBUG] Checks section parsed ${transactions.length} transactions`);
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
