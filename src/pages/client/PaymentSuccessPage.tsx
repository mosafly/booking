import React, { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Home, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trackPixelEvent } from '@/lib/analytics/MarketingPixels'
import { capiTrack } from '@/lib/analytics/meta'

const PaymentSuccessPage: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get('reservation_id') || undefined
  const urlEventId = searchParams.get('event_id') || undefined
  const amountParam = searchParams.get('amount') || undefined
  const currencyParam = searchParams.get('currency') || undefined

  useEffect(() => {
    // Track Google Ads conversion (fire-and-forget)
    if ((window as any).gtag) {
      ;(window as any).gtag('event', 'conversion', {
        send_to: 'AW-17422060448/LGGiCMC89fwaEKCXvvNA',
      })
    }

    // Track Meta Pixel Purchase with event_id (dedup with CAPI)
    const value = amountParam ? Number(amountParam) : undefined
    const currency = currencyParam || 'XOF'
    if (urlEventId && value) {
      trackPixelEvent(
        'Purchase',
        {
          value,
          currency,
          content_category: 'padel_booking',
          transaction_id: reservationId,
        },
        urlEventId,
      )

      // Also send Purchase via Meta CAPI using the same event_id for deduplication
      capiTrack({
        event_name: 'Purchase',
        event_id: urlEventId,
        event_source_url: window.location.href,
        action_source: 'website',
        custom_data: {
          value,
          currency,
          content_type: 'product',
          content_ids: reservationId ? [reservationId] : undefined,
          contents: reservationId
            ? [{ id: reservationId, quantity: 1, item_price: value }]
            : undefined,
          order_id: reservationId,
          content_category: 'padel_booking',
        },
      }).catch((e) => console.warn('CAPI Purchase error', e))
    }
  }, [reservationId, urlEventId, amountParam, currencyParam])

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-md shadow-lg text-center">
      <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-4 text-gray-900">
        {t('paymentSuccessPage.title')}
      </h1>
      <p className="text-gray-600 mb-6 leading-relaxed">
        {t('paymentSuccessPage.message')}
      </p>
      {reservationId && (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <p className="text-sm text-gray-500 mb-1">
            {t('paymentSuccessPage.reservationIdLabel')}
          </p>
          <p className="font-mono text-lg font-semibold text-gray-800">
            {reservationId}
          </p>
        </div>
      )}
      <div className="space-y-3">
        <Link
          to="/home/my-reservations"
          className="w-full inline-flex items-center justify-center py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-md transition duration-300"
        >
          <Eye className="w-5 h-5 mr-2" />
          {t('paymentSuccessPage.button')}
        </Link>
        <Link
          to="/home"
          className="w-full inline-flex items-center justify-center py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md shadow-md transition duration-300"
        >
          <Home className="w-5 h-5 mr-2" />
          {t('paymentSuccessPage.backToHome')}
        </Link>
      </div>
    </div>
  )
}

export default PaymentSuccessPage
