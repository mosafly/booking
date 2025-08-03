/**
 * Currency formatting utility functions
 */

/**
 * Format amount in FCFA currency
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export const formatFCFA = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format amount with custom currency
 * @param amount The amount to format
 * @param currency The currency code (default: XOF)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'XOF'
): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'XOF' ? 0 : 2,
    maximumFractionDigits: currency === 'XOF' ? 0 : 2,
  }).format(amount);
};

/**
 * Convert cents to main currency unit
 * @param cents The amount in cents
 * @returns Amount in main currency unit
 */
export const centsToAmount = (cents: number): number => {
  return cents / 100;
};

/**
 * Convert main currency unit to cents
 * @param amount The amount in main currency unit
 * @returns Amount in cents
 */
export const amountToCents = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Format amount in FCFA without currency symbol
 * @param amount The amount to format
 * @returns Formatted number string without symbol
 */
export const formatFCFAWithoutSymbol = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};