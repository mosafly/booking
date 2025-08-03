import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CreditCard, Calendar, Clock } from 'lucide-react'
import { Court } from './court-card'
import { formatFCFA } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

// Phone number validation for West African numbers
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')

  // Format for Senegal/West Africa: +221 XX XXX XX XX
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 8)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePhone = (phone: string): boolean => {
  // Remove all non-digits for validation
  const digits = phone.replace(/\D/g, '')
  // Should be 9 digits for Senegal (without country code)
  return digits.length >= 9
}

interface ReservationData {
  court: Court
  selectedDate: Date
  selectedStartTime: Date
  selectedEndTime: Date
  totalPrice: number
}

interface PurchaseFormModalProps {
  isOpen: boolean
  onClose: () => void
  reservationData: ReservationData
  onConfirm: (
    userDetails: UserDetails,
    paymentMethod: 'online' | 'on_spot',
  ) => Promise<void>
}

export interface UserDetails {
  name: string
  email: string
  phone: string
}

const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({
  isOpen,
  onClose,
  reservationData,
  onConfirm,
}) => {
  const { t } = useTranslation()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'online' | 'on_spot' | null
  >('online')
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserName('')
      setUserEmail('')
      setUserPhone('')
      setSelectedPaymentMethod('online')
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatPhoneNumber(value)
    setUserPhone(formatted)
  }

  const isFormValid = (): boolean => {
    return (
      userName.trim().length > 0 &&
      userEmail.trim().length > 0 &&
      validateEmail(userEmail) &&
      validatePhone(userPhone)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!userName.trim()) {
      setError(t('purchaseModal.errors.nameRequired', 'Name is required'))
      return
    }
    if (!userEmail.trim()) {
      setError(t('purchaseModal.errors.emailRequired', 'Email is required'))
      return
    }
    if (!validateEmail(userEmail)) {
      setError(
        t('purchaseModal.errors.emailInvalid', 'Please enter a valid email'),
      )
      return
    }
    if (!validatePhone(userPhone)) {
      setError(
        t(
          'purchaseModal.errors.phoneInvalid',
          'Please enter a valid phone number',
        ),
      )
      return
    }

    setIsLoading(true)

    try {
      const userDetails: UserDetails = {
        name: userName.trim(),
        email: userEmail.trim(),
        phone: userPhone.trim(),
      }

      await onConfirm(userDetails, selectedPaymentMethod || 'online')

      // Don't close modal here - let parent handle success/redirect
    } catch (err: unknown) {
      console.error('Error processing reservation:', err)
      let errorMessage = t(
        'purchaseModal.errors.submitError',
        'An error occurred',
      )
      if (err instanceof Error) {
        errorMessage = err.message
      }
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  if (!reservationData) return null

  const {
    court,
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    totalPrice,
  } = reservationData

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[95vh] overflow-y-auto mx-4 w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {t('purchaseModal.title', 'Complete Your Reservation')}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {t(
              'purchaseModal.description',
              'Please provide your details to complete the reservation',
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 sm:space-y-6 py-4">
            {/* Reservation Summary */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                {t('purchaseModal.summary', 'Reservation Summary')}
              </h4>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    {t('purchaseModal.court', 'Court')}:
                  </span>
                  <span className="font-medium">{court.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {t('purchaseModal.date', 'Date')}:
                  </span>
                  <span className="font-medium text-xs sm:text-sm">
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {t('purchaseModal.time', 'Time')}:
                  </span>
                  <span className="font-medium text-xs sm:text-sm">
                    {format(selectedStartTime, 'h:mm a')} -{' '}
                    {format(selectedEndTime, 'h:mm a')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">
                    {t('purchaseModal.total', 'Total')}:
                  </span>
                  <span className="font-bold text-base sm:text-lg text-[var(--primary)]">
                    {formatFCFA(totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* User Details Form */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                {t('purchaseModal.contactInfo', 'Contact Information')}
              </h4>

              {/* Name Field */}
              <div className="space-y-1 sm:space-y-2">
                <Label
                  htmlFor="name"
                  className="text-xs sm:text-sm font-medium"
                >
                  {t('purchaseModal.labels.name', 'Full Name')} *
                </Label>
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t(
                    'purchaseModal.placeholders.name',
                    'Enter your full name',
                  )}
                  required
                  className="w-full text-sm sm:text-base"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-1 sm:space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs sm:text-sm font-medium"
                >
                  {t('purchaseModal.labels.email', 'Email Address')} *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder={t(
                    'purchaseModal.placeholders.email',
                    'Enter your email address',
                  )}
                  required
                  className="w-full text-sm sm:text-base"
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-1 sm:space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-xs sm:text-sm font-medium"
                >
                  {t('purchaseModal.labels.phone', 'Phone Number')} *
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-2 sm:px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs sm:text-sm">
                    +221
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    value={userPhone}
                    onChange={handlePhoneChange}
                    placeholder="XX XXX XX XX"
                    required
                    className="rounded-l-none text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                {t('purchaseModal.paymentMethod', 'Payment Method')}
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('online')}
                  className={`p-3 sm:p-4 border rounded-lg text-left transition-colors ${
                    selectedPaymentMethod === 'online'
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-[var(--primary)] flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm sm:text-base">
                        {t('purchaseModal.payOnline', 'Pay Online')}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {t(
                          'purchaseModal.payOnlineDesc',
                          'Secure payment via Lomi',
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 sm:pt-6 flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {t('purchaseModal.buttons.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="w-full sm:w-auto bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm sm:text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  {t('purchaseModal.buttons.processing', 'Processing...')}
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {t('purchaseModal.buttons.payNow', 'Pay Now')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PurchaseFormModal
