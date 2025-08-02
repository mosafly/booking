/**
 * Format price in FCFA (Franc CFA)
 * @param amount - amount in FCFA
 * @returns formatted string with FCFA symbol
 */
export const formatFCFA = (amount: number): string => {
  return new Intl.NumberFormat('fr-CI', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format price in FCFA without currency symbol (for gym equipment)
 * @param amount - amount in FCFA
 * @returns formatted string with "F CFA" suffix
 */
export const formatFCFAWithoutSymbol = (amount: number): string => {
  const formatted = new Intl.NumberFormat('fr-CI', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} F CFA`;
};

/**
 * Format price for display without currency symbol
 * @param amount - amount in FCFA
 * @returns formatted string
 */
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('fr-CI', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Validate FCFA amount
 * @param amount - amount to validate
 * @returns boolean indicating if valid
 */
export const isValidFCFA = (amount: number): boolean => {
  return amount >= 0 && Number.isInteger(amount);
};
