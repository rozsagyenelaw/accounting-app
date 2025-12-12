import { generatePetition } from '../lib/pdf-petition.js';
import { PetitionData } from '../types/index.js';
import path from 'path';

/**
 * Test script for petition generation
 * Run with: npx ts-node scripts/test-petition-generation.ts
 */

async function testPetitionGeneration() {
  console.log('Starting petition generation test...');

  // Sample data based on the Drexler Trust petition
  const sampleData: PetitionData = {
    // Attorney Information
    attorneyName: 'Rozsa Gyene',
    attorneyBarNumber: '208356',
    attorneyFirmName: 'Law Offices of Rozsa Gyene',
    attorneyAddress: '450 N Brand Blvd Suite 623',
    attorneyCity: 'Glendale',
    attorneyState: 'CA',
    attorneyZip: '91203',
    attorneyPhone: '(818)291-6217',

    // Court Information
    courtName: 'Superior Court of the State of California',
    courtCounty: 'Los Angeles',
    caseNumber: '21STPB01645',
    hearingDate: '9/3/2024',
    hearingTime: '8:30 AM',
    hearingDepartment: '2D',

    // Trust/Case Information
    trustName: 'THE BONNIE DREXLER REVOCALE TRUST',
    accountType: 'SECOND',

    // Petitioner/Trustee Information
    petitionerName: 'Marci Drexler',
    petitionerTitle: 'Trustee',
    appointmentDate: 'December 14, 2020',

    // Accounting Period
    periodStartDate: '10/21/2021',
    periodEndDate: '08/22/2023',

    // Trustor/Conservatee Information
    trustorName: 'Bonnie Drexler',
    trustorAddress: '12219 Hesby St. Valley Village, CA 91067',
    trustorIsVeteran: false,
    trustorIsInStateHospital: false,
    trustorMaritalStatus: 'NOT_MARRIED',

    // Financial Information
    attorneyFeesAmount: 3960.00,
    currentBondAmount: 1518000.00,
    newBondAmount: 1719824.06,

    // Additional Information
    hasProbateCodeCompliance: true,
    hasSpecialNoticeRequest: false,
    needsVANotice: false,

    // Petition Date
    petitionDate: 'June 17, 2024',
  };

  try {
    const outputPath = path.join(process.cwd(), 'public', 'forms', 'filled', 'test_petition.pdf');

    console.log('Generating petition PDF...');
    console.log('Data:', JSON.stringify(sampleData, null, 2));
    console.log('Output path:', outputPath);

    await generatePetition(sampleData, outputPath);

    console.log('\n✅ Petition generated successfully!');
    console.log(`📄 File saved to: ${outputPath}`);
    console.log('\nYou can view it at: http://localhost:3000/forms/filled/test_petition.pdf');
  } catch (error) {
    console.error('\n❌ Error generating petition:', error);
    throw error;
  }
}

// Run the test
testPetitionGeneration()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
