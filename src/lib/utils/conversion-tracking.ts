/**
 * Google Ads conversion tracking utilities
 */

/**
 * Reports a conversion to Google Ads and optionally navigates to a URL
 * @param url - Optional URL to navigate to after conversion is reported
 * @param callback - Optional callback to execute after conversion is reported
 */
export function reportConversion(url?: string, callback?: () => void): void {
  // Check if gtag is available
  if (!(window as any).gtag) {
    console.warn('gtag not available for conversion tracking')
    // Still execute callback/navigation if gtag is not available
    if (callback) {
      callback()
    } else if (url) {
      window.location.href = url
    }
    return
  }

  const conversionCallback = () => {
    if (callback) {
      callback()
    } else if (url) {
      window.location.href = url
    }
  }

  // Report conversion to Google Ads
  ;(window as any).gtag('event', 'conversion', {
    send_to: 'AW-17422060448/LGGiCMC89fwaEKCXvvNA',
    event_callback: conversionCallback
  })
}

/**
 * Creates a click handler that reports conversion before executing action
 * @param action - Function to execute after conversion is reported
 */
export function createConversionClickHandler(action: () => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    reportConversion(undefined, action)
  }
}

/**
 * Creates a click handler that reports conversion before navigating
 * @param url - URL to navigate to after conversion is reported
 */
export function createConversionLinkHandler(url: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    reportConversion(url)
  }
}
