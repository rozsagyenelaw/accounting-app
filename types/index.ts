// ============================================================================
// Transaction Categories
// ============================================================================

export type ReceiptCategory =
  | 'A2_INTEREST'
  | 'A3_PENSIONS_ANNUITIES'
  | 'A5_SOCIAL_SECURITY_VA'
  | 'A6_OTHER_RECEIPTS';

export type DisbursementCategory =
  | 'C1_CAREGIVER'
  | 'C2_RESIDENTIAL_FACILITY'
  | 'C4_FIDUCIARY_ATTORNEY'
  | 'C5_GENERAL_ADMIN'
  | 'C6_MEDICAL'
  | 'C7_LIVING_EXPENSES'
  | 'C8_TAXES'
  | 'C9_OTHER_DISBURSEMENTS';

export type TransactionCategory = ReceiptCategory | DisbursementCategory;

// ============================================================================
// Sub-Categories for Schedule C(2) - Residential/Long-Term Care
// ============================================================================

export type C2SubCategory =
  | 'ELECTRICIAN_PLUMBING'
  | 'GAS_UTILITY'
  | 'HOME_MAINTENANCE'
  | 'HOME_SECURITY'
  | 'LANDSCAPING'
  | 'POOL_MAINTENANCE'
  | 'TELECOM_SERVICE'
  | 'WATER_ELECTRICITY_UTILITIES';

// ============================================================================
// Sub-Categories for Schedule C(7) - Living Expenses
// ============================================================================

export type C7SubCategory =
  | 'ART_SUPPLIES'
  | 'AUTO_MAINTENANCE'
  | 'BOOKS'
  | 'BOTANICAL_GARDEN_ENTERTAINMENT'
  | 'CAR_INSURANCE'
  | 'CLOTHING'
  | 'COMPUTERS_TECHNOLOGY'
  | 'DINING_FOOD'
  | 'FITNESS_GYM'
  | 'HAIR_SALON'
  | 'MEMBERSHIP_DUES'
  | 'MOVIE_THEATERS'
  | 'NAIL_SALON'
  | 'OFFICE_SUPPLIES'
  | 'ONLINE_SHOPPING'
  | 'PET_EXPENSES'
  | 'PHARMACY_HEALTH'
  | 'RESTAURANTS_DINING'
  | 'SPORTING_GOODS'
  | 'STREAMING_SERVICES'
  | 'TRAVEL_TRANSPORTATION';

export type SubCategory = C2SubCategory | C7SubCategory;

// ============================================================================
// Transaction
// ============================================================================

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'RECEIPT' | 'DISBURSEMENT';
  category?: TransactionCategory;
  subCategory?: SubCategory;
  checkNumber?: string;
  confidence?: number; // 0-100
  manuallyReviewed?: boolean;
  notes?: string;
}

// ============================================================================
// Case Information
// ============================================================================

export interface CaseInformation {
  // Basic case info
  trustConservatorshipName: string;
  caseNumber: string;
  accountType: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'FIFTH' | 'SIXTH' | 'OTHER';
  accountNumber?: string;
  isFinal: boolean;

  // Court info
  courtName: string;
  courtDepartment?: string;

  // Parties
  petitionerName: string;
  petitionerRole: 'TRUSTEE' | 'CONSERVATOR' | 'GUARDIAN';
  trustorConservateeName: string;
  trustorConservateeAddress: string;

  // Attorney (optional)
  attorneyName?: string;
  attorneyFirm?: string;
  attorneyBarNumber?: string;
  attorneyAddress?: string;

  // Bond
  currentBondAmount: number;

  // Accounting period
  periodStartDate: Date;
  periodEndDate: Date;

  // Type
  accountingType: 'CONSERVATORSHIP' | 'GUARDIANSHIP' | 'TRUST';
}

// ============================================================================
// Assets
// ============================================================================

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string; // Last 4 digits
  accountType: 'CHECKING' | 'SAVINGS' | 'MONEY_MARKET' | 'OTHER';
  openingBalance: number;
  closingBalance: number;
}

export interface RealProperty {
  id: string;
  address: string;
  appraisedValue: number;
  appraisalDate: Date;
  description?: string;
}

export interface NonCashAsset {
  id: string;
  description: string;
  value: number;
  valuationDate: Date;
}

export interface Assets {
  bankAccounts: BankAccount[];
  realProperty: RealProperty[];
  otherNonCashAssets: NonCashAsset[];
}

// ============================================================================
// Form Data
// ============================================================================

export interface ScheduleAData {
  A2_Interest: Transaction[];
  A3_PensionsAnnuities: Transaction[];
  A5_SocialSecurityVA: Transaction[];
  A6_OtherReceipts: Transaction[];
}

export interface ScheduleCData {
  C1_Caregiver: Transaction[];
  C2_ResidentialFacility: {
    ElectricianPlumbing: Transaction[];
    GasUtility: Transaction[];
    HomeMaintenance: Transaction[];
    HomeSecurity: Transaction[];
    Landscaping: Transaction[];
    PoolMaintenance: Transaction[];
    TelecomService: Transaction[];
    WaterElectricityUtilities: Transaction[];
  };
  C4_FiduciaryAttorney: Transaction[];
  C5_GeneralAdmin: Transaction[];
  C6_Medical: Transaction[];
  C7_LivingExpenses: {
    ArtSupplies: Transaction[];
    AutoMaintenance: Transaction[];
    Books: Transaction[];
    BotanicalGardenEntertainment: Transaction[];
    CarInsurance: Transaction[];
    Clothing: Transaction[];
    ComputersTechnology: Transaction[];
    DiningFood: Transaction[];
    FitnessGym: Transaction[];
    HairSalon: Transaction[];
    MembershipDues: Transaction[];
    MovieTheaters: Transaction[];
    NailSalon: Transaction[];
    OfficeSupplies: Transaction[];
    OnlineShopping: Transaction[];
    PetExpenses: Transaction[];
    PharmacyHealth: Transaction[];
    RestaurantsDining: Transaction[];
    SportingGoods: Transaction[];
    StreamingServices: Transaction[];
    TravelTransportation: Transaction[];
  };
  C8_Taxes: Transaction[];
  C9_OtherDisbursements: Transaction[];
}

export interface AccountingSummary {
  // Property on hand at beginning
  beginningCashAssets: number;
  beginningNonCashAssets: number;

  // Receipts
  totalReceipts: number;

  // Disbursements
  totalDisbursements: number;

  // Property on hand at end
  endingCashAssets: number;
  endingNonCashAssets: number;

  // Gains/Losses
  gainsOnSales?: number;
  lossesOnSales?: number;

  // Business income
  netIncomeFromBusiness?: number;
  netLossFromBusiness?: number;

  // Distributions
  distributionsToConservatee?: number;

  // Other
  otherCharges?: number;
  otherCredits?: number;
}

// ============================================================================
// Application State
// ============================================================================

export interface AccountingSession {
  id: string;
  caseInfo: CaseInformation;
  assets: Assets;
  transactions: Transaction[];
  createdAt: Date;
  updatedAt: Date;
  status: 'DRAFT' | 'REVIEW' | 'COMPLETED';
}

// ============================================================================
// Category Display Names
// ============================================================================

export const RECEIPT_CATEGORY_NAMES: Record<ReceiptCategory, string> = {
  A2_INTEREST: 'Schedule A(2) - Interest',
  A3_PENSIONS_ANNUITIES: 'Schedule A(3) - Pensions, Annuities, and Other Regular Periodic Payments',
  A5_SOCIAL_SECURITY_VA: 'Schedule A(5) - Social Security, Veterans\' Benefits, Other Public Benefits',
  A6_OTHER_RECEIPTS: 'Schedule A(6) - Other Receipts',
};

export const DISBURSEMENT_CATEGORY_NAMES: Record<DisbursementCategory, string> = {
  C1_CAREGIVER: 'Schedule C(1) - Caregiver Expenses',
  C2_RESIDENTIAL_FACILITY: 'Schedule C(2) - Residential or Long-Term Care Facility Expenses',
  C4_FIDUCIARY_ATTORNEY: 'Schedule C(4) - Fiduciary and Attorney Fees',
  C5_GENERAL_ADMIN: 'Schedule C(5) - General Administration Expenses',
  C6_MEDICAL: 'Schedule C(6) - Medical Expenses',
  C7_LIVING_EXPENSES: 'Schedule C(7) - Living Expenses',
  C8_TAXES: 'Schedule C(8) - Taxes',
  C9_OTHER_DISBURSEMENTS: 'Schedule C(9) - Other Disbursements',
};

export const C2_SUBCATEGORY_NAMES: Record<C2SubCategory, string> = {
  ELECTRICIAN_PLUMBING: 'Electrician/Plumbing Services',
  GAS_UTILITY: 'Gas Utility',
  HOME_MAINTENANCE: 'Home Maintenance/Improvement',
  HOME_SECURITY: 'Home Security',
  LANDSCAPING: 'Landscaping',
  POOL_MAINTENANCE: 'Pool Maintenance',
  TELECOM_SERVICE: 'Telecom Service',
  WATER_ELECTRICITY_UTILITIES: 'Water and Electricity Utilities',
};

export const C7_SUBCATEGORY_NAMES: Record<C7SubCategory, string> = {
  ART_SUPPLIES: 'Art Supplies',
  AUTO_MAINTENANCE: 'Auto Maintenance/Fees/Service',
  BOOKS: 'Books',
  BOTANICAL_GARDEN_ENTERTAINMENT: 'Botanical Garden/Entertainment',
  CAR_INSURANCE: 'Car Insurance',
  CLOTHING: 'Clothing',
  COMPUTERS_TECHNOLOGY: 'Computers/Technology',
  DINING_FOOD: 'Dining/Food',
  FITNESS_GYM: 'Fitness/Gym',
  HAIR_SALON: 'Hair Salon',
  MEMBERSHIP_DUES: 'Membership Dues',
  MOVIE_THEATERS: 'Movie Theaters',
  NAIL_SALON: 'Nail Salon',
  OFFICE_SUPPLIES: 'Office Supplies',
  ONLINE_SHOPPING: 'Online Shopping (Amazon miscellaneous)',
  PET_EXPENSES: 'Pet Expenses',
  PHARMACY_HEALTH: 'Pharmacy/Health',
  RESTAURANTS_DINING: 'Restaurants/Dining',
  SPORTING_GOODS: 'Sporting Goods',
  STREAMING_SERVICES: 'Streaming Services',
  TRAVEL_TRANSPORTATION: 'Travel/Transportation',
};

export const CATEGORY_NAMES: Record<TransactionCategory, string> = {
  ...RECEIPT_CATEGORY_NAMES,
  ...DISBURSEMENT_CATEGORY_NAMES,
};
