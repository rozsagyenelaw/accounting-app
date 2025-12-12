import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function checkPDFFields(pdfPath: string) {
  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const fileName = pdfPath.split('/').pop();
    console.log(`\n=== PDF: ${fileName} ===`);
    console.log(`Total fields: ${fields.length}`);

    if (fields.length > 0) {
      console.log('\nSample fields (first 10):');
      fields.slice(0, 10).forEach((field, i) => {
        console.log(`  ${i + 1}. ${field.getName()} (${field.constructor.name})`);
      });
      return true;
    } else {
      console.log('WARNING: No fillable fields found!');
      return false;
    }
  } catch (error: any) {
    console.log(`ERROR: ${error.message}`);
    return false;
  }
}

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.log('Usage: npx tsx scripts/check-pdf-fields.ts <path-to-pdf>');
  process.exit(1);
}

checkPDFFields(pdfPath).then(success => {
  process.exit(success ? 0 : 1);
});
