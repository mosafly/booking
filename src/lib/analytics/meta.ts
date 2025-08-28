import { supabase } from '../supabase/client'

// Utilities to work with Meta Pixel + CAPI

const META_PIXEL_ID = (import.meta as any).env.VITE_META_PIXEL_ID as string | undefined
const META_TEST_EVENT_CODE = (import.meta as any).env.VITE_META_TEST_EVENT_CODE as string | undefined

function uuidv4() {
  // Simple UUIDv4 generator for event_id
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function readCookie(name: string): string | undefined {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return m ? decodeURIComponent(m.pop() as string) : undefined
}

export function getFbpFbc() {
  return {
    fbp: readCookie('_fbp'),
    fbc: readCookie('_fbc'),
  }
}

export function getEventId() {
  return uuidv4()
}

export function pixelTrack(event: string, payload: Record<string, any>, eventId?: string) {
  if (!(window as any).fbq || !META_PIXEL_ID) return
  try {
    ;(window as any).fbq('track', event, payload || {}, eventId ? { eventID: eventId } : undefined)
  } catch (e) {
    console.warn('pixelTrack error', e)
  }
}

export async function capiTrack(
  body: {
    event_name: string
    event_id: string
    event_time?: number
    event_source_url?: string
    action_source?: 'website'
    custom_data?: Record<string, any>
    external_id?: string
    email?: string
    phone?: string
    attribution_data?: Record<string, any>
    original_event_data?: Record<string, any>
    data_processing_options?: string[]
    data_processing_options_country?: number
    data_processing_options_state?: number
    test_event_code?: string
  },
) {
  const { fbp, fbc } = getFbpFbc()
  const payload = {
    ...body,
    fbp,
    fbc,
    // prefer explicit test code else env
    test_event_code: body.test_event_code || META_TEST_EVENT_CODE,
  }
  return supabase.functions.invoke('meta-capi', { body: payload })
}

// High-level helpers used in UI
export async function trackInitiateCheckout(args: {
  eventId?: string
  value: number
  currency: string
  slotId: string
  itemPrice: number
  category?: 'court' | 'coach'
  court_id?: string
  coach_id?: string | null
  slot_start_iso: string
  slot_end_iso: string
  location_city?: string
  external_id?: string
  email?: string
  phone?: string
}) {
  const event_id = args.eventId || getEventId()

  pixelTrack(
    'InitiateCheckout',
    {
      currency: args.currency,
      value: args.value,
      content_type: 'product',
      content_ids: [args.slotId],
      contents: [{ id: args.slotId, quantity: 1, item_price: args.itemPrice, category: args.category || 'court' }],
      court_id: args.court_id,
      coach_id: args.coach_id,
      slot_start_iso: args.slot_start_iso,
      slot_end_iso: args.slot_end_iso,
      location_city: args.location_city,
    },
    event_id,
  )

  return capiTrack({
    event_name: 'InitiateCheckout',
    event_id,
    event_source_url: window.location.href,
    custom_data: {
      currency: args.currency,
      value: args.value,
      content_type: 'product',
      content_ids: [args.slotId],
      contents: [{ id: args.slotId, quantity: 1, item_price: args.itemPrice, category: args.category || 'court' }],
      court_id: args.court_id,
      coach_id: args.coach_id,
      slot_start_iso: args.slot_start_iso,
      slot_end_iso: args.slot_end_iso,
      location_city: args.location_city,
    },
    external_id: args.external_id,
    email: args.email,
    phone: args.phone,
  })
}

export async function trackPurchase(args: {
  eventId: string // reuse the one from InitiateCheckout for deduplication
  value: number
  currency: string
  bookingId: string
  slotId: string
  itemPrice: number
  court_id?: string
  coach_id?: string | null
  slot_start_iso: string
  slot_end_iso: string
  location_city?: string
  external_id?: string
  email?: string
  phone?: string
}) {
  // Pixel optional here, but we can fire it too using same event_id
  pixelTrack(
    'Purchase',
    {
      currency: args.currency,
      value: args.value,
      content_type: 'product',
      content_ids: [args.bookingId],
      contents: [{ id: args.slotId, quantity: 1, item_price: args.itemPrice }],
      order_id: args.bookingId,
      court_id: args.court_id,
      coach_id: args.coach_id,
      slot_start_iso: args.slot_start_iso,
      slot_end_iso: args.slot_end_iso,
      location_city: args.location_city,
    },
    args.eventId,
  )

  return capiTrack({
    event_name: 'Purchase',
    event_id: args.eventId,
    event_source_url: window.location.href,
    custom_data: {
      currency: args.currency,
      value: args.value,
      content_type: 'product',
      content_ids: [args.bookingId],
      contents: [{ id: args.slotId, quantity: 1, item_price: args.itemPrice }],
      order_id: args.bookingId,
      court_id: args.court_id,
      coach_id: args.coach_id,
      slot_start_iso: args.slot_start_iso,
      slot_end_iso: args.slot_end_iso,
      location_city: args.location_city,
    },
    external_id: args.external_id,
    email: args.email,
    phone: args.phone,
  })
}
