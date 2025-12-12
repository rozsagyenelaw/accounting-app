import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/forms/templates
    const publicDir = path.join(process.cwd(), 'public');
    const templatesDir = path.join(publicDir, 'forms', 'templates');
    const filePath = path.join(templatesDir, file.name);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      filename: file.name,
      message: 'Template uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading template:', error);
    return NextResponse.json(
      { error: 'Failed to upload template', details: String(error) },
      { status: 500 }
    );
  }
}
