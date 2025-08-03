import React, { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/contexts/Supabase'
import { useAuth } from '@/lib/contexts/Auth'
import ReservationList, {
  Reservation,
} from '@/components/booking/reservation-list'
import {
  getStoredReservations,
  StoredReservation,
} from '@/lib/utils/reservation-storage'
import toast from 'react-hot-toast'
import { Spinner } from '@/components/dashboard/spinner'
import { useTranslation } from 'react-i18next'

const MyReservationsPage: React.FC = () => {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const { t } = useTranslation()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        let reservationData: Reservation[] = []

        if (user) {
          // Fetch reservations for authenticated users
          const { data, error } = await supabase
            .from('reservations')
            .select(
              `
              *,
              courts(name)
            `,
            )
            .eq('user_id', user.id)
            .order('start_time', { ascending: false })

          if (error) throw error

          // Transform the data to match our Reservation type
          reservationData = data.map((item) => ({
            ...item,
            court_name: item.courts.name,
          }))
        } else {
          // For anonymous users, get reservations from localStorage
          const storedReservations = getStoredReservations()

          // Transform stored reservations to match Reservation type
          reservationData = storedReservations.map(
            (stored: StoredReservation) => ({
              id: stored.id,
              court_name: stored.court,
              start_time: stored.date + ' ' + stored.time.split(' - ')[0], // Rough approximation
              end_time: stored.date + ' ' + stored.time.split(' - ')[1],
              total_price: stored.total,
              status: stored.status || 'pending',
              created_at: stored.createdAt,
              // Add other required fields with defaults
              user_id: null,
              court_id: '',
              email_dispatch_status: 'NOT_INITIATED',
              email_dispatch_attempts: 0,
              user_name: '',
              user_email: stored.email,
              user_phone: '',
            }),
          )
        }

        setReservations(reservationData)
      } catch (error) {
        console.error('Error fetching reservations:', error)
        toast.error(t('myReservationsPage.errorLoading'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [user, supabase, t])

  const handleCancelReservation = async (id: string) => {
    try {
      if (user) {
        // Cancel reservation in database for authenticated users
        const { error } = await supabase
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('id', id)

        if (error) throw error
      } else {
        // For anonymous users, update localStorage
        const storedReservations = getStoredReservations()
        const updatedReservations = storedReservations.map((res) =>
          res.id === id ? { ...res, status: 'cancelled' as const } : res,
        )
        localStorage.setItem(
          'myReservations',
          JSON.stringify(updatedReservations),
        )
      }

      // Update the local state
      setReservations((prev) =>
        prev.map((res) =>
          res.id === id ? { ...res, status: 'cancelled' } : res,
        ),
      )

      toast.success(t('myReservationsPage.cancelSuccess'))
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      toast.error(t('myReservationsPage.cancelError'))
    }
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t('myReservationsPage.title')}
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          {t('myReservationsPage.subtitle')}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8 md:py-12">
          <Spinner />
        </div>
      ) : (
        <ReservationList
          reservations={reservations}
          onCancel={handleCancelReservation}
        />
      )}
    </div>
  )
}

export default MyReservationsPage
