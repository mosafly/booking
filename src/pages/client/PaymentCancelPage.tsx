import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { XCircle, Home, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const PaymentCancelPage: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get('reservation_id')

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-md shadow-lg text-center">
      <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-4 text-gray-900">
        {t('paymentCancelPage.title')}
      </h1>
      <p className="text-gray-600 mb-6 leading-relaxed">
        {t('paymentCancelPage.message')}
      </p>
      {reservationId && (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <p className="text-sm text-gray-500 mb-1">
            {t('paymentCancelPage.reservationIdLabel')}
          </p>
          <p className="font-mono text-lg font-semibold text-gray-800">
            {reservationId}
          </p>
        </div>
      )}
      <div className="space-y-3">
        {reservationId && (
          <Link
            to={`/home/reservation/${reservationId}`}
            className="w-full inline-flex items-center justify-center py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition duration-300"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            {t('paymentCancelPage.retryButton')}
          </Link>
        )}
        <Link
          to="/home"
          className="w-full inline-flex items-center justify-center py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md shadow-md transition duration-300"
        >
          <Home className="w-5 h-5 mr-2" />
          {t('paymentCancelPage.backButton')}
        </Link>
      </div>
    </div>
  )
}

export default PaymentCancelPage
