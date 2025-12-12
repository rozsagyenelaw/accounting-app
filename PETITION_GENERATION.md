# Petition Auto-Generation Guide

This document explains how to auto-generate trust accounting petitions using the system.

## Overview

The petition generation system creates properly formatted legal petition documents based on the California trust accounting petition template. All data is dynamically populated from user input on the frontend.

## API Endpoint

### Generate Petition
**POST** `/api/generate-petition`

Generates a complete petition PDF document from scratch.

### Request Body

```json
{
  "attorneyName": "Rozsa Gyene",
  "attorneyBarNumber": "208356",
  "attorneyFirmName": "Law Offices of Rozsa Gyene",
  "attorneyAddress": "450 N Brand Blvd Suite 623",
  "attorneyCity": "Glendale",
  "attorneyState": "CA",
  "attorneyZip": "91203",
  "attorneyPhone": "(818)291-6217",

  "courtName": "Superior Court of the State of California",
  "courtCounty": "Los Angeles",
  "caseNumber": "21STPB01645",
  "hearingDate": "9/3/2024",
  "hearingTime": "8:30 AM",
  "hearingDepartment": "2D",

  "trustName": "THE BONNIE DREXLER REVOCALE TRUST",
  "accountType": "SECOND",

  "petitionerName": "Marci Drexler",
  "petitionerTitle": "Trustee",
  "appointmentDate": "December 14, 2020",

  "periodStartDate": "10/21/2021",
  "periodEndDate": "08/22/2023",

  "trustorName": "Bonnie Drexler",
  "trustorAddress": "12219 Hesby St. Valley Village, CA 91067",
  "trustorIsVeteran": false,
  "trustorIsInStateHospital": false,
  "trustorMaritalStatus": "NOT_MARRIED",

  "attorneyFeesAmount": 3960.00,
  "currentBondAmount": 1518000.00,
  "newBondAmount": 1719824.06,

  "hasProbateCodeCompliance": true,
  "hasSpecialNoticeRequest": false,
  "needsVANotice": false,

  "petitionDate": "June 17, 2024"
}
```

### Response

```json
{
  "success": true,
  "fileUrl": "/forms/filled/petition_the_bonnie_drexler_revocale_trust_2024-12-12T22-14-30.pdf",
  "fileName": "petition_the_bonnie_drexler_revocale_trust_2024-12-12T22-14-30.pdf",
  "message": "Petition PDF generated successfully",
  "data": {
    "trustName": "THE BONNIE DREXLER REVOCALE TRUST",
    "caseNumber": "21STPB01645",
    "accountType": "SECOND"
  }
}
```

## Field Reference

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `attorneyName` | string | Attorney's full name | "Rozsa Gyene" |
| `attorneyBarNumber` | string | State bar number | "208356" |
| `attorneyFirmName` | string | Law firm name | "Law Offices of Rozsa Gyene" |
| `attorneyAddress` | string | Street address | "450 N Brand Blvd Suite 623" |
| `attorneyCity` | string | City | "Glendale" |
| `attorneyState` | string | State (2-letter) | "CA" |
| `attorneyZip` | string | ZIP code | "91203" |
| `attorneyPhone` | string | Phone number | "(818)291-6217" |
| `courtName` | string | Full court name | "Superior Court of the State of California" |
| `courtCounty` | string | County name | "Los Angeles" |
| `caseNumber` | string | Case number | "21STPB01645" |
| `hearingDate` | string | Hearing date | "9/3/2024" |
| `hearingTime` | string | Hearing time | "8:30 AM" |
| `hearingDepartment` | string | Department | "2D" |
| `trustName` | string | Trust name (uppercase) | "THE BONNIE DREXLER REVOCALE TRUST" |
| `accountType` | string | Account type | "SECOND", "THIRD", "FOURTH" |
| `petitionerName` | string | Petitioner/Trustee name | "Marci Drexler" |
| `petitionerTitle` | string | Role | "Trustee", "Conservator" |
| `appointmentDate` | string | Date of appointment | "December 14, 2020" |
| `periodStartDate` | string | Accounting period start | "10/21/2021" |
| `periodEndDate` | string | Accounting period end | "08/22/2023" |
| `trustorName` | string | Trustor/Conservatee name | "Bonnie Drexler" |
| `trustorAddress` | string | Full address | "12219 Hesby St. Valley Village, CA 91067" |
| `trustorIsVeteran` | boolean | Veteran status | false |
| `trustorIsInStateHospital` | boolean | State hospital status | false |
| `trustorMaritalStatus` | string | Marital status | "MARRIED", "NOT_MARRIED", "UNKNOWN" |
| `attorneyFeesAmount` | number | Attorney fees paid | 3960.00 |
| `currentBondAmount` | number | Current bond amount | 1518000.00 |
| `newBondAmount` | number | New bond amount | 1719824.06 |
| `hasProbateCodeCompliance` | boolean | Probate code compliance | true |
| `hasSpecialNoticeRequest` | boolean | Special notice requested | false |
| `needsVANotice` | boolean | VA notice needed | false |
| `petitionDate` | string | Petition filing date | "June 17, 2024" |

## Frontend Integration

### Example React Component

```tsx
import { useState } from 'react';
import { PetitionData } from '@/types';

export function PetitionForm() {
  const [formData, setFormData] = useState<PetitionData>({
    // Initialize with default values or user data
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/generate-petition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Download or display the PDF
        window.open(result.fileUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating petition:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields for all PetitionData properties */}
      <button type="submit">Generate Petition</button>
    </form>
  );
}
```

## Testing

### Command Line Test

Run the test script to verify petition generation:

```bash
npx tsx scripts/test-petition-generation.ts
```

This will generate a test petition PDF at:
`public/forms/filled/test_petition.pdf`

### API Test with cURL

```bash
curl -X POST http://localhost:3000/api/generate-petition \
  -H "Content-Type: application/json" \
  -d @sample-petition-data.json
```

## Document Structure

The generated petition includes:

1. **Page 1**: Title page with attorney information and case caption
2. **Page 2**: Period of account and summary of account
3. **Page 3**: Additional Probate Code compliance sections
4. **Page 4**: Attorney fees, bond information, and prayer for relief
5. **Page 5**: Signature page
6. **Page 6**: Verification page

## Customization

To customize the petition format, edit:
- `/lib/pdf-petition.ts` - Main generation logic
- `/types/index.ts` - PetitionData interface

## File Locations

- **Generated PDFs**: `public/forms/filled/`
- **Type Definitions**: `types/index.ts`
- **Generation Service**: `lib/pdf-petition.ts`
- **API Endpoint**: `app/api/generate-petition/route.ts`
- **Test Script**: `scripts/test-petition-generation.ts`

## Notes

- All dates should be formatted as shown in the examples (e.g., "9/3/2024", "June 17, 2024")
- Trust name is typically in ALL CAPS
- Account type should be spelled out: "SECOND", "THIRD", "FOURTH", etc.
- Attorney fees and bond amounts are formatted with 2 decimal places
- Generated PDFs are saved with timestamp to avoid overwrites
- The system uses pdf-lib to create PDFs from scratch (no template required)

## Troubleshooting

### Common Issues

1. **Missing Required Fields**: Check the API response for `missingFields` array
2. **PDF Not Generated**: Check server logs for detailed error messages
3. **Formatting Issues**: Verify date formats match the examples
4. **File Not Found**: Ensure the `public/forms/filled/` directory exists

## Future Enhancements

- Add electronic signature support
- Include exhibit attachments
- Generate additional schedules automatically
- Support for multiple petitioner signatures
- Integration with court e-filing systems
