import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { addDays, format, startOfDay, endOfDay } from 'date-fns'
import { useSupabase } from '@/lib/contexts/Supabase'
import { useAuth } from '@/lib/contexts/Auth'
import { Court } from '@/components/booking/court-card'
import TimeSlotPicker from '@/components/booking/time-slot-picker'
import PurchaseFormModal, {
  UserDetails,
} from '@/components/booking/PurchaseFormModal'
import { calculatePrice } from '@/lib/utils/reservation-rules'
import { Calendar, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Spinner } from '@/components/dashboard/spinner'
import { useTranslation } from 'react-i18next'
import { formatFCFA } from '@/lib/utils/currency'
import {
  addStoredReservation,
  setPendingReservation,
} from '@/lib/utils/reservation-storage'
import { createConversionClickHandler } from '@/lib/utils/conversion-tracking'

const ReservationPage: React.FC = () => {
  const { courtId } = useParams()
  const navigate = useNavigate()
  const { supabase } = useSupabase()
  const { user } = useAuth() // Still needed for admin functions, but not required for reservations
  const { t } = useTranslation()

  const [court, setCourt] = useState<Court | null>(null)
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null)
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<
    { startTime: Date; endTime: Date }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  // Fetch court details
  useEffect(() => {
    const fetchCourt = async () => {
      if (!courtId) {
        console.log(
          'No courtId provided in URL parameters, redirecting to home',
        )
        navigate('/home')
        setIsLoading(false)
        return
      }

      try {
        // Use the RPC function to bypass RLS issues
        const { data: allCourts, error } = await supabase.rpc('get_all_courts')

        if (error) throw error

        // Find the specific court by ID
        const courtData = allCourts?.find((court: Court) => court.id === courtId)

        if (!courtData) {
          throw new Error('Court not found')
        }

        setCourt(courtData)
      } catch (error) {
        console.error('Error fetching court:', error)
        toast.error(t('reservationPage.errorLoadingCourt'))
        navigate('/home')
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
        // Compute business hours window for the selected day: 08:00 - 22:00
        const dayOpen = new Date(selectedDate)
        dayOpen.setHours(8, 0, 0, 0)
        const dayClose = new Date(selectedDate)
        dayClose.setHours(22, 0, 0, 0)

        const dayStartISO = startOfDay(selectedDate).toISOString()
        const dayEndISO = endOfDay(selectedDate).toISOString()

        // Fetch overlapping reservations (exclude cancelled)
        const reservationsPromise = supabase
          .from('reservations')
          .select('start_time, end_time, status')
          .eq('court_id', courtId)
          .neq('status', 'cancelled')
          .lt('start_time', dayEndISO)
          .gt('end_time', dayStartISO)

        // Fetch overlapping court unavailabilities
        const unavailabilityPromise = supabase
          .from('court_unavailabilities')
          .select('start_time, end_time')
          .eq('court_id', courtId)
          .lt('start_time', dayEndISO)
          .gt('end_time', dayStartISO)

        const [{ data: resvData, error: resvError }, { data: unavailData, error: unavailError }] =
          await Promise.all([reservationsPromise, unavailabilityPromise])

        if (resvError) throw resvError
        if (unavailError) throw unavailError

        type Interval = { start: Date; end: Date }

        // Build busy intervals (merge reservations and unavailability)
        const busy: Interval[] = []
        ;(resvData || []).forEach((r: any) => {
          const start = new Date(r.start_time)
          const end = new Date(r.end_time)
          // Clamp to business window
          const s = start < dayOpen ? new Date(dayOpen) : start
          const e = end > dayClose ? new Date(dayClose) : end
          if (s < e) busy.push({ start: s, end: e })
        })
        ;(unavailData || []).forEach((u: any) => {
          const start = new Date(u.start_time)
          const end = new Date(u.end_time)
          const s = start < dayOpen ? new Date(dayOpen) : start
          const e = end > dayClose ? new Date(dayClose) : end
          if (s < e) busy.push({ start: s, end: e })
        })

        // Merge overlapping busy intervals
        busy.sort((a, b) => a.start.getTime() - b.start.getTime())
        const merged: Interval[] = []
        for (const interval of busy) {
          if (merged.length === 0) {
            merged.push({ ...interval })
          } else {
            const last = merged[merged.length - 1]
            if (interval.start <= last.end) {
              // overlap
              if (interval.end > last.end) last.end = interval.end
            } else {
              merged.push({ ...interval })
            }
          }
        }

        // Subtract merged busy from business window to get available intervals
        const available: { startTime: Date; endTime: Date }[] = []
        let cursor = new Date(dayOpen)
        for (const b of merged) {
          if (cursor < b.start) {
            available.push({ startTime: new Date(cursor), endTime: new Date(b.start) })
          }
          if (cursor < b.end) cursor = new Date(b.end)
        }
        if (cursor < dayClose) {
          available.push({ startTime: new Date(cursor), endTime: new Date(dayClose) })
        }

        setAvailableSlots(available)
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

  const handlePurchaseConfirm = async (
    userDetails: UserDetails,
    paymentMethod: 'online' | 'on_spot',
  ) => {
    if (!court || !selectedStartTime || !selectedEndTime) {
      throw new Error(t('reservationPage.errorInvalidSlot'))
    }

    try {
      // Calculate the total price based on actual duration
      const durationMinutes =
        (selectedEndTime.getTime() - selectedStartTime.getTime()) / (1000 * 60)
      const totalPrice = calculatePrice(court.price_per_hour, durationMinutes)

      // Create the reservation with user data
      const reservationData = {
        court_id: court.id,
        start_time: selectedStartTime.toISOString(),
        end_time: selectedEndTime.toISOString(),
        total_price: totalPrice,
        status: 'pending',
        user_name: userDetails.name,
        user_email: userDetails.email,
        user_phone: userDetails.phone,
        // Include user_id if user is logged in (for admin users)
        ...(user ? { user_id: user.id } : {}),
      }

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select()
        .single()

      if (reservationError) throw reservationError

      // Create payment record
      const basePaymentData = {
        reservation_id: reservation.id,
        amount: totalPrice,
        currency: 'XOF',
        payment_method: paymentMethod,
        status: 'pending',
        payment_date: new Date().toISOString(),
        // Include user_id if user is logged in (for admin users)
        ...(user ? { user_id: user.id } : {}),
      }

      const paymentData =
        paymentMethod === 'online'
          ? { ...basePaymentData, payment_provider: 'lomi' }
          : basePaymentData

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single()

      if (paymentError) {
        console.error('Error creating payment record:', paymentError)
        // Continue with reservation even if payment record fails
      }

      if (paymentMethod === 'online') {
        // Handle online payment
        console.log(
          "Calling Supabase function 'create-lomi-checkout-session'...",
        )
        const { data: functionData, error: functionError } =
          await supabase.functions.invoke('create-lomi-checkout-session', {
            body: {
              amount: totalPrice,
              currencyCode: 'XOF',
              reservationId: reservation.id,
              courtId: court.id,
              userEmail: userDetails.email,
              userName: userDetails.name,
              userPhone: userDetails.phone,
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

        console.log('lomi. checkout URL received:', functionData.checkout_url)

        // Store reservation data in localStorage for post-payment tracking
        setPendingReservation({
          id: reservation.id,
          court: court.name,
          date: format(selectedDate, 'MMMM dd, yyyy'),
          time: `${format(selectedStartTime, 'h:mm a')} - ${format(selectedEndTime, 'h:mm a')}`,
          total: totalPrice,
          email: userDetails.email,
          createdAt: new Date().toISOString(),
        })

        // Redirect to lomi. checkout page
        window.location.href = functionData.checkout_url
      } else {
        // Handle on-spot payment
        toast.success(t('reservationPage.reservationSuccess'))

        // Store reservation data in localStorage for tracking
        const reservationInfo = {
          id: reservation.id,
          court: court.name,
          date: format(selectedDate, 'MMMM dd, yyyy'),
          time: `${format(selectedStartTime, 'h:mm a')} - ${format(selectedEndTime, 'h:mm a')}`,
          total: totalPrice,
          email: userDetails.email,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        }

        // Store in localStorage using utility
        addStoredReservation(reservationInfo)

        // Navigate to a success page or home
        navigate('/home')
      }
    } catch (error) {
      console.error('Error creating reservation:', error)
      throw error // Re-throw to let modal handle it
    }
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

      <div className="bg-white rounded-md shadow-sm overflow-hidden mb-4 md:mb-6">
        <div className="md:flex">
          <div className="md:w-1/3">
            <img
              src={
                court.image_url ||
                'https://images.pexels.com/photos/2277807/pexels-photo-2277807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
              }
              alt={court.name}
              className="w-full h-48 md:h-64 lg:h-full object-cover"
              onError={(e) => {
                // Fallback to default image if court image fails to load
                const target = e.target as HTMLImageElement
                target.src =
                  'https://images.pexels.com/photos/2277807/pexels-photo-2277807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
              }}
            />
          </div>
          <div className="p-4 md:p-6 md:w-2/3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {court.name}
            </h2>
            <p className="mt-2 text-gray-600 text-sm md:text-base">
              {court.description}
            </p>

            <div className="mt-3 md:mt-4 flex items-center text-gray-700">
              <span className="text-base md:text-lg font-medium">
                {formatFCFA(court.price_per_hour)}{' '}
                {t('courtCard.pricePerHourSuffix')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
          {t('reservationPage.titleMakeReservation')}
        </h2>

        <div>
          <div className="form-group">
            <label
              htmlFor="date"
              className="form-label flex items-center text-sm md:text-base"
            >
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
              className="form-input text-sm md:text-base"
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
            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                {t('reservationPage.summaryTitle')}
              </h3>
              <div className="mt-2 space-y-1 md:space-y-2">
                <div className="flex items-center text-xs md:text-sm text-gray-700">
                  <Calendar size={14} className="mr-2" />
                  <span>{format(selectedDate, 'MMMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center text-xs md:text-sm text-gray-700">
                  <Clock size={14} className="mr-2" />
                  <span>
                    {format(selectedStartTime, 'h:mm a')} -{' '}
                    {format(selectedEndTime, 'h:mm a')}
                  </span>
                </div>
                <div className="flex items-center text-xs md:text-sm text-gray-700">
                  <span className="font-medium">
                    {t('reservationPage.summaryTotalLabel')}{' '}
                    {formatFCFA(calculateTotalPrice())}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedStartTime && selectedEndTime && (
            <div className="mt-4 md:mt-6">
              <button
                onClick={createConversionClickHandler(() => setShowPurchaseModal(true))}
                className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium py-3 md:py-4 px-6 rounded-md transition-colors text-sm md:text-base"
              >
                {t('reservationPage.proceedToPayment')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Form Modal */}
      {court && selectedStartTime && selectedEndTime && (
        <PurchaseFormModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          reservationData={{
            court,
            selectedDate,
            selectedStartTime,
            selectedEndTime,
            totalPrice: calculateTotalPrice(),
          }}
          onConfirm={handlePurchaseConfirm}
        />
      )}
    </div>
  )
}

export default ReservationPage
