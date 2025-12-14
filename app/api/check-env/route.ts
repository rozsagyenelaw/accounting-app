import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    azureEndpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || 'NOT SET',
    azureKeyExists: !!process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
    azureKeyLength: process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  });
}
