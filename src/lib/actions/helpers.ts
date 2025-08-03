import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency according to the specified locale and currency.
 * Defaults to XOF (CFA Franc) for 'fr' locale and USD for others if not specified.
 *
 * @param amount The number to format.
 * @param locale The locale string (e.g., 'en-US', 'fr-FR').
 * @param currency Optional currency code (e.g., 'USD', 'XOF').
 * @returns The formatted currency string.
 */
export function formatPrice(
  amount: number,
  locale: string = 'en-US',
  currency?: string,
): string {
  let selectedCurrency = currency

  if (!selectedCurrency) {
    // Default currency based on locale if not provided
    if (locale.startsWith('fr')) {
      selectedCurrency = 'XOF'
    } else {
      selectedCurrency = 'USD' // Default to USD for other locales
    }
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: selectedCurrency === 'XOF' ? 0 : 2, // XOF usually doesn't use decimals
      maximumFractionDigits: selectedCurrency === 'XOF' ? 0 : 2,
    }).format(amount)
  } catch (error) {
    console.error(
      `Error formatting price for locale ${locale} and currency ${selectedCurrency}:`,
      error,
    )
    // Fallback formatting
    return `${amount.toFixed(selectedCurrency === 'XOF' ? 0 : 2)} ${selectedCurrency}`
  }
}
