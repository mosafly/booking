import React from 'react'
import { CreditCard, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Spinner } from '../dashboard/spinner'

interface PaymentMethodSelectorProps {
  onComplete: (method: 'online' | 'on_spot') => Promise<void>
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  onComplete,
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false)
  const { t } = useTranslation()

  const handlePaymentMethodSelect = async (method: 'online' | 'on_spot') => {
    setIsProcessing(true)
    try {
      await onComplete(method)
    } catch (error) {
      console.error('Payment error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">
        {t('paymentMethodSelector.title')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handlePaymentMethodSelect('online')}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <CreditCard size={20} />
          <span>{t('paymentMethodSelector.payOnline')}</span>
        </button>
        <button
          onClick={() => handlePaymentMethodSelect('on_spot')}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Wallet size={20} />
          <span>{t('paymentMethodSelector.payOnSpot')}</span>
        </button>
      </div>
      {isProcessing && (
        <div className="mt-4 text-center text-sm text-gray-500">
          <Spinner />
        </div>
      )}
    </div>
  )
}

export default PaymentMethodSelector
