import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import { PetitionData } from '@/types';

/**
 * Generate a petition PDF document from scratch based on the Drexler Trust template
 * This creates a properly formatted legal petition document
 */
export async function generatePetition(
  data: PetitionData,
  outputPath: string
): Promise<void> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add pages
    const page1 = pdfDoc.addPage([612, 792]); // 8.5" x 11" in points
    const page2 = pdfDoc.addPage([612, 792]);
    const page3 = pdfDoc.addPage([612, 792]);
    const page4 = pdfDoc.addPage([612, 792]);
    const page5 = pdfDoc.addPage([612, 792]);
    const page6 = pdfDoc.addPage([612, 792]);

    // Embed fonts
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
    const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Page 1 - Title page with attorney info and case caption
    drawPage1(page1, data, courierFont, courierBoldFont, timesFont, timesBoldFont);

    // Page 2 - Period of Account and Summary
    drawPage2(page2, data, courierFont, timesFont);

    // Page 3 - Additional Probate Code Requirements
    drawPage3(page3, data, courierFont, timesFont);

    // Page 4 - Fees, Bond, and Prayer for Relief
    drawPage4(page4, data, courierFont, timesFont);

    // Page 5 - Signature page
    drawPage5(page5, data, courierFont, timesFont);

    // Page 6 - Verification page
    drawPage6(page6, data, courierFont, timesFont);

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`Petition PDF generated and saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error generating petition PDF:', error);
    throw error;
  }
}

/**
 * Draw Page 1: Attorney information and case caption
 */
function drawPage1(
  page: PDFPage,
  data: PetitionData,
  courierFont: PDFFont,
  courierBoldFont: PDFFont,
  timesFont: PDFFont,
  timesBoldFont: PDFFont
): void {
  const { width, height } = page.getSize();
  const leftMargin = 72; // 1 inch
  const lineHeight = 12;

  let y = height - 100; // Start position

  // Attorney information (top left)
  page.drawText(data.attorneyName.toUpperCase() + ', ESQ. SBN ' + data.attorneyBarNumber, {
    x: leftMargin,
    y: y,
    size: 10,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(data.attorneyFirmName.toUpperCase(), {
    x: leftMargin,
    y: y,
    size: 10,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(data.attorneyAddress.toUpperCase(), {
    x: leftMargin,
    y: y,
    size: 10,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`${data.attorneyCity.toUpperCase()} ${data.attorneyState.toUpperCase()} ${data.attorneyZip}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(data.attorneyPhone, {
    x: leftMargin,
    y: y,
    size: 10,
    font: courierFont,
  });

  // Filing information (top right)
  const filingText = [
    'Electronically FILED by',
    `${data.courtName},`,
    `County of ${data.courtCounty}`,
    `${data.petitionDate} 8:00 AM`,
    'David W. Slayton,',
    'Executive Officer/Clerk of Court,',
    'By B. Rodriguez, Deputy Clerk'
  ];

  let filingY = height - 100;
  filingText.forEach(line => {
    page.drawText(line, {
      x: width - 250,
      y: filingY,
      size: 8,
      font: courierFont,
    });
    filingY -= 10;
  });

  // Court name (centered)
  y = height - 250;
  const courtNameText = data.courtName.toUpperCase();
  const courtNameWidth = timesBoldFont.widthOfTextAtSize(courtNameText, 14);
  page.drawText(courtNameText, {
    x: (width - courtNameWidth) / 2,
    y: y,
    size: 14,
    font: timesBoldFont,
  });
  y -= lineHeight + 8;

  const countyText = `FOR THE COUNTY OF ${data.courtCounty.toUpperCase()}`;
  const countyWidth = timesBoldFont.widthOfTextAtSize(countyText, 14);
  page.drawText(countyText, {
    x: (width - countyWidth) / 2,
    y: y,
    size: 14,
    font: timesBoldFont,
  });
  y -= lineHeight * 3;

  // Case caption
  page.drawText(data.trustName.toUpperCase(), {
    x: leftMargin + 50,
    y: y,
    size: 11,
    font: courierFont,
  });

  // Case number and title (right aligned)
  const caseY = y;
  page.drawText('Case No.: ' + data.caseNumber, {
    x: width - 300,
    y: caseY,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight + 5;

  const petitionTitle = `${data.accountType.toUpperCase()} ACCOUNT CURRENT AND`;
  page.drawText(petitionTitle, {
    x: width - 400,
    y: y,
    size: 11,
    font: courierBoldFont,
  });
  y -= lineHeight;

  page.drawText('REPORT OF TRUSTEE; FOR', {
    x: width - 400,
    y: y,
    size: 11,
    font: courierBoldFont,
  });
  y -= lineHeight;

  page.drawText('ALLOWANCE OF FEES TO ATTORNEY', {
    x: width - 400,
    y: y,
    size: 11,
    font: courierBoldFont,
  });
  y -= lineHeight;

  page.drawText(';PETITION TO INCREASE BOND', {
    x: width - 400,
    y: y,
    size: 11,
    font: courierBoldFont,
  });
  y -= lineHeight * 2;

  page.drawText(`DATE: ${data.hearingDate} ${data.hearingTime}`, {
    x: width - 400,
    y: y,
    size: 11,
    font: courierBoldFont,
  });
  y -= lineHeight;

  page.drawText(`TIME:`, {
    x: width - 400,
    y: y,
    size: 11,
    font: courierBoldFont,
  });
  y -= lineHeight;

  page.drawText(`DEPT: ${data.hearingDepartment}`, {
    x: width - 400,
    y: y,
    size: 11,
    font: courierBoldFont,
  });

  // Main petition text
  y -= lineHeight * 3;

  const petitionText = `1. Petitioner ${data.petitionerName}, ${data.petitionerTitle} of the ${data.trustorName}`;
  page.drawText(petitionText, {
    x: leftMargin + 36,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`Revocable Trust, file this ${data.accountType} Account Current, and`, {
    x: leftMargin + 36,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('state as follows:', {
    x: leftMargin + 36,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  page.drawText('2. Appointment and background:', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`Petitioner is the ${data.petitionerTitle} of the ${data.trustorName} Revocale Trust,`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('pursuant to Order of the above-entitled Court, dated ' + data.appointmentDate + '.', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });

  // Footer
  page.drawText('- 1 -', {
    x: (width - courierFont.widthOfTextAtSize('- 1 -', 10)) / 2,
    y: 50,
    size: 10,
    font: courierFont,
  });

  page.drawText(`${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE`, {
    x: (width - courierFont.widthOfTextAtSize(`${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE`, 9)) / 2,
    y: 35,
    size: 9,
    font: courierFont,
  });
}

/**
 * Draw Page 2: Period of Account and Summary
 */
function drawPage2(
  page: PDFPage,
  data: PetitionData,
  courierFont: PDFFont,
  timesFont: PDFFont
): void {
  const { width, height } = page.getSize();
  const leftMargin = 72;
  const lineHeight = 12;

  let y = height - 100;

  // Period of Account
  page.drawText('3. Period of Account', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`This Account and Report covers the period from ${data.periodStartDate}`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`until ${data.periodEndDate}.`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  // Summary of Account
  page.drawText('4. Summary of Account and Supporting Schedules.', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`The Trustor resides at ${data.trustorAddress}.`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  // Veteran's benefits
  const veteranText = data.trustorIsVeteran
    ? "Trustor is a recipient of Veteran's benefits. Notice to the Veteran's"
    : "Trustor is not a recipient of Veteran's benefits. No notice";

  page.drawText(veteranText, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  if (data.trustorIsVeteran) {
    page.drawText("Administration is required.", {
      x: leftMargin,
      y: y,
      size: 11,
      font: courierFont,
    });
  } else {
    page.drawText("to the Veteran's Administration is required.", {
      x: leftMargin,
      y: y,
      size: 11,
      font: courierFont,
    });
  }
  y -= lineHeight * 2;

  // State hospital
  const hospitalText = data.trustorIsInStateHospital
    ? "Trustor is a patient or on leave of absence from a state hospital."
    : "Trustor is not a patient or on leave of absence from a state";

  page.drawText(hospitalText, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  if (!data.trustorIsInStateHospital) {
    page.drawText('hospital. No notice to the State Department of Developmental', {
      x: leftMargin,
      y: y,
      size: 11,
      font: courierFont,
    });
    y -= lineHeight;

    page.drawText('Services is required.', {
      x: leftMargin,
      y: y,
      size: 11,
      font: courierFont,
    });
  }
  y -= lineHeight * 2;

  // Additional Probate Code Requirements
  page.drawText('5. Additional Probate Code Accounting Requirements:', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  page.drawText('The following information is provided to satisfy specific', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('Probate Code provisions:', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  page.drawText('A. Probate Code Section 1063', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('Subsection (a): Schedule E of Exhibit A sets forth the fair', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('market value of trust assets on hand as of the beginning and', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('as of the end of the accounting periods. Subsection (b):', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('There were no purchases or other changes in the form of', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('assets occurring during the period of the account, requiring', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('a schedule of same.', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });

  // Footer
  page.drawText('- 2 -', {
    x: (width - courierFont.widthOfTextAtSize('- 2 -', 10)) / 2,
    y: 50,
    size: 10,
    font: courierFont,
  });

  page.drawText(`${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE`, {
    x: (width - courierFont.widthOfTextAtSize(`${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE`, 9)) / 2,
    y: 35,
    size: 9,
    font: courierFont,
  });
}

/**
 * Draw Page 3: Additional Probate Code sections
 */
function drawPage3(
  page: PDFPage,
  data: PetitionData,
  courierFont: PDFFont,
  timesFont: PDFFont
): void {
  const { width, height } = page.getSize();
  const leftMargin = 72;
  const lineHeight = 12;

  let y = height - 100;

  // Subsection (c) through (g)
  const subsections = [
    'Subsection (c): An allocation of receipts and disbursements',
    'between principal and income in any case where an estate of a',
    'decedent or trust will be distributed to an income',
    'beneficiary is not applicable.',
    '',
    'Subsection ( d ): There is no specifically devised property',
    'in the trustee\'s possession, therefore, no separate',
    'schedule accounting for income, disbursements and proceeds of',
    'sale is required.',
    '',
    'Subsection (e): Because no interest is to be paid (under',
    'estate administration sections), no schedule showing the',
    'calculation of interest is required.',
  ];

  subsections.forEach(line => {
    page.drawText(line, {
      x: leftMargin,
      y: y,
      size: 11,
      font: courierFont,
    });
    y -= lineHeight;
  });

  // Footer
  page.drawText('- 3 -', {
    x: (width - courierFont.widthOfTextAtSize('- 3 -', 10)) / 2,
    y: 50,
    size: 10,
    font: courierFont,
  });

  page.drawText(`${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE`, {
    x: (width - courierFont.widthOfTextAtSize(`${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE`, 9)) / 2,
    y: 35,
    size: 9,
    font: courierFont,
  });
}

/**
 * Draw Page 4: Fees, Bond, and Prayer for Relief
 */
function drawPage4(
  page: PDFPage,
  data: PetitionData,
  courierFont: PDFFont,
  timesFont: PDFFont
): void {
  const { width, height } = page.getSize();
  const leftMargin = 72;
  const lineHeight = 12;

  let y = height - 100;

  // Attorney fees section
  page.drawText('7. Attorney\'s Services and Fees:', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  page.drawText('During the period of this account and in the course of the', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('management and administration of the estate, it was necessary', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`for Petitioner to employ the ${data.attorneyFirmName}, as`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  const feeAmount = data.attorneyFeesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  page.drawText(`her attorney of record. ${data.attorneyName}, Esq. was paid $${feeAmount}`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('and field a declaration to request approval of her fees.', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  // Bond section
  page.drawText('11. Bond', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  const currentBond = data.currentBondAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  page.drawText(`Petitioner is bonded herein in the amount of $${currentBond}`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  const newBond = data.newBondAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  page.drawText(`which bond is not sufficient. Bond shall be increased to`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`$${newBond}`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  // Prayer for Relief
  page.drawText('WHEREFORE, Petitioners pray for an order of this Court as', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('follows:', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  page.drawText(`1. That this ${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE, FOR`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  page.drawText('ALLOWANCE OF FEES TO ATTORNEY FOR TRUSTEE, for', {
    x: leftMargin + 36,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`the period from ${data.periodStartDate} until  ${data.periodEndDate} be settled,`, {
    x: leftMargin + 36,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('allowed, and approved as filed:', {
    x: leftMargin + 36,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  page.drawText(`2. That all of the acts of the Petitioner as ${data.petitionerTitle} of the`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  page.drawText(`${data.trustorName} Revocable Trust, be confirmed and approved.`, {
    x: leftMargin + 36,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`3. Attorney fees in the amount of $${feeAmount} paid by the`, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText('Petitioner to be approved.', {
    x: leftMargin + 36,
    y: y,
    size: 11,
    font: courierFont,
  });

  // Footer
  page.drawText('- 4 -', {
    x: (width - courierFont.widthOfTextAtSize('- 4 -', 10)) / 2,
    y: 50,
    size: 10,
    font: courierFont,
  });

  page.drawText(`${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE`, {
    x: (width - courierFont.widthOfTextAtSize(`${data.accountType.toUpperCase()} ACCOUNT CURRENT AND REPORT OF TRUSTEE`, 9)) / 2,
    y: 35,
    size: 9,
    font: courierFont,
  });
}

/**
 * Draw Page 5: Signature page
 */
function drawPage5(
  page: PDFPage,
  data: PetitionData,
  courierFont: PDFFont,
  timesFont: PDFFont
): void {
  const { width, height } = page.getSize();
  const leftMargin = 72;
  const lineHeight = 12;

  let y = height - 100;

  page.drawText('4. For such other orders as the Court deems proper.', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 8;

  // Date and signature lines
  page.drawText(data.petitionDate, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });

  page.drawText('_____________________', {
    x: width - 250,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(`${data.attorneyName}, Esq.`, {
    x: width - 250,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 3;

  page.drawText(data.petitionDate + '.', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });

  page.drawText('_____________________', {
    x: width - 250,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(data.petitionerName, {
    x: width - 250,
    y: y,
    size: 11,
    font: courierFont,
  });

  // Footer
  page.drawText('- 1 -', {
    x: (width - courierFont.widthOfTextAtSize('- 1 -', 10)) / 2,
    y: 50,
    size: 10,
    font: courierFont,
  });
}

/**
 * Draw Page 6: Verification page
 */
function drawPage6(
  page: PDFPage,
  data: PetitionData,
  courierFont: PDFFont,
  timesFont: PDFFont
): void {
  const { width, height } = page.getSize();
  const leftMargin = 72;
  const lineHeight = 12;

  let y = height - 100;

  page.drawText('VERIFICATION', {
    x: leftMargin + 200,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight * 2;

  const verificationText = [
    `I, ${data.petitionerName}, am the petitioner and ${data.petitionerTitle} in the above-`,
    'entitled proceeding. have read the foregoing petition and know its',
    'contents. I declare that the contents are true of my own',
    'knowledge, except as to those matters which are stated on',
    'information and belief. As to those matters, I believe them to be',
    'true.',
    '',
    'I declare under penalty of perjury under the laws of the State of',
    'California that the foregoing is true and correct and that this',
    'verification was executed.',
    '',
    `Dated; ${data.petitionDate}`,
  ];

  verificationText.forEach(line => {
    page.drawText(line, {
      x: leftMargin,
      y: y,
      size: 11,
      font: courierFont,
    });
    y -= lineHeight;
  });

  y -= lineHeight * 2;

  page.drawText('_____________________', {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });
  y -= lineHeight;

  page.drawText(data.petitionerName, {
    x: leftMargin,
    y: y,
    size: 11,
    font: courierFont,
  });

  // Footer
  page.drawText('- 1 -', {
    x: (width - courierFont.widthOfTextAtSize('- 1 -', 10)) / 2,
    y: 50,
    size: 10,
    font: courierFont,
  });

  page.drawText('SUPPLEMENT TO CLEAR NOTES', {
    x: (width - courierFont.widthOfTextAtSize('SUPPLEMENT TO CLEAR NOTES', 9)) / 2,
    y: 35,
    size: 9,
    font: courierFont,
  });
}
