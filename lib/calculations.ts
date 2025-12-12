import type { Transaction, Assets, AccountingSummary, ScheduleAData, ScheduleCData } from '@/types';

export function calculateSummary(
  transactions: Transaction[],
  assets: Assets
): AccountingSummary {
  const beginningCashAssets = assets.bankAccounts.reduce(
    (sum, acc) => sum + acc.openingBalance,
    0
  );

  const beginningNonCashAssets =
    assets.realProperty.reduce((sum, prop) => sum + prop.appraisedValue, 0) +
    assets.otherNonCashAssets.reduce((sum, asset) => sum + asset.value, 0);

  const totalReceipts = transactions
    .filter((t) => t.type === 'RECEIPT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDisbursements = transactions
    .filter((t) => t.type === 'DISBURSEMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  const endingCashAssets = assets.bankAccounts.reduce(
    (sum, acc) => sum + acc.closingBalance,
    0
  );

  const endingNonCashAssets = beginningNonCashAssets; // Assuming no change for now

  return {
    beginningCashAssets,
    beginningNonCashAssets,
    totalReceipts,
    totalDisbursements,
    endingCashAssets,
    endingNonCashAssets,
  };
}

export function organizeScheduleA(transactions: Transaction[]): ScheduleAData {
  const receipts = transactions.filter((t) => t.type === 'RECEIPT');

  return {
    A2_Interest: receipts.filter((t) => t.category === 'A2_INTEREST'),
    A3_PensionsAnnuities: receipts.filter((t) => t.category === 'A3_PENSIONS_ANNUITIES'),
    A5_SocialSecurityVA: receipts.filter((t) => t.category === 'A5_SOCIAL_SECURITY_VA'),
    A6_OtherReceipts: receipts.filter((t) => t.category === 'A6_OTHER_RECEIPTS'),
  };
}

export function organizeScheduleC(transactions: Transaction[]): ScheduleCData {
  const disbursements = transactions.filter((t) => t.type === 'DISBURSEMENT');

  return {
    C1_Caregiver: disbursements.filter((t) => t.category === 'C1_CAREGIVER'),
    C2_ResidentialFacility: {
      ElectricianPlumbing: disbursements.filter(
        (t) => t.category === 'C2_RESIDENTIAL_FACILITY' && t.subCategory === 'ELECTRICIAN_PLUMBING'
      ),
      GasUtility: disbursements.filter(
        (t) => t.category === 'C2_RESIDENTIAL_FACILITY' && t.subCategory === 'GAS_UTILITY'
      ),
      HomeMaintenance: disbursements.filter(
        (t) => t.category === 'C2_RESIDENTIAL_FACILITY' && t.subCategory === 'HOME_MAINTENANCE'
      ),
      HomeSecurity: disbursements.filter(
        (t) => t.category === 'C2_RESIDENTIAL_FACILITY' && t.subCategory === 'HOME_SECURITY'
      ),
      Landscaping: disbursements.filter(
        (t) => t.category === 'C2_RESIDENTIAL_FACILITY' && t.subCategory === 'LANDSCAPING'
      ),
      PoolMaintenance: disbursements.filter(
        (t) => t.category === 'C2_RESIDENTIAL_FACILITY' && t.subCategory === 'POOL_MAINTENANCE'
      ),
      TelecomService: disbursements.filter(
        (t) => t.category === 'C2_RESIDENTIAL_FACILITY' && t.subCategory === 'TELECOM_SERVICE'
      ),
      WaterElectricityUtilities: disbursements.filter(
        (t) => t.category === 'C2_RESIDENTIAL_FACILITY' && t.subCategory === 'WATER_ELECTRICITY_UTILITIES'
      ),
    },
    C4_FiduciaryAttorney: disbursements.filter((t) => t.category === 'C4_FIDUCIARY_ATTORNEY'),
    C5_GeneralAdmin: disbursements.filter((t) => t.category === 'C5_GENERAL_ADMIN'),
    C6_Medical: disbursements.filter((t) => t.category === 'C6_MEDICAL'),
    C7_LivingExpenses: {
      ArtSupplies: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'ART_SUPPLIES'
      ),
      AutoMaintenance: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'AUTO_MAINTENANCE'
      ),
      Books: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'BOOKS'
      ),
      BotanicalGardenEntertainment: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'BOTANICAL_GARDEN_ENTERTAINMENT'
      ),
      CarInsurance: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'CAR_INSURANCE'
      ),
      Clothing: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'CLOTHING'
      ),
      ComputersTechnology: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'COMPUTERS_TECHNOLOGY'
      ),
      DiningFood: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'DINING_FOOD'
      ),
      FitnessGym: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'FITNESS_GYM'
      ),
      HairSalon: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'HAIR_SALON'
      ),
      MembershipDues: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'MEMBERSHIP_DUES'
      ),
      MovieTheaters: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'MOVIE_THEATERS'
      ),
      NailSalon: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'NAIL_SALON'
      ),
      OfficeSupplies: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'OFFICE_SUPPLIES'
      ),
      OnlineShopping: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'ONLINE_SHOPPING'
      ),
      PetExpenses: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'PET_EXPENSES'
      ),
      PharmacyHealth: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'PHARMACY_HEALTH'
      ),
      RestaurantsDining: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'RESTAURANTS_DINING'
      ),
      SportingGoods: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'SPORTING_GOODS'
      ),
      StreamingServices: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'STREAMING_SERVICES'
      ),
      TravelTransportation: disbursements.filter(
        (t) => t.category === 'C7_LIVING_EXPENSES' && t.subCategory === 'TRAVEL_TRANSPORTATION'
      ),
    },
    C8_Taxes: disbursements.filter((t) => t.category === 'C8_TAXES'),
    C9_OtherDisbursements: disbursements.filter((t) => t.category === 'C9_OTHER_DISBURSEMENTS'),
  };
}

export function validateReconciliation(summary: AccountingSummary): {
  isBalanced: boolean;
  charges: number;
  credits: number;
  difference: number;
} {
  const charges =
    summary.beginningCashAssets +
    summary.beginningNonCashAssets +
    summary.totalReceipts +
    (summary.gainsOnSales || 0) +
    (summary.netIncomeFromBusiness || 0) +
    (summary.otherCharges || 0);

  const credits =
    summary.totalDisbursements +
    (summary.lossesOnSales || 0) +
    (summary.distributionsToConservatee || 0) +
    (summary.netLossFromBusiness || 0) +
    (summary.otherCredits || 0) +
    summary.endingCashAssets +
    summary.endingNonCashAssets;

  const difference = Math.abs(charges - credits);
  const isBalanced = difference < 0.01; // Allow for rounding errors

  return {
    isBalanced,
    charges,
    credits,
    difference,
  };
}
