import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { capiTrack, getEventId } from './meta'

// Reads IDs from Vite env:
// - VITE_GADS_ID: Google Ads ID (e.g. AW-XXXXXXXXX)
// - VITE_FB_PIXEL_ID or VITE_META_PIXEL_ID: Facebook/Meta Pixel ID (e.g. 1234567890)
const GADS_ID = import.meta.env.VITE_GADS_ID as string | undefined
const FB_PIXEL_ID = (import.meta.env.VITE_FB_PIXEL_ID || import.meta.env.VITE_META_PIXEL_ID) as
  | string
  | undefined

function injectGoogleAdsOnce() {
  if (!GADS_ID) return
  // Skip injection since gtag is now in index.html
  // Just ensure gtag is available and configured
  if (!(window as any).gtag) return
  
  // Configure with our ID (in case index.html uses a different one)
  ;(window as any).gtag('config', GADS_ID)
}

function injectFacebookPixelOnce() {
  if (!FB_PIXEL_ID) return
  const w = window as any
  // Prevent double-injection in React StrictMode/dev
  if (w.__fb_pixel_injected) return

  try {
    if (!w.fbq) {
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
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    }

    w.fbq('init', FB_PIXEL_ID)
    w.fbq('track', 'PageView')
    w.__fb_pixel_injected = true
  } catch (e) {
    console.warn('MarketingPixels: fb pixel injection failed', e)
  }
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
      // @ts-ignore fbq is injected by Meta Pixel script
      const pvEventId = getEventId()
      if ((window as any).fbq) {
        ;(window as any).fbq('track', 'PageView', {}, { eventID: pvEventId })
      }

      // Also send PageView via Meta CAPI for server-side tracking using the SAME event_id
      capiTrack({
        event_name: 'PageView',
        event_id: pvEventId,
        event_source_url: window.location.origin + location.pathname + location.search,
        action_source: 'website',
      }).catch((e) => console.warn('CAPI PageView error', e))
    } catch (e) {
      console.warn('MarketingPixels: track error', e)
    }
  }, [location.pathname, location.search])

  return null
}

// Helper pour tracker des événements custom (ex: InitiateCheckout)
export function trackPixelEvent(event: string, parameters?: any, eventId?: string) {
  // @ts-ignore fbq is injected by Meta Pixel script
  if (FB_PIXEL_ID && (window as any).fbq) {
    ;(window as any).fbq('track', event, parameters, eventId ? { eventID: eventId } : undefined)
  }
}