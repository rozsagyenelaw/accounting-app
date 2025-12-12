import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export interface FormField {
  name: string;
  value: string | boolean;
  type?: 'text' | 'checkbox' | 'dropdown';
}

export interface AccountingData {
  caseNumber?: string;
  trustName?: string;
  accountPeriodStart?: string;
  accountPeriodEnd?: string;
  cashAssetsBeginning?: number;
  nonCashAssets?: number;
  receipts?: number;
  disbursements?: number;
  cashAssetsEnding?: number;
  // Schedule A - Receipts
  interestReceipts?: number;
  pensionReceipts?: number;
  socialSecurityReceipts?: number;
  otherReceipts?: number;
  // Schedule C - Disbursements
  caregiverExpenses?: number;
  residentialCareExpenses?: number;
  fiduciaryFees?: number;
  livingExpenses?: number;
  medicalExpenses?: number;
  otherDisbursements?: number;
  // Detailed line items
  transactions?: Array<{
    date: string;
    description: string;
    amount: number;
    category: string;
    schedule: string;
  }>;
}

/**
 * Fill a PDF form with accounting data
 * @param templatePath Path to the template PDF file
 * @param data Accounting data to fill into the form
 * @param outputPath Path where the filled PDF should be saved
 */
export async function fillPdfForm(
  templatePath: string,
  data: AccountingData,
  outputPath: string
): Promise<void> {
  try {
    // Read the template PDF
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Get all form fields
    const fields = form.getFields();
    console.log(`Found ${fields.length} fields in the PDF form`);

    // Map our data to common field names in GC-400/GC-405 forms
    const fieldMappings: Record<string, any> = {
      // Case information
      'case_number': data.caseNumber,
      'caseNumber': data.caseNumber,
      'trust_name': data.trustName,
      'trustName': data.trustName,
      'estate_name': data.trustName,

      // Account period
      'period_start': data.accountPeriodStart,
      'periodStart': data.accountPeriodStart,
      'period_end': data.accountPeriodEnd,
      'periodEnd': data.accountPeriodEnd,

      // Summary amounts
      'cash_assets_beginning': data.cashAssetsBeginning?.toFixed(2),
      'cashAssetsBeginning': data.cashAssetsBeginning?.toFixed(2),
      'non_cash_assets': data.nonCashAssets?.toFixed(2),
      'nonCashAssets': data.nonCashAssets?.toFixed(2),
      'total_receipts': data.receipts?.toFixed(2),
      'receipts': data.receipts?.toFixed(2),
      'total_disbursements': data.disbursements?.toFixed(2),
      'disbursements': data.disbursements?.toFixed(2),
      'cash_assets_ending': data.cashAssetsEnding?.toFixed(2),
      'cashAssetsEnding': data.cashAssetsEnding?.toFixed(2),

      // Schedule A - Receipts
      'interest_receipts': data.interestReceipts?.toFixed(2),
      'interestReceipts': data.interestReceipts?.toFixed(2),
      'pension_receipts': data.pensionReceipts?.toFixed(2),
      'pensionReceipts': data.pensionReceipts?.toFixed(2),
      'social_security_receipts': data.socialSecurityReceipts?.toFixed(2),
      'socialSecurityReceipts': data.socialSecurityReceipts?.toFixed(2),
      'other_receipts': data.otherReceipts?.toFixed(2),
      'otherReceipts': data.otherReceipts?.toFixed(2),

      // Schedule C - Disbursements
      'caregiver_expenses': data.caregiverExpenses?.toFixed(2),
      'caregiverExpenses': data.caregiverExpenses?.toFixed(2),
      'residential_care_expenses': data.residentialCareExpenses?.toFixed(2),
      'residentialCareExpenses': data.residentialCareExpenses?.toFixed(2),
      'fiduciary_fees': data.fiduciaryFees?.toFixed(2),
      'fiduciaryFees': data.fiduciaryFees?.toFixed(2),
      'living_expenses': data.livingExpenses?.toFixed(2),
      'livingExpenses': data.livingExpenses?.toFixed(2),
      'medical_expenses': data.medicalExpenses?.toFixed(2),
      'medicalExpenses': data.medicalExpenses?.toFixed(2),
      'other_disbursements': data.otherDisbursements?.toFixed(2),
      'otherDisbursements': data.otherDisbursements?.toFixed(2),
    };

    // Fill in the form fields
    for (const field of fields) {
      const fieldName = field.getName();
      const fieldValue = fieldMappings[fieldName];

      if (fieldValue !== undefined && fieldValue !== null) {
        try {
          if (field.constructor.name === 'PDFTextField') {
            const textField = field as PDFTextField;
            textField.setText(String(fieldValue));
          } else if (field.constructor.name === 'PDFCheckBox') {
            const checkbox = field as PDFCheckBox;
            if (typeof fieldValue === 'boolean') {
              if (fieldValue) {
                checkbox.check();
              } else {
                checkbox.uncheck();
              }
            }
          } else if (field.constructor.name === 'PDFDropdown') {
            const dropdown = field as PDFDropdown;
            dropdown.select(String(fieldValue));
          }
          console.log(`Filled field: ${fieldName} = ${fieldValue}`);
        } catch (error) {
          console.warn(`Could not fill field ${fieldName}:`, error);
        }
      }
    }

    // Flatten the form to make it read-only (optional)
    // form.flatten();

    // Save the filled PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`PDF form filled and saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error filling PDF form:', error);
    throw error;
  }
}

/**
 * Extract field names from a PDF form for debugging
 * @param pdfPath Path to the PDF file
 */
export async function extractPdfFields(pdfPath: string): Promise<Array<{ name: string; type: string }>> {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    return fields.map(field => ({
      name: field.getName(),
      type: field.constructor.name,
    }));
  } catch (error) {
    console.error('Error extracting PDF fields:', error);
    throw error;
  }
}

/**
 * Fill PDF with transaction line items
 * This function handles filling in detailed transaction tables
 */
export async function fillTransactionDetails(
  templatePath: string,
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    category: string;
  }>,
  outputPath: string,
  schedule: 'A' | 'C' | 'E'
): Promise<void> {
  try {
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Fill transaction line items
    // Most accounting forms have numbered rows (e.g., line_1_date, line_1_description, line_1_amount)
    transactions.forEach((transaction, index) => {
      const lineNum = index + 1;
      const prefix = `schedule_${schedule}_line_${lineNum}`;

      try {
        // Try various field name patterns
        const dateFieldNames = [`${prefix}_date`, `line_${lineNum}_date`, `date_${lineNum}`];
        const descFieldNames = [`${prefix}_description`, `line_${lineNum}_description`, `desc_${lineNum}`];
        const amountFieldNames = [`${prefix}_amount`, `line_${lineNum}_amount`, `amount_${lineNum}`];

        // Fill date
        for (const fieldName of dateFieldNames) {
          try {
            const field = form.getTextField(fieldName);
            field.setText(transaction.date);
            break;
          } catch (e) {
            // Field doesn't exist, try next name
          }
        }

        // Fill description
        for (const fieldName of descFieldNames) {
          try {
            const field = form.getTextField(fieldName);
            field.setText(transaction.description);
            break;
          } catch (e) {
            // Field doesn't exist, try next name
          }
        }

        // Fill amount
        for (const fieldName of amountFieldNames) {
          try {
            const field = form.getTextField(fieldName);
            field.setText(transaction.amount.toFixed(2));
            break;
          } catch (e) {
            // Field doesn't exist, try next name
          }
        }
      } catch (error) {
        console.warn(`Could not fill transaction line ${lineNum}:`, error);
      }
    });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`Transaction details filled and saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error filling transaction details:', error);
    throw error;
  }
}
