import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Reads IDs from Vite env:
// - VITE_GADS_ID: Google Ads ID (e.g. AW-XXXXXXXXX)
// - VITE_FB_PIXEL_ID: Facebook Pixel ID (e.g. 1234567890)
const GADS_ID = import.meta.env.VITE_GADS_ID as string | undefined
const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID as string | undefined

function injectGoogleAdsOnce() {
  if (!GADS_ID) return
  // Avoid duplicate injection
  if (document.getElementById('gads-gtag')) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GADS_ID)}`
  script.id = 'gads-gtag'
  document.head.appendChild(script)

  // Init dataLayer and gtag
  ;(window as any).dataLayer = (window as any).dataLayer || []
  function gtag(...args: any[]) {
    ;(window as any).dataLayer.push(args)
  }
  ;(window as any).gtag = gtag
  gtag('js', new Date())
  gtag('config', GADS_ID)
}

function injectFacebookPixelOnce() {
  if (!FB_PIXEL_ID) return
  // Avoid duplicate injection
  if ((window as any).fbq) return

  // Standard Meta Pixel snippet
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      ;(n!.callMethod ? n!.callMethod : n!.queue.push).apply(n, arguments as any)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = true
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode!.insertBefore(t, s)
  })(
    window,
    document,
    'script',
    'https://connect.facebook.net/en_US/fbevents.js',
  )

  ;(window as any).fbq('init', FB_PIXEL_ID)
  ;(window as any).fbq('track', 'PageView')
}

export function MarketingPixels() {
  const location = useLocation()

  // Inject scripts on first mount
  useEffect(() => {
    try {
      injectGoogleAdsOnce()
      injectFacebookPixelOnce()
    } catch (e) {
      console.warn('MarketingPixels: injection error', e)
    }
  }, [])

  // Track SPA page views on route change
  useEffect(() => {
    try {
      if (GADS_ID && (window as any).gtag) {
        ;(window as any).gtag('config', GADS_ID, {
          page_path: location.pathname + location.search,
        })
      }
      if ((window as any).fbq) {
        ;(window as any).fbq('track', 'PageView')
      }
    } catch (e) {
      console.warn('MarketingPixels: track error', e)
    }
  }, [location.pathname, location.search])

  return null
}
