import type {
  TransactionCategory,
  ReceiptCategory,
  DisbursementCategory,
  C2SubCategory,
  C7SubCategory,
  SubCategory,
} from '@/types';

// ============================================================================
// Classification Result
// ============================================================================

export interface ClassificationResult {
  category: TransactionCategory;
  subCategory?: SubCategory;
  confidence: number; // 0-100
  matchedKeywords: string[];
}

// ============================================================================
// Keyword Rules
// ============================================================================

interface KeywordRule {
  keywords: string[];
  category: TransactionCategory;
  subCategory?: SubCategory;
  weight?: number; // Default 1.0
}

// Receipt keyword rules
const RECEIPT_RULES: KeywordRule[] = [
  // A2 - Interest
  {
    keywords: ['interest earned', 'interest', 'int paid', 'int credit', 'dividend', 'div'],
    category: 'A2_INTEREST' as ReceiptCategory,
    weight: 2.0,
  },

  // A3 - Pensions, Annuities, Trust Distributions
  {
    keywords: ['fletcher jones', 'trust distribution', 'trust payment', 'trust', 'pension', 'annuity', 'retirement'],
    category: 'A3_PENSIONS_ANNUITIES' as ReceiptCategory,
    weight: 2.0,
  },

  // A5 - Social Security, VA Benefits
  {
    keywords: [
      'ssa treas',
      'soc sec',
      'social security',
      'ssa',
      'ssi',
      'ssdi',
      'veterans administration',
      'va benefit',
      'va payment',
      'disability insurance',
      'medicare',
      'medicaid',
    ],
    category: 'A5_SOCIAL_SECURITY_VA' as ReceiptCategory,
    weight: 2.5,
  },

  // A6 - Other Receipts
  {
    keywords: ['refund', 'reimb', 'reimbursement', 'return', 'credit'],
    category: 'A6_OTHER_RECEIPTS' as ReceiptCategory,
    weight: 1.5,
  },
];

// Disbursement keyword rules
const DISBURSEMENT_RULES: KeywordRule[] = [
  // C1 - Caregiver
  {
    keywords: ['caregiver', 'care giver', 'nursing', 'aide', 'companion care', 'home care'],
    category: 'C1_CAREGIVER' as DisbursementCategory,
    weight: 2.0,
  },

  // C2 - Residential Facility (with subcategories)
  {
    keywords: ['electric service', 'electrician', 'plumb', 'hvac'],
    category: 'C2_RESIDENTIAL_FACILITY' as DisbursementCategory,
    subCategory: 'ELECTRICIAN_PLUMBING' as C2SubCategory,
    weight: 1.5,
  },
  {
    keywords: ['socalgas', 'socal gas', 'gas company', 'pg&e gas', 'natural gas'],
    category: 'C2_RESIDENTIAL_FACILITY' as DisbursementCategory,
    subCategory: 'GAS_UTILITY' as C2SubCategory,
    weight: 2.5,
  },
  {
    keywords: ['home depot', 'lowes', "lowe's", 'window', 'blind', 'tile', 'deck', 'repair', 'maintenance', 'plaster', 'paint'],
    category: 'C2_RESIDENTIAL_FACILITY' as DisbursementCategory,
    subCategory: 'HOME_MAINTENANCE' as C2SubCategory,
    weight: 1.8,
  },
  {
    keywords: ['ring', 'adt', 'security', 'alarm', 'simplisafe'],
    category: 'C2_RESIDENTIAL_FACILITY' as DisbursementCategory,
    subCategory: 'HOME_SECURITY' as C2SubCategory,
    weight: 1.7,
  },
  {
    keywords: ['landscap', 'garden', 'tree service', 'yard', 'lawn', 'irrigation'],
    category: 'C2_RESIDENTIAL_FACILITY' as DisbursementCategory,
    subCategory: 'LANDSCAPING' as C2SubCategory,
    weight: 1.5,
  },
  {
    keywords: ['pool', 'spa', 'pool service'],
    category: 'C2_RESIDENTIAL_FACILITY' as DisbursementCategory,
    subCategory: 'POOL_MAINTENANCE' as C2SubCategory,
    weight: 2.0,
  },
  {
    keywords: ['charter', 'spectrum', 'at&t', 'verizon', 'comcast', 'xfinity', 'internet', 'cable', 'phone'],
    category: 'C2_RESIDENTIAL_FACILITY' as DisbursementCategory,
    subCategory: 'TELECOM_SERVICE' as C2SubCategory,
    weight: 2.0,
  },
  {
    keywords: ['ladwp', 'dwp', 'water', 'power', 'electric', 'sce', 'utility'],
    category: 'C2_RESIDENTIAL_FACILITY' as DisbursementCategory,
    subCategory: 'WATER_ELECTRICITY_UTILITIES' as C2SubCategory,
    weight: 2.5,
  },

  // C4 - Fiduciary and Attorney Fees
  {
    keywords: ['law office', 'attorney', 'esq', 'legal', 'trustee fee', 'fiduciary', 'professional fiduciary'],
    category: 'C4_FIDUCIARY_ATTORNEY' as DisbursementCategory,
    weight: 2.0,
  },

  // C5 - General Administration
  {
    keywords: [
      'casefile',
      'court filing',
      'court clerk',
      'bond',
      'bond premium',
      'filing fee',
      'accounting fee',
      'tax prep',
    ],
    category: 'C5_GENERAL_ADMIN' as DisbursementCategory,
    weight: 2.0,
  },

  // C6 - Medical
  {
    keywords: [
      'cvs',
      'walgreens',
      'pharmacy',
      'medical',
      'hospital',
      'rite aid',
      'dr ',
      'doctor',
      'clinic',
      'therapy',
      'prescription',
      'rx',
      'health',
    ],
    category: 'C6_MEDICAL' as DisbursementCategory,
    weight: 2.0,
  },

  // C7 - Living Expenses (with subcategories)
  {
    keywords: ['hobby lobby', 'michaels', 'joann', 'art supply'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'ART_SUPPLIES' as C7SubCategory,
    weight: 1.8,
  },
  {
    keywords: ['dmv', 'smog', 'tire', 'oil change', 'valvoline', 'auto service', 'jiffy lube'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'AUTO_MAINTENANCE' as C7SubCategory,
    weight: 1.7,
  },
  {
    keywords: ['barnes', 'noble', 'bookstore', 'amazon books'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'BOOKS' as C7SubCategory,
    weight: 1.5,
  },
  {
    keywords: ['botanical garden', 'museum', 'zoo', 'aquarium', 'theme park'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'BOTANICAL_GARDEN_ENTERTAINMENT' as C7SubCategory,
    weight: 1.8,
  },
  {
    keywords: ['geico', 'state farm', 'allstate', 'progressive', 'auto insurance', 'car insurance'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'CAR_INSURANCE' as C7SubCategory,
    weight: 2.0,
  },
  {
    keywords: ['nike', 'uniqlo', 'banana republic', 'nordstrom', 'macy', 'gap', 'clothing', 'apparel'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'CLOTHING' as C7SubCategory,
    weight: 1.4,
  },
  {
    keywords: ['dell', 'apple store', 'best buy', 'norton', 'mcafee', 'software', 'computer'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'COMPUTERS_TECHNOLOGY' as C7SubCategory,
    weight: 1.6,
  },
  {
    keywords: ['sprouts', 'trader joe', 'ralphs', 'gelson', 'vons', 'grocery', 'whole foods', 'safeway', 'kroger', 'food'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'DINING_FOOD' as C7SubCategory,
    weight: 2.0,
  },
  {
    keywords: ['gym', 'fitness', '24 hour', 'planet fitness', 'la fitness', 'equinox'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'FITNESS_GYM' as C7SubCategory,
    weight: 1.8,
  },
  {
    keywords: ['salon', 'hair', 'barber', 'haircut'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'HAIR_SALON' as C7SubCategory,
    weight: 1.6,
  },
  {
    keywords: ['costco', "sam's club", 'aaa', 'membership'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'MEMBERSHIP_DUES' as C7SubCategory,
    weight: 1.7,
  },
  {
    keywords: ['amc', 'regal', 'cinemark', 'century', 'movie', 'cinema'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'MOVIE_THEATERS' as C7SubCategory,
    weight: 1.8,
  },
  {
    keywords: ['nail', 'manicure', 'pedicure', 'nail salon'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'NAIL_SALON' as C7SubCategory,
    weight: 1.8,
  },
  {
    keywords: ['staples', 'office depot', 'office supply'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'OFFICE_SUPPLIES' as C7SubCategory,
    weight: 1.7,
  },
  {
    keywords: ['amazon', 'amzn'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'ONLINE_SHOPPING' as C7SubCategory,
    weight: 1.3,
  },
  {
    keywords: ['pet', 'vet', 'veterinar', 'petco', 'petsmart', 'pet food'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'PET_EXPENSES' as C7SubCategory,
    weight: 1.7,
  },
  {
    keywords: ['shake shack', 'sharky', 'burger', 'restaurant', 'cafe', 'bistro', 'grill', 'diner', 'eatery'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'RESTAURANTS_DINING' as C7SubCategory,
    weight: 1.8,
  },
  {
    keywords: ['doordash', 'uber eats', 'grubhub', 'postmates', 'delivery'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'RESTAURANTS_DINING' as C7SubCategory,
    weight: 1.6,
  },
  {
    keywords: ['dicks sporting', 'big 5', 'sports authority', 'sporting goods'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'SPORTING_GOODS' as C7SubCategory,
    weight: 1.7,
  },
  {
    keywords: ['netflix', 'hulu', 'disney+', 'hbo', 'spotify', 'apple music', 'streaming'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'STREAMING_SERVICES' as C7SubCategory,
    weight: 1.9,
  },
  {
    keywords: ['uber', 'lyft', 'airline', 'hotel', 'airbnb', 'travel', 'flight', 'trip'],
    category: 'C7_LIVING_EXPENSES' as DisbursementCategory,
    subCategory: 'TRAVEL_TRANSPORTATION' as C7SubCategory,
    weight: 1.5,
  },

  // C8 - Taxes
  {
    keywords: ['irs', 'franchise tax', 'u.s. treasury', 'property tax', 'tax', 'ftb', 'income tax', 'tax payment'],
    category: 'C8_TAXES' as DisbursementCategory,
    weight: 2.5,
  },

  // C9 - Other Disbursements
  {
    keywords: ['donation', 'charitable', 'charity', 'contribution'],
    category: 'C9_OTHER_DISBURSEMENTS' as DisbursementCategory,
    weight: 1.5,
  },
];

// ============================================================================
// Classifier Functions
// ============================================================================

/**
 * Normalizes a string for keyword matching
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Checks if a description matches a keyword with fuzzy matching
 */
function matchesKeyword(description: string, keyword: string): boolean {
  const normalizedDesc = normalizeText(description);
  const normalizedKeyword = normalizeText(keyword);

  // Exact match
  if (normalizedDesc.includes(normalizedKeyword)) {
    return true;
  }

  // Check if keyword appears as whole word
  const words = normalizedDesc.split(' ');
  return words.some(word => word.includes(normalizedKeyword) || normalizedKeyword.includes(word));
}

/**
 * Classifies a transaction description
 */
export function classifyTransaction(
  description: string,
  type: 'RECEIPT' | 'DISBURSEMENT'
): ClassificationResult {
  const rules = type === 'RECEIPT' ? RECEIPT_RULES : DISBURSEMENT_RULES;
  const matches: Array<{
    rule: KeywordRule;
    matchedKeywords: string[];
    score: number;
  }> = [];

  // Find all matching rules
  for (const rule of rules) {
    const matchedKeywords: string[] = [];

    for (const keyword of rule.keywords) {
      if (matchesKeyword(description, keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      const weight = rule.weight || 1.0;
      const score = matchedKeywords.length * weight;
      matches.push({ rule, matchedKeywords, score });
    }
  }

  // No matches found
  if (matches.length === 0) {
    return {
      category: type === 'RECEIPT' ? 'A6_OTHER_RECEIPTS' : 'C9_OTHER_DISBURSEMENTS',
      confidence: 30, // Low confidence for default categorization
      matchedKeywords: [],
    };
  }

  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score);

  const bestMatch = matches[0];
  const confidence = Math.min(95, 50 + (bestMatch.score * 10));

  return {
    category: bestMatch.rule.category,
    subCategory: bestMatch.rule.subCategory,
    confidence: Math.round(confidence),
    matchedKeywords: bestMatch.matchedKeywords,
  };
}

/**
 * Batch classify multiple transactions
 */
export function classifyTransactions(
  transactions: Array<{ description: string; type: 'RECEIPT' | 'DISBURSEMENT' }>
): ClassificationResult[] {
  return transactions.map(t => classifyTransaction(t.description, t.type));
}

/**
 * Learn from manual corrections (for future ML enhancement)
 */
export function recordCorrection(
  description: string,
  type: 'RECEIPT' | 'DISBURSEMENT',
  correctCategory: TransactionCategory,
  correctSubCategory?: SubCategory
): void {
  // This is a placeholder for future machine learning enhancement
  // Could store corrections in local storage or database
  console.log('Recording correction:', {
    description,
    type,
    correctCategory,
    correctSubCategory,
  });
}
