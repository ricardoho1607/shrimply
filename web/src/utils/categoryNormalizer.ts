/**
 * categoryNormalizer.ts
 *
 * Expense and revenue categories are stored in Firestore using whatever
 * language was active when the record was created (EN / ID / ZH).
 * This map translates all known variants back to canonical English keys
 * so that filtering, grouping, and PDF generation always work correctly.
 */

export const CATEGORY_NORMALIZER: Record<string, string> = {
  // -- Expense categories ----------------------------------------------
  // Feed
  'Feed': 'Feed',
  'Pakan': 'Feed',
  '饲料': 'Feed',
  // Pond Additives
  'Pond Additives': 'Pond Additives',
  'Aditif Kolam': 'Pond Additives',
  '添加剂': 'Pond Additives',
  // Labor
  'Labor': 'Labor',
  'Tenaga Kerja': 'Labor',
  '人工': 'Labor',
  // Repairs
  'Repairs': 'Repairs',
  'Perbaikan': 'Repairs',
  '维修': 'Repairs',
  // Utilities
  'Utilities': 'Utilities',
  'Utilitas': 'Utilities',
  '公用事业': 'Utilities',
  // Miscellaneous
  'Miscellaneous': 'Miscellaneous',
  'Lain-lain': 'Miscellaneous',
  '杂项': 'Miscellaneous',
  // Loan Payment
  'Loan Payment': 'Loan Payment',
  'Pembayaran Pinjaman': 'Loan Payment',
  '贷款还款': 'Loan Payment',
  // Taxes
  'Taxes': 'Taxes',
  'Pajak': 'Taxes',
  '税务': 'Taxes',
  // Interest
  'Interest': 'Interest',
  'Bunga': 'Interest',
  '利息': 'Interest',
  // Equipment
  'Equipment': 'Equipment',
  'Peralatan': 'Equipment',
  '设备': 'Equipment',
  // Property
  'Property': 'Property',
  'Properti': 'Property',
  '财产': 'Property',
  // Infrastructure
  'Infrastructure': 'Infrastructure',
  'Infrastruktur': 'Infrastructure',
  '基础设施': 'Infrastructure',
  // Owner Withdrawal
  'Owner Withdrawal': 'Owner Withdrawal',
  'Penarikan Pemilik': 'Owner Withdrawal',
  '业主提款': 'Owner Withdrawal',
  // Dividend
  'Dividend': 'Dividend',
  'Dividen': 'Dividend',
  '股息': 'Dividend',
  // Maintenance
  'Maintenance': 'Maintenance',
  'Pemeliharaan': 'Maintenance',
  '维护': 'Maintenance',

  // -- Revenue categories -----------------------------------------------
  // Shrimp Sales
  'Shrimp Sales': 'Shrimp Sales',
  'Penjualan Udang': 'Shrimp Sales',
  '虾销售': 'Shrimp Sales',
  // Consultation
  'Consultation': 'Consultation',
  'Konsultasi': 'Consultation',
  '咨询': 'Consultation',
  // Equipment Rental
  'Equipment Rental': 'Equipment Rental',
  'Sewa Peralatan': 'Equipment Rental',
  '设备租赁': 'Equipment Rental',
  // Other Income
  'Other Income': 'Other Income',
  'Pendapatan Lain': 'Other Income',
  '其他收入': 'Other Income',
};

/**
 * Returns the canonical English category name, or the original string
 * if no mapping exists (future-proofing for custom categories).
 */
export const normalizeCategory = (category: string): string =>
  CATEGORY_NORMALIZER[category] ?? category;
