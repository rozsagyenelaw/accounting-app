import { NextRequest, NextResponse } from 'next/server';
import { generatePetition } from '@/lib/pdf-petition';
import { PetitionData } from '@/types';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/generate-petition
 * Generate a petition PDF from scratch based on user data
 *
 * Body: PetitionData (see types/index.ts)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const petitionData: PetitionData = body;

    // Validate required fields
    const requiredFields: (keyof PetitionData)[] = [
      'attorneyName',
      'attorneyBarNumber',
      'attorneyFirmName',
      'attorneyAddress',
      'attorneyCity',
      'attorneyState',
      'attorneyZip',
      'attorneyPhone',
      'courtName',
      'courtCounty',
      'caseNumber',
      'trustName',
      'petitionerName',
      'petitionerTitle',
      'trustorName',
      'periodStartDate',
      'periodEndDate',
    ];

    const missingFields = requiredFields.filter(field => !petitionData[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
          message: `Please provide: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTrustName = petitionData.trustName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const outputName = `petition_${sanitizedTrustName}_${timestamp}.pdf`;

    const publicDir = path.join(process.cwd(), 'public');
    const outputPath = path.join(publicDir, 'forms', 'filled', outputName);

    // Ensure filled directory exists
    await fs.mkdir(path.join(publicDir, 'forms', 'filled'), { recursive: true });

    // Generate the petition PDF
    await generatePetition(petitionData, outputPath);

    // Return the URL to the generated PDF
    const fileUrl = `/forms/filled/${outputName}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: outputName,
      message: 'Petition PDF generated successfully',
      data: {
        trustName: petitionData.trustName,
        caseNumber: petitionData.caseNumber,
        accountType: petitionData.accountType,
      }
    });
  } catch (error) {
    console.error('Error in petition generation endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate petition PDF',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-petition
 * Get information about the petition generation endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/generate-petition',
    method: 'POST',
    description: 'Generate a trust accounting petition PDF from scratch',
    requiredFields: [
      'attorneyName',
      'attorneyBarNumber',
      'attorneyFirmName',
      'attorneyAddress',
      'attorneyCity',
      'attorneyState',
      'attorneyZip',
      'attorneyPhone',
      'courtName',
      'courtCounty',
      'caseNumber',
      'hearingDate',
      'hearingTime',
      'hearingDepartment',
      'trustName',
      'accountType',
      'petitionerName',
      'petitionerTitle',
      'appointmentDate',
      'periodStartDate',
      'periodEndDate',
      'trustorName',
      'trustorAddress',
      'trustorIsVeteran',
      'trustorIsInStateHospital',
      'trustorMaritalStatus',
      'attorneyFeesAmount',
      'currentBondAmount',
      'newBondAmount',
      'hasProbateCodeCompliance',
      'hasSpecialNoticeRequest',
      'needsVANotice',
      'petitionDate',
    ],
    example: {
      attorneyName: 'Rozsa Gyene',
      attorneyBarNumber: '208356',
      attorneyFirmName: 'Law Offices of Rozsa Gyene',
      attorneyAddress: '450 N Brand Blvd Suite 623',
      attorneyCity: 'Glendale',
      attorneyState: 'CA',
      attorneyZip: '91203',
      attorneyPhone: '(818)291-6217',
      courtName: 'Superior Court of the State of California',
      courtCounty: 'Los Angeles',
      caseNumber: '21STPB01645',
      hearingDate: '9/3/2024',
      hearingTime: '8:30 AM',
      hearingDepartment: '2D',
      trustName: 'THE BONNIE DREXLER REVOCALE TRUST',
      accountType: 'SECOND',
      petitionerName: 'Marci Drexler',
      petitionerTitle: 'Trustee',
      appointmentDate: 'December 14, 2020',
      periodStartDate: '10/21/2021',
      periodEndDate: '08/22/2023',
      trustorName: 'Bonnie Drexler',
      trustorAddress: '12219 Hesby St. Valley Village, CA 91067',
      trustorIsVeteran: false,
      trustorIsInStateHospital: false,
      trustorMaritalStatus: 'NOT_MARRIED',
      attorneyFeesAmount: 3960.00,
      currentBondAmount: 1518000.00,
      newBondAmount: 1719824.06,
      hasProbateCodeCompliance: true,
      hasSpecialNoticeRequest: false,
      needsVANotice: false,
      petitionDate: 'June 17, 2024',
    }
  });
}
