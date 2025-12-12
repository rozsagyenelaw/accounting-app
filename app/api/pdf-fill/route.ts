import { NextRequest, NextResponse } from 'next/server';
import { fillPdfForm, extractPdfFields, AccountingData } from '@/lib/pdf-fill';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/pdf-fill
 * Fill a PDF form with accounting data
 *
 * Body:
 * {
 *   templateName: string,  // Name of the template file in public/forms/templates
 *   data: AccountingData,  // Data to fill into the form
 *   outputName?: string    // Optional output filename
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateName, data, outputName } = body;

    if (!templateName || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: templateName and data' },
        { status: 400 }
      );
    }

    // Construct file paths
    const publicDir = path.join(process.cwd(), 'public');
    const templatePath = path.join(publicDir, 'forms', 'templates', templateName);

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      return NextResponse.json(
        { error: `Template file not found: ${templateName}` },
        { status: 404 }
      );
    }

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalOutputName = outputName || `filled-${timestamp}.pdf`;
    const outputPath = path.join(publicDir, 'forms', 'filled', finalOutputName);

    // Ensure filled directory exists
    await fs.mkdir(path.join(publicDir, 'forms', 'filled'), { recursive: true });

    // Fill the PDF
    await fillPdfForm(templatePath, data as AccountingData, outputPath);

    // Return the URL to the filled PDF
    const fileUrl = `/forms/filled/${finalOutputName}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      message: 'PDF form filled successfully',
    });
  } catch (error) {
    console.error('Error in PDF fill endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fill PDF form', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pdf-fill?template=filename.pdf
 * Extract field names from a PDF template for debugging
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateName = searchParams.get('template');

    if (!templateName) {
      return NextResponse.json(
        { error: 'Missing required parameter: template' },
        { status: 400 }
      );
    }

    const publicDir = path.join(process.cwd(), 'public');
    const templatePath = path.join(publicDir, 'forms', 'templates', templateName);

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      return NextResponse.json(
        { error: `Template file not found: ${templateName}` },
        { status: 404 }
      );
    }

    // Extract fields
    const fields = await extractPdfFields(templatePath);

    return NextResponse.json({
      success: true,
      template: templateName,
      fieldCount: fields.length,
      fields,
    });
  } catch (error) {
    console.error('Error extracting PDF fields:', error);
    return NextResponse.json(
      { error: 'Failed to extract PDF fields', details: String(error) },
      { status: 500 }
    );
  }
}
