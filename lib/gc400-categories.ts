/**
 * GC-400 California Judicial Council Form Categories
 * Complete rewrite with accurate category mappings
 */

export interface CategoryRule {
  code: string;
  name: string;
  subCategory?: string;
  patterns: RegExp[];
  weight: number;
}

export interface CategoryResult {
  code: string;
  name: string;
  subCategory: string | null;
  confidence: number;
  matchedKeywords: string[];
}

// ============================================================================
// SCHEDULE A - RECEIPTS
// ============================================================================

export const RECEIPT_CATEGORIES: CategoryRule[] = [
  // A(3) - Pensions, Annuities, Trust Distributions (MUST BE FIRST - higher priority than Interest)
  {
    code: 'A3_PENSIONS_ANNUITIES',
    name: 'Pensions, Annuities, and Other Regular Periodic Payments',
    patterns: [
      /fletcher\s+jones/i,
      /trust.*distribution/i,
      /pension/i,
      /annuity/i,
      /retirement/i
    ],
    weight: 4.0  // Higher weight than Interest
  },

  // A(2) - Interest (AFTER Pensions to avoid false matches)
  {
    code: 'A2_INTEREST',
    name: 'Interest',
    patterns: [
      /interest\s+earned/i,
      /interest\s+payment/i,
      /\bdividend\b/i,
      /int\s+paid/i,
      /int\s+credit/i
    ],
    weight: 3.0
  },

  // A(5) - Social Security, VA Benefits
  {
    code: 'A5_SOCIAL_SECURITY_VA',
    name: 'Social Security, Veterans\' Benefits, Other Public Benefits',
    patterns: [
      /ssa\s+treas/i,
      /\bssa\b/i,
      /soc\s+sec/i,
      /social\s+security/i,
      /\bssi\b/i,
      /\bssdi\b/i,
      /veterans?\s+admin/i,
      /\bva\s+benefit/i,
      /\bva\s+payment/i
    ],
    weight: 3.5
  },

  // A(6) - Other Receipts
  {
    code: 'A6_OTHER_RECEIPTS',
    name: 'Other Receipts',
    patterns: [
      /refund/i,
      /reimb/i,
      /reimbursement/i,
      /return/i,
      /rebate/i
    ],
    weight: 2.0
  }
];

// ============================================================================
// SCHEDULE C - DISBURSEMENTS
// ============================================================================

export const DISBURSEMENT_CATEGORIES: CategoryRule[] = [
  // -------------------------------------------------------------------------
  // C(1) - Caregiver Expenses
  // -------------------------------------------------------------------------
  {
    code: 'C1_CAREGIVER',
    name: 'Caregiver Expenses',
    patterns: [
      /caregiver/i,
      /care\s+giver/i,
      /kristine\s+valon/i,
      /nursing/i,
      /aide/i,
      /companion\s+care/i,
      /home\s+care/i
    ],
    weight: 3.0
  },

  // -------------------------------------------------------------------------
  // C(2) - Residential Facility Expenses
  // -------------------------------------------------------------------------

  // Water/Electric
  {
    code: 'C2_RESIDENTIAL_FACILITY',
    name: 'Residential Facility Expenses',
    subCategory: 'WATER_ELECTRICITY_UTILITIES',
    patterns: [
      /\bladwp\b/i,
      /\bdwp\b/i,
      /water.*power/i,
      /water.*electric/i,
      /\bsce\b/i,
      /so\s*cal\s*edison/i
    ],
    weight: 3.5
  },

  // Gas
  {
    code: 'C2_RESIDENTIAL_FACILITY',
    name: 'Residential Facility Expenses',
    subCategory: 'GAS_UTILITY',
    patterns: [
      /socalgas/i,
      /socal\s+gas/i,
      /so\s*cal\s+gas/i,
      /gas\s+company/i,
      /natural\s+gas/i
    ],
    weight: 3.5
  },

  // Cable/Internet/Telecom
  {
    code: 'C2_RESIDENTIAL_FACILITY',
    name: 'Residential Facility Expenses',
    subCategory: 'TELECOM_SERVICE',
    patterns: [
      /spectrum/i,
      /charter\s+commun/i,
      /\batt\b.*payment/i,
      /at\s*&\s*t/i,
      /comcast/i,
      /xfinity/i
    ],
    weight: 3.0
  },

  // Home Maintenance
  {
    code: 'C2_RESIDENTIAL_FACILITY',
    name: 'Residential Facility Expenses',
    subCategory: 'HOME_MAINTENANCE',
    patterns: [
      /home\s+depot/i,
      /lowe'?s/i,
      /hardware/i,
      /dunn.*edwards/i,
      /window/i,
      /blind/i,
      /tile/i,
      /deck/i,
      /repair/i,
      /plaster/i,
      /paint/i,
      /anytime\s+windows/i
    ],
    weight: 3.0
  },

  // Electrician/Plumbing
  {
    code: 'C2_RESIDENTIAL_FACILITY',
    name: 'Residential Facility Expenses',
    subCategory: 'ELECTRICIAN_PLUMBING',
    patterns: [
      /electric\s+service/i,
      /electrician/i,
      /plumb/i,
      /\bhvac\b/i
    ],
    weight: 2.5
  },

  // Home Security
  {
    code: 'C2_RESIDENTIAL_FACILITY',
    name: 'Residential Facility Expenses',
    subCategory: 'HOME_SECURITY',
    patterns: [
      /\bring\b.*yearly/i,
      /\badt\b/i,
      /security\s+system/i,
      /alarm/i,
      /simplisafe/i
    ],
    weight: 2.5
  },

  // Landscaping
  {
    code: 'C2_RESIDENTIAL_FACILITY',
    name: 'Residential Facility Expenses',
    subCategory: 'LANDSCAPING',
    patterns: [
      /landscap/i,
      /garden/i,
      /tree\s+service/i,
      /yard/i,
      /lawn/i,
      /irrigation/i
    ],
    weight: 2.5
  },

  // Pool Maintenance
  {
    code: 'C2_RESIDENTIAL_FACILITY',
    name: 'Residential Facility Expenses',
    subCategory: 'POOL_MAINTENANCE',
    patterns: [
      /pool/i,
      /\bspa\b/i,
      /pool\s+service/i
    ],
    weight: 2.5
  },

  // -------------------------------------------------------------------------
  // C(4) - Fiduciary and Attorney Fees
  // -------------------------------------------------------------------------
  {
    code: 'C4_FIDUCIARY_ATTORNEY',
    name: 'Fiduciary and Attorney Fees',
    patterns: [
      /law\s+office/i,
      /rozsa/i,
      /attorney/i,
      /\besq\b/i,
      /legal/i,
      /trustee\s+fee/i,
      /fiduciary/i,
      /professional\s+fiduciary/i
    ],
    weight: 3.0
  },

  // -------------------------------------------------------------------------
  // C(5) - General Administration Expenses
  // -------------------------------------------------------------------------

  // Court Fees
  {
    code: 'C5_GENERAL_ADMIN',
    name: 'General Administration Expenses',
    subCategory: 'Court Fees',
    patterns: [
      /caefile/i,
      /court\s+fee/i,
      /court\s+filing/i,
      /filing\s+fee/i
    ],
    weight: 3.0
  },

  // Bond
  {
    code: 'C5_GENERAL_ADMIN',
    name: 'General Administration Expenses',
    subCategory: 'Bond',
    patterns: [
      /bond\s+payment/i,
      /bond\s+premium/i,
      /conservatorship\s+bond/i
    ],
    weight: 3.0
  },

  // Bank/Account Fees
  {
    code: 'C5_GENERAL_ADMIN',
    name: 'General Administration Expenses',
    subCategory: 'Bank Fees',
    patterns: [
      /check\s+order/i,
      /service\s+fee/i,
      /bank\s+fee/i,
      /account\s+fee/i
    ],
    weight: 2.5
  },

  // Accounting/Tax Prep
  {
    code: 'C5_GENERAL_ADMIN',
    name: 'General Administration Expenses',
    subCategory: 'Accounting',
    patterns: [
      /accounting\s+fee/i,
      /tax\s+prep/i,
      /cpa/i
    ],
    weight: 2.5
  },

  // -------------------------------------------------------------------------
  // C(6) - Medical Expenses
  // -------------------------------------------------------------------------

  // Pharmacy
  {
    code: 'C6_MEDICAL',
    name: 'Medical Expenses',
    subCategory: 'Pharmacy',
    patterns: [
      /\bcvs\b/i,
      /walgreens/i,
      /pharmacy/i,
      /rite\s+aid/i,
      /prescription/i,
      /\brx\b/i
    ],
    weight: 3.0
  },

  // Doctor/Dental
  {
    code: 'C6_MEDICAL',
    name: 'Medical Expenses',
    subCategory: 'Doctor/Dental',
    patterns: [
      /jordan.*colby/i,
      /\bdmd\b/i,
      /\bdds\b/i,
      /dentist/i,
      /dental/i,
      /\bdr\s+/i,
      /doctor/i,
      /clinic/i,
      /medical\s+office/i
    ],
    weight: 2.5
  },

  // Pet Medical/Vet
  {
    code: 'C6_MEDICAL',
    name: 'Medical Expenses',
    subCategory: 'Pet Medical',
    patterns: [
      /sharp\s+pet/i,
      /\bvet\b/i,
      /veterinar/i,
      /animal\s+hospital/i,
      /dog.*cat.*hospital/i
    ],
    weight: 2.5
  },

  // General Medical (specific patterns only - removed overly broad /medical/i and /health/i)
  {
    code: 'C6_MEDICAL',
    name: 'Medical Expenses',
    subCategory: 'General',
    patterns: [
      /hospital/i,
      /health\s+care\s+provider/i,
      /medical\s+center/i,
      /urgent\s+care/i,
      /anthem/i,
      /blue\s+cross/i,
      /kaiser/i,
      /medicare/i
    ],
    weight: 2.0
  },

  // -------------------------------------------------------------------------
  // C(7) - Living Expenses (MOST COMMON)
  // -------------------------------------------------------------------------

  // Groceries
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'DINING_FOOD',
    patterns: [
      /sprouts/i,
      /trader\s+joe/i,
      /ralphs/i,
      /gelson/i,
      /\bvons\b/i,
      /grocery/i,
      /vintage\s+grocer/i,
      /whole\s+foods/i,
      /safeway/i,
      /tapia\s+bros/i,
      /kroger/i
    ],
    weight: 3.5
  },

  // Restaurants/Dining
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'RESTAURANTS_DINING',
    patterns: [
      /sharky/i,
      /shake\s+shack/i,
      /starbucks/i,
      /restaurant/i,
      /chipotle/i,
      /burger/i,
      /grill/i,
      /\bcafe\b/i,
      /coffee/i,
      /oinkster/i,
      /marston/i,
      /baja\s+fresh/i,
      /fatburger/i,
      /heavy\s+handed/i,
      /el\s+tijuanense/i,
      /wood\s+ranch/i,
      /la\s+paz/i,
      /outback/i,
      /micheladas/i,
      /box\s+thai/i,
      /harvest\s+moon/i,
      /doordash/i,
      /uber\s+eats/i,
      /grubhub/i,
      /postmates/i
    ],
    weight: 3.0
  },

  // Online Shopping
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'ONLINE_SHOPPING',
    patterns: [
      /\bamazon\b/i,
      /\bamzn\b/i
    ],
    weight: 3.0
  },

  // Gas/Fuel
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'Gas/Fuel',
    patterns: [
      /n\s*&\s*d\s+oil/i,
      /chevron/i,
      /shell/i,
      /arco/i,
      /mobil/i,
      /76\s/i,
      /gas\s+station/i,
      /fuel/i
    ],
    weight: 2.5
  },

  // Fitness/Gym
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'FITNESS_GYM',
    patterns: [
      /la\s+fitness/i,
      /\bgym\b/i,
      /fitness/i,
      /24\s+hour/i,
      /planet\s+fitness/i,
      /equinox/i
    ],
    weight: 3.0
  },

  // Pet Care/Supplies
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'PET_EXPENSES',
    patterns: [
      /rusty'?s\s+discount\s+pet/i,
      /pet\s+store/i,
      /petco/i,
      /petsmart/i,
      /trupanion/i,
      /pet\s+insurance/i,
      /pet\s+food/i
    ],
    weight: 2.5
  },

  // Personal Care
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'Personal Care',
    patterns: [
      /sugar\s+nails/i,
      /salon/i,
      /beauty/i,
      /polished\s+beauty/i,
      /\bnail\b/i,
      /hair/i,
      /barber/i,
      /manicure/i,
      /pedicure/i
    ],
    weight: 2.5
  },

  // Clothing
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'CLOTHING',
    patterns: [
      /macy'?s/i,
      /nordstrom/i,
      /uniqlo/i,
      /br\s+factory/i,
      /banana\s+republic/i,
      /ann\s+taylor/i,
      /\bnike\b/i,
      /gap/i,
      /clothing/i,
      /apparel/i
    ],
    weight: 2.5
  },

  // Entertainment/Streaming
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'STREAMING_SERVICES',
    patterns: [
      /sirius/i,
      /\bsxm\b/i,
      /netflix/i,
      /streaming/i,
      /hulu/i,
      /spotify/i,
      /apple\s+music/i,
      /disney\+/i
    ],
    weight: 2.5
  },

  // Auto Maintenance
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'AUTO_MAINTENANCE',
    patterns: [
      /\bvioc\b/i,
      /oil\s+change/i,
      /smog/i,
      /carfax/i,
      /auto\s+service/i,
      /jiffy\s+lube/i,
      /valvoline/i,
      /tire/i,
      /\bdmv\b/i
    ],
    weight: 2.5
  },

  // Hobbies/Crafts
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'ART_SUPPLIES',
    patterns: [
      /hobby\s+lobby/i,
      /michaels/i,
      /craft/i,
      /joann/i,
      /art\s+supply/i
    ],
    weight: 2.0
  },

  // Home Goods/Department Stores
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'Home Goods',
    patterns: [
      /\btarget\b/i,
      /walmart/i,
      /costco/i,
      /bed\s+bath/i,
      /sam'?s\s+club/i
    ],
    weight: 2.0
  },

  // Office Supplies
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'OFFICE_SUPPLIES',
    patterns: [
      /staples/i,
      /office\s+depot/i,
      /office\s+supply/i
    ],
    weight: 2.0
  },

  // Health Supplements
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'Health Supplements',
    patterns: [
      /all\s+star\s+health/i,
      /vitamin/i,
      /supplement/i,
      /\bgnc\b/i
    ],
    weight: 2.0
  },

  // Postage/Shipping
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'Postage',
    patterns: [
      /\busps\b/i,
      /ups\s+store/i,
      /fedex/i,
      /post\s+office/i,
      /postage/i
    ],
    weight: 2.0
  },

  // Locksmith
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'Locksmith',
    patterns: [
      /locksmith/i
    ],
    weight: 2.0
  },

  // Books
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'BOOKS',
    patterns: [
      /barnes/i,
      /noble/i,
      /bookstore/i,
      /\bbook\b/i
    ],
    weight: 2.0
  },

  // Technology/Computers
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'COMPUTERS_TECHNOLOGY',
    patterns: [
      /dell/i,
      /apple\s+store/i,
      /best\s+buy/i,
      /norton/i,
      /mcafee/i,
      /software/i,
      /computer/i
    ],
    weight: 2.0
  },

  // Travel
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'TRAVEL_TRANSPORTATION',
    patterns: [
      /\buber\b/i,
      /\blyft\b/i,
      /airline/i,
      /hotel/i,
      /airbnb/i,
      /travel/i,
      /flight/i
    ],
    weight: 2.0
  },

  // Car Insurance
  {
    code: 'C7_LIVING_EXPENSES',
    name: 'Living Expenses',
    subCategory: 'CAR_INSURANCE',
    patterns: [
      /\bgeico\b/i,
      /state\s+farm/i,
      /allstate/i,
      /progressive/i,
      /car\s+insurance/i,
      /auto\s+insurance/i
    ],
    weight: 3.0
  },

  // -------------------------------------------------------------------------
  // C(8) - Taxes
  // -------------------------------------------------------------------------

  // Federal Income Tax
  {
    code: 'C8_TAXES',
    name: 'Taxes',
    subCategory: 'Federal',
    patterns: [
      /\birs\b/i,
      /u\.?s\.?\s+treasury/i,
      /federal\s+tax/i,
      /internal\s+revenue/i
    ],
    weight: 3.5
  },

  // State Income Tax
  {
    code: 'C8_TAXES',
    name: 'Taxes',
    subCategory: 'State',
    patterns: [
      /franchise\s+tax/i,
      /\bftb\b/i,
      /state\s+tax/i
    ],
    weight: 3.5
  },

  // Property Tax
  {
    code: 'C8_TAXES',
    name: 'Taxes',
    subCategory: 'Property',
    patterns: [
      /property\s+tax/i,
      /la\s+county.*tax/i
    ],
    weight: 3.5
  },

  // -------------------------------------------------------------------------
  // C(9) - Other Disbursements
  // -------------------------------------------------------------------------
  {
    code: 'C9_OTHER_DISBURSEMENTS',
    name: 'Other Disbursements',
    patterns: [
      /donation/i,
      /charitable/i,
      /charity/i,
      /contribution/i
    ],
    weight: 2.0
  },

  // -------------------------------------------------------------------------
  // C(11) - Other Expenses
  // -------------------------------------------------------------------------

  // Credit Card Payments
  {
    code: 'C11_OTHER',
    name: 'Other Expenses',
    subCategory: 'Credit Card Payment',
    patterns: [
      /visa\s+payment/i,
      /credit\s+card.*payment/i,
      /mastercard/i,
      /amex/i
    ],
    weight: 3.0
  }
];

// ============================================================================
// CATEGORIZATION FUNCTION
// ============================================================================

/**
 * Categorize a transaction based on description and type
 */
export function categorizeTransaction(
  description: string,
  type: 'RECEIPT' | 'DISBURSEMENT'
): CategoryResult {
  const categories = type === 'RECEIPT' ? RECEIPT_CATEGORIES : DISBURSEMENT_CATEGORIES;

  let bestMatch: {
    category: CategoryRule;
    matchedKeywords: string[];
    score: number;
  } | null = null;

  for (const category of categories) {
    const matchedKeywords: string[] = [];

    for (const pattern of category.patterns) {
      if (pattern.test(description)) {
        matchedKeywords.push(pattern.source);
      }
    }

    if (matchedKeywords.length > 0) {
      const score = matchedKeywords.length * category.weight;

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          category,
          matchedKeywords,
          score
        };
      }
    }
  }

  // Return best match or default
  if (bestMatch) {
    const confidence = Math.min(95, 50 + (bestMatch.score * 10));

    return {
      code: bestMatch.category.code,
      name: bestMatch.category.name,
      subCategory: bestMatch.category.subCategory || null,
      confidence: Math.round(confidence),
      matchedKeywords: bestMatch.matchedKeywords
    };
  }

  // Default fallback
  if (type === 'RECEIPT') {
    return {
      code: 'A6_OTHER_RECEIPTS',
      name: 'Other Receipts',
      subCategory: null,
      confidence: 30,
      matchedKeywords: []
    };
  } else {
    return {
      code: 'C9_OTHER_DISBURSEMENTS',
      name: 'Other Disbursements',
      subCategory: null,
      confidence: 30,
      matchedKeywords: []
    };
  }
}
