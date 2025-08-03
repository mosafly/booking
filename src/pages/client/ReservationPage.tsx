import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { addDays, format, startOfDay } from 'date-fns'
import { useSupabase } from '@/lib/contexts/Supabase'
import { useAuth } from '@/lib/contexts/Auth'
import { Court } from '@/components/booking/court-card'
import TimeSlotPicker from '@/components/booking/time-slot-picker'
import { calculatePrice } from '@/lib/utils/reservation-rules'
import { Calendar, Clock, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import PaymentMethodSelector from '@/components/booking/payment-method-selector'
import { Spinner } from '@/components/dashboard/spinner'
import { useTranslation } from 'react-i18next'
import { formatFCFA } from '@/lib/utils/currency'
// Updated imports for dual pricing system

const ReservationPage: React.FC = () => {
  const { courtId } = useParams()
  const navigate = useNavigate()
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const { t } = useTranslation()

  const [court, setCourt] = useState<Court | null>(null)
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null)
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<
    { startTime: Date; endTime: Date }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch court details
  useEffect(() => {
    const fetchCourt = async () => {
      if (!courtId) return

      try {
        const { data, error } = await supabase
          .from('courts')
          .select('*')
          .eq('id', courtId)
          .single()

        if (error) throw error

        setCourt(data)
      } catch (error) {
        console.error('Error fetching court:', error)
        toast.error(t('reservationPage.errorLoadingCourt'))
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourt()
  }, [courtId, supabase, navigate, t])

  // Fetch available slots for selected date
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!courtId) return

      try {
        // In a real app, this would query the database for existing reservations
        // and filter out time slots that are already booked

        // For the demo, we'll simulate some booked slots
        // const startDate = selectedDate; // Removed
        // const endDate = addDays(selectedDate, 1); // Removed

        // Generate available slots based on equipment type
        const allSlots = []
        for (let hour = 8; hour < 22; hour++) {
          for (let minutes = 0; minutes < 60; minutes += 30) {
            const startTime = new Date(selectedDate)
            startTime.setHours(hour, minutes, 0, 0)

            const endTime = new Date(startTime)
            endTime.setHours(hour, minutes + 30, 0, 0)

            allSlots.push({ startTime, endTime })
          }
        }

        // In a real app, we'd filter out booked slots here
        setAvailableSlots(allSlots)
      } catch (error) {
        console.error('Error fetching available slots:', error)
        toast.error(t('reservationPage.errorLoadingSlots'))
      }
    }

    fetchAvailableSlots()
  }, [courtId, selectedDate, supabase, t])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value)
    setSelectedDate(date)
    setSelectedStartTime(null)
    setSelectedEndTime(null)
  }

  const handleTimeSlotSelect = (startTime: Date, endTime: Date) => {
    setSelectedStartTime(startTime)
    setSelectedEndTime(endTime)
  }

  const handleCashReservation = async () => {
    if (!court || !selectedStartTime || !selectedEndTime || !user) {
      toast.error(t('reservationPage.errorInvalidSlot'))
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate the total price based on actual duration
      const durationMinutes =
        (selectedEndTime.getTime() - selectedStartTime.getTime()) / (1000 * 60)
      const totalPrice = calculatePrice(court.price_per_hour, durationMinutes)

      // Create the reservation
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([
          {
            court_id: court.id,
            user_id: user.id,
            start_time: selectedStartTime.toISOString(),
            end_time: selectedEndTime.toISOString(),
            total_price: totalPrice,
            status: 'pending',
          },
        ])
        .select()
        .single()

      if (reservationError) throw reservationError

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            reservation_id: reservationData.id,
            user_id: user.id,
            amount: totalPrice,
            currency: 'XOF',
            payment_method: 'on_spot',
            status: 'pending',
            payment_date: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (paymentError) {
        console.error('Error creating payment record:', paymentError)
        toast.error(t('reservationPage.errorSavingPayment'))
      } else {
        console.log('Payment record created:', paymentData)
      }

      toast.success(t('reservationPage.reservationSuccess'))
      navigate('/my-reservations')
    } catch (error) {
      console.error('Error creating reservation:', error)
      toast.error(t('reservationPage.reservationError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOnlinePayment = async () => {
    if (!court || !selectedStartTime || !selectedEndTime || !user) {
      toast.error(t('reservationPage.errorInvalidSlotOnline'))
      return
    }
    setIsSubmitting(true)

    try {
      const hours =
        (selectedEndTime.getTime() - selectedStartTime.getTime()) /
        (1000 * 60 * 60)
      const totalPrice = court.price_per_hour * hours

      console.log(
        'Starting online payment process with total price:',
        totalPrice,
      )

      // 1. Create the reservation first (as before)
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([
          {
            court_id: court.id,
            user_id: user.id,
            start_time: selectedStartTime.toISOString(),
            end_time: selectedEndTime.toISOString(),
            total_price: totalPrice,
            status: 'pending', // Status remains pending until payment confirmed
          },
        ])
        .select()
        .single()

      if (reservationError) {
        console.error('Error creating reservation:', reservationError)
        throw reservationError // Let the main catch block handle it
      }

      console.log('Reservation created successfully:', reservationData)
      const reservationId = reservationData.id

      // 2. Create the payment record (status pending)
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            reservation_id: reservationId,
            user_id: user.id,
            amount: totalPrice,
            currency: 'XOF', // Assuming XOF
            payment_method: 'online',
            payment_provider: 'lomi', // Indicate Lomi is used
            status: 'pending', // Initial status
            // provider_payment_id and payment_url will be set by webhook potentially
          },
        ])
        .select()
        .single()

      if (paymentError) {
        // Log the error but attempt to proceed with payment creation
        console.error('Error creating initial payment record:', paymentError)
        toast.error(t('reservationPage.errorSavingPayment'))
        // Depending on requirements, you might want to throw here or just warn
      } else {
        console.log('Initial payment record created (pending):', paymentData)
      }

      // 3. Call the Supabase Edge Function to get the Lomi checkout URL
      console.log("Calling Supabase function 'create-lomi-checkout-session'...")
      const { data: functionData, error: functionError } =
        await supabase.functions.invoke('create-lomi-checkout-session', {
          body: {
            amount: totalPrice,
            currencyCode: 'XOF', // Send currency code
            reservationId: reservationId,
            courtId: court.id, // NEW: Pass court ID for product ID lookup
            userEmail: user.email,
            userName: user.user_metadata?.full_name || user.email, // Pass user details
            // Optionally pass specific success/cancel paths if needed
            // successUrlPath: "/custom-success",
            // cancelUrlPath: "/custom-cancel",
          },
        })

      if (functionError) {
        console.error('Supabase function error:', functionError)
        throw new Error(
          `Failed to create payment session: ${functionError.message}`,
        )
      }

      if (!functionData?.checkout_url) {
        console.error(
          'Supabase function did not return checkout_url:',
          functionData,
        )
        throw new Error('Payment session creation failed (no URL returned).')
      }

      console.log('Lomi checkout URL received:', functionData.checkout_url)

      // 4. Redirect user to Lomi checkout page
      window.location.href = functionData.checkout_url

      // No need to set submitting false here, as the page redirects
    } catch (err: unknown) {
      let errMessage = 'An unknown error occurred during online payment.'
      if (err instanceof Error) {
        errMessage = err.message
      }
      console.error('Online payment process failed:', err)
      toast.error(
        t('reservationPage.onlinePaymentFailed', { message: errMessage }),
      )
      setIsSubmitting(false) // Set submitting false only on error before redirect
    }
    // No finally block setting isSubmitting false, because successful path redirects
  }

  const calculateTotalPrice = () => {
    if (!selectedStartTime || !selectedEndTime || !court) return 0

    const durationInHours =
      (selectedEndTime.getTime() - selectedStartTime.getTime()) /
      (1000 * 60 * 60)
    return durationInHours * court.price_per_hour
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!court) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('reservationPage.courtNotFound')}</p>
        <button onClick={() => navigate('/home')} className="btn btn-secondary">
          {t('reservationPage.backButton')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/home')}
          className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium flex items-center"
        >
          ← {t('reservationPage.backToCourtsLink')}
        </button>
      </div>

      <div className="bg-white rounded-md shadow-sm overflow-hidden mb-6">
        <div className="md:flex">
          <div className="md:w-1/3">
            <img
              src={
                court.image_url ||
                'https://images.pexels.com/photos/2277807/pexels-photo-2277807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
              }
              alt={court.name}
              className="w-full h-64 md:h-full object-cover"
              onError={(e) => {
                // Fallback to default image if court image fails to load
                const target = e.target as HTMLImageElement
                target.src =
                  'https://images.pexels.com/photos/2277807/pexels-photo-2277807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
              }}
            />
          </div>
          <div className="p-6 md:w-2/3">
            <h2 className="text-2xl font-bold text-gray-900">{court.name}</h2>
            <p className="mt-2 text-gray-600">{court.description}</p>

            <div className="mt-4 flex items-center text-gray-700">
              <DollarSign size={20} className="mr-1" />
              <span className="text-lg font-medium">
                {formatFCFA(court.price_per_hour)}{' '}
                {t('courtCard.pricePerHourSuffix')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isSubmitting ? (
            <Spinner />
          ) : (
            t('reservationPage.titleMakeReservation')
          )}
        </h2>

        <div>
          <div className="form-group">
            <label htmlFor="date" className="form-label flex items-center">
              <Calendar size={16} className="mr-1" />
              {t('reservationPage.selectDateLabel')}
            </label>
            <input
              type="date"
              id="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
              className="form-input"
              required
            />
          </div>

          <TimeSlotPicker
            date={selectedDate}
            court={court}
            availableSlots={availableSlots}
            selectedStartTime={selectedStartTime}
            selectedEndTime={selectedEndTime}
            onSelectTimeSlot={handleTimeSlotSelect}
          />

          {selectedStartTime && selectedEndTime && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold text-gray-900">
                {t('reservationPage.summaryTitle')}
              </h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center text-sm text-gray-700">
                  <Calendar size={16} className="mr-2" />
                  <span>{format(selectedDate, 'MMMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <Clock size={16} className="mr-2" />
                  <span>
                    {format(selectedStartTime, 'h:mm a')} -{' '}
                    {format(selectedEndTime, 'h:mm a')}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <DollarSign size={16} className="mr-2" />
                  <span>
                    {t('reservationPage.summaryTotalLabel')}{' '}
                    {formatFCFA(calculateTotalPrice())}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedStartTime && selectedEndTime && (
            <div className="mt-6">
              <PaymentMethodSelector
                onComplete={async (method: 'on_spot' | 'online') => {
                  if (method === 'on_spot') {
                    await handleCashReservation()
                  } else {
                    await handleOnlinePayment()
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReservationPage
