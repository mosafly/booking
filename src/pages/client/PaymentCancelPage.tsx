import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const PaymentCancelPage: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get('reservation_id')

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-sm shadow-md text-center">
      <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">
        {t('paymentCancelPage.title', 'Payment Cancelled or Failed')}
      </h1>
      <p className="text-gray-600 mb-6">
        {t(
          'paymentCancelPage.message',
          'Your payment was cancelled or could not be processed. Please try again or choose a different payment method.',
        )}
      </p>
      {reservationId && (
        <p className="text-sm text-gray-500 mb-6">
          {t('paymentCancelPage.reservationIdLabel', 'Reservation ID:')}{' '}
          {reservationId}
        </p>
      )}
      <Link
        to="/home"
        className="inline-block mr-2 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-sm shadow-md transition duration-300"
      >
        {t('paymentCancelPage.backButton', 'Back to Courts')}
      </Link>
      <Link
        to={`/home/reservation/${reservationId}`}
        className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-sm shadow-md transition duration-300"
      >
        {t('paymentCancelPage.retryButton', 'Try Again')}
      </Link>
    </div>
  )
}

export default PaymentCancelPage
