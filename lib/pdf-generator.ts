import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import type {
  CaseInformation,
  Assets,
  Transaction,
  AccountingSummary,
  ScheduleAData,
  ScheduleCData,
} from '@/types';

interface PDFData {
  caseInfo: Partial<CaseInformation>;
  assets: Assets;
  transactions: Transaction[];
  summary: AccountingSummary;
  scheduleA: ScheduleAData;
  scheduleC: ScheduleCData;
}

export async function generatePDF(data: PDFData) {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Add Summary Page (GC-400(SUM))
  addSummaryPage(pdfDoc, data, timesRoman, timesRomanBold);

  // Add Property on Hand at Beginning
  addPropertyOnHandBeginning(pdfDoc, data, timesRoman, timesRomanBold);

  // Add Schedule A - Receipts
  addScheduleA(pdfDoc, data, timesRoman, timesRomanBold);

  // Add Schedule C - Disbursements
  addScheduleC(pdfDoc, data, timesRoman, timesRomanBold);

  // Add Property on Hand at End
  addPropertyOnHandEnd(pdfDoc, data, timesRoman, timesRomanBold);

  // Save and download
  const pdfBytes = await pdfDoc.save();
  downloadPDF(pdfBytes, data.caseInfo);
}

function addSummaryPage(
  pdfDoc: PDFDocument,
  data: PDFData,
  font: any,
  boldFont: any
) {
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  let y = height - 50;

  // Header
  page.drawText('SUMMARY OF ACCOUNT', {
    x: 50,
    y,
    size: 14,
    font: boldFont,
  });

  y -= 20;
  page.drawText(`Case: ${data.caseInfo.trustConservatorshipName || 'N/A'}`, {
    x: 50,
    y,
    size: 10,
    font,
  });

  y -= 15;
  page.drawText(`Case Number: ${data.caseInfo.caseNumber || 'N/A'}`, {
    x: 50,
    y,
    size: 10,
    font,
  });

  y -= 30;
  page.drawText('CHARGES', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 20;
  const charges = [
    ['Property on hand at beginning of period:', ''],
    ['  Cash', formatCurrency(data.summary.beginningCashAssets)],
    ['  Non-cash', formatCurrency(data.summary.beginningNonCashAssets)],
    ['Receipts during period', formatCurrency(data.summary.totalReceipts)],
  ];

  charges.forEach(([label, value]) => {
    page.drawText(label, { x: 70, y, size: 10, font });
    if (value) {
      page.drawText(value, { x: 450, y, size: 10, font });
    }
    y -= 15;
  });

  const totalCharges =
    data.summary.beginningCashAssets +
    data.summary.beginningNonCashAssets +
    data.summary.totalReceipts;

  y -= 10;
  page.drawText('TOTAL CHARGES', {
    x: 70,
    y,
    size: 11,
    font: boldFont,
  });
  page.drawText(formatCurrency(totalCharges), {
    x: 450,
    y,
    size: 11,
    font: boldFont,
  });

  y -= 30;
  page.drawText('CREDITS', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 20;
  const credits = [
    ['Disbursements during period', formatCurrency(data.summary.totalDisbursements)],
    ['Property on hand at end of period:', ''],
    ['  Cash', formatCurrency(data.summary.endingCashAssets)],
    ['  Non-cash', formatCurrency(data.summary.endingNonCashAssets)],
  ];

  credits.forEach(([label, value]) => {
    page.drawText(label, { x: 70, y, size: 10, font });
    if (value) {
      page.drawText(value, { x: 450, y, size: 10, font });
    }
    y -= 15;
  });

  const totalCredits =
    data.summary.totalDisbursements +
    data.summary.endingCashAssets +
    data.summary.endingNonCashAssets;

  y -= 10;
  page.drawText('TOTAL CREDITS', {
    x: 70,
    y,
    size: 11,
    font: boldFont,
  });
  page.drawText(formatCurrency(totalCredits), {
    x: 450,
    y,
    size: 11,
    font: boldFont,
  });

  // Footer
  y = 50;
  page.drawText('Form GC-400(SUM)', {
    x: 50,
    y,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('Page 1', {
    x: width - 100,
    y,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

function addPropertyOnHandBeginning(
  pdfDoc: PDFDocument,
  data: PDFData,
  font: any,
  boldFont: any
) {
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  let y = height - 50;

  // Header
  page.drawText('PROPERTY ON HAND AT BEGINNING OF ACCOUNTING PERIOD', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 20;
  page.drawText(`Case: ${data.caseInfo.trustConservatorshipName || 'N/A'}`, {
    x: 50,
    y,
    size: 10,
    font,
  });

  y -= 30;
  page.drawText('Schedule PH(1) - Cash Assets', {
    x: 50,
    y,
    size: 11,
    font: boldFont,
  });

  y -= 20;
  data.assets.bankAccounts.forEach((account) => {
    page.drawText(
      `${account.bankName} - Account ending in ${account.accountNumber}`,
      { x: 70, y, size: 10, font }
    );
    page.drawText(formatCurrency(account.openingBalance), {
      x: 450,
      y,
      size: 10,
      font,
    });
    y -= 15;
  });

  y -= 10;
  const totalCash = data.assets.bankAccounts.reduce(
    (sum, acc) => sum + acc.openingBalance,
    0
  );
  page.drawText('TOTAL CASH ASSETS', {
    x: 70,
    y,
    size: 11,
    font: boldFont,
  });
  page.drawText(formatCurrency(totalCash), {
    x: 450,
    y,
    size: 11,
    font: boldFont,
  });

  y -= 30;
  page.drawText('Schedule PH(2) - Non-Cash Assets', {
    x: 50,
    y,
    size: 11,
    font: boldFont,
  });

  y -= 20;
  data.assets.realProperty.forEach((property) => {
    const text = property.address.length > 60
      ? property.address.substring(0, 60) + '...'
      : property.address;
    page.drawText(text, { x: 70, y, size: 10, font });
    page.drawText(formatCurrency(property.appraisedValue), {
      x: 450,
      y,
      size: 10,
      font,
    });
    y -= 15;
  });

  data.assets.otherNonCashAssets.forEach((asset) => {
    page.drawText(asset.description, { x: 70, y, size: 10, font });
    page.drawText(formatCurrency(asset.value), {
      x: 450,
      y,
      size: 10,
      font,
    });
    y -= 15;
  });

  const totalNonCash =
    data.assets.realProperty.reduce((sum, p) => sum + p.appraisedValue, 0) +
    data.assets.otherNonCashAssets.reduce((sum, a) => sum + a.value, 0);

  y -= 10;
  page.drawText('TOTAL NON-CASH ASSETS', {
    x: 70,
    y,
    size: 11,
    font: boldFont,
  });
  page.drawText(formatCurrency(totalNonCash), {
    x: 450,
    y,
    size: 11,
    font: boldFont,
  });

  // Footer
  y = 50;
  page.drawText('Form GC-400(PH)', {
    x: 50,
    y,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

function addScheduleA(
  pdfDoc: PDFDocument,
  data: PDFData,
  font: any,
  boldFont: any
) {
  const schedules = [
    { title: 'Schedule A(2) - Interest', transactions: data.scheduleA.A2_Interest },
    {
      title: 'Schedule A(3) - Pensions, Annuities, and Other Regular Periodic Payments',
      transactions: data.scheduleA.A3_PensionsAnnuities,
    },
    {
      title: 'Schedule A(5) - Social Security, Veterans\' Benefits, Other Public Benefits',
      transactions: data.scheduleA.A5_SocialSecurityVA,
    },
    { title: 'Schedule A(6) - Other Receipts', transactions: data.scheduleA.A6_OtherReceipts },
  ];

  schedules.forEach((schedule) => {
    if (schedule.transactions.length > 0) {
      addTransactionSchedule(
        pdfDoc,
        schedule.title,
        schedule.transactions,
        font,
        boldFont
      );
    }
  });
}

function addScheduleC(
  pdfDoc: PDFDocument,
  data: PDFData,
  font: any,
  boldFont: any
) {
  // Add each disbursement schedule
  if (data.scheduleC.C1_Caregiver.length > 0) {
    addTransactionSchedule(
      pdfDoc,
      'Schedule C(1) - Caregiver Expenses',
      data.scheduleC.C1_Caregiver,
      font,
      boldFont
    );
  }

  // C2 - Residential Facility (combine all subcategories)
  const c2All = Object.values(data.scheduleC.C2_ResidentialFacility).flat();
  if (c2All.length > 0) {
    addTransactionSchedule(
      pdfDoc,
      'Schedule C(2) - Residential or Long-Term Care Facility Expenses',
      c2All,
      font,
      boldFont
    );
  }

  if (data.scheduleC.C4_FiduciaryAttorney.length > 0) {
    addTransactionSchedule(
      pdfDoc,
      'Schedule C(4) - Fiduciary and Attorney Fees',
      data.scheduleC.C4_FiduciaryAttorney,
      font,
      boldFont
    );
  }

  if (data.scheduleC.C5_GeneralAdmin.length > 0) {
    addTransactionSchedule(
      pdfDoc,
      'Schedule C(5) - General Administration Expenses',
      data.scheduleC.C5_GeneralAdmin,
      font,
      boldFont
    );
  }

  if (data.scheduleC.C6_Medical.length > 0) {
    addTransactionSchedule(
      pdfDoc,
      'Schedule C(6) - Medical Expenses',
      data.scheduleC.C6_Medical,
      font,
      boldFont
    );
  }

  // C7 - Living Expenses (combine all subcategories)
  const c7All = Object.values(data.scheduleC.C7_LivingExpenses).flat();
  if (c7All.length > 0) {
    addTransactionSchedule(
      pdfDoc,
      'Schedule C(7) - Living Expenses',
      c7All,
      font,
      boldFont
    );
  }

  if (data.scheduleC.C8_Taxes.length > 0) {
    addTransactionSchedule(
      pdfDoc,
      'Schedule C(8) - Taxes',
      data.scheduleC.C8_Taxes,
      font,
      boldFont
    );
  }

  if (data.scheduleC.C9_OtherDisbursements.length > 0) {
    addTransactionSchedule(
      pdfDoc,
      'Schedule C(9) - Other Disbursements',
      data.scheduleC.C9_OtherDisbursements,
      font,
      boldFont
    );
  }
}

function addTransactionSchedule(
  pdfDoc: PDFDocument,
  title: string,
  transactions: Transaction[],
  font: any,
  boldFont: any
) {
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();

  let y = height - 50;

  // Title
  page.drawText(title, {
    x: 50,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 30;

  // Headers
  page.drawText('Date', { x: 50, y, size: 9, font: boldFont });
  page.drawText('Description', { x: 120, y, size: 9, font: boldFont });
  page.drawText('Amount', { x: 480, y, size: 9, font: boldFont });

  y -= 15;

  // Transactions
  transactions.forEach((txn) => {
    if (y < 100) {
      // Need new page
      const newPage = pdfDoc.addPage([612, 792]);
      y = height - 50;
    }

    page.drawText(format(txn.date, 'MM/dd/yyyy'), {
      x: 50,
      y,
      size: 9,
      font,
    });

    const desc = txn.description.length > 40
      ? txn.description.substring(0, 40) + '...'
      : txn.description;
    page.drawText(desc, { x: 120, y, size: 9, font });

    page.drawText(formatCurrency(txn.amount), {
      x: 480,
      y,
      size: 9,
      font,
    });

    y -= 12;
  });

  // Total
  y -= 10;
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  page.drawText('TOTAL:', {
    x: 50,
    y,
    size: 10,
    font: boldFont,
  });
  page.drawText(formatCurrency(total), {
    x: 480,
    y,
    size: 10,
    font: boldFont,
  });
}

function addPropertyOnHandEnd(
  pdfDoc: PDFDocument,
  data: PDFData,
  font: any,
  boldFont: any
) {
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  let y = height - 50;

  page.drawText('PROPERTY ON HAND AT END OF ACCOUNTING PERIOD', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 30;
  page.drawText('Schedule E(1) - Cash Assets', {
    x: 50,
    y,
    size: 11,
    font: boldFont,
  });

  y -= 20;
  data.assets.bankAccounts.forEach((account) => {
    page.drawText(
      `${account.bankName} - Account ending in ${account.accountNumber}`,
      { x: 70, y, size: 10, font }
    );
    page.drawText(formatCurrency(account.closingBalance), {
      x: 450,
      y,
      size: 10,
      font,
    });
    y -= 15;
  });

  y -= 10;
  const totalCash = data.assets.bankAccounts.reduce(
    (sum, acc) => sum + acc.closingBalance,
    0
  );
  page.drawText('TOTAL CASH ASSETS', {
    x: 70,
    y,
    size: 11,
    font: boldFont,
  });
  page.drawText(formatCurrency(totalCash), {
    x: 450,
    y,
    size: 11,
    font: boldFont,
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function downloadPDF(pdfBytes: Uint8Array, caseInfo: Partial<CaseInformation>) {
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `GC-400_${caseInfo.caseNumber?.replace(/\s/g, '_') || 'Accounting'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
