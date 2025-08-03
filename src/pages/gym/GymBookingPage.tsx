import React, { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/lib/contexts/Supabase'
import { GymBooking } from '@/types/coach'
import { format, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Calendar, Clock, Users, DollarSign, User, MapPin } from 'lucide-react'
import { useAuth } from '@/lib/contexts/Auth'

export const GymBookingPage: React.FC = () => {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [bookings, setBookings] = useState<GymBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true)

      const startDate = startOfDay(selectedDate)
      const endDate = endOfDay(selectedDate)

      const { data: bookingsData, error } = await supabase
        .from('gym_bookings')
        .select(
          `
          *,
          coach:coach_profiles!coach_id(*)
        `,
        )
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })

      if (error) throw error
      setBookings(bookingsData || [])
    } catch (error) {
      console.error('Error loading bookings:', error)
      toast.error('Erreur lors du chargement des cours')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, supabase])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const handleJoinClass = async (bookingId: string) => {
    if (!user) {
      toast.error('Veuillez vous connecter pour réserver')
      return
    }

    try {
      // Check if already booked
      const { data: existing } = await supabase
        .from('gym_booking_participants')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        toast.error('Vous êtes déjà inscrit à ce cours')
        return
      }

      // Check availability
      const { data: booking } = await supabase
        .from('gym_bookings')
        .select('current_participants, max_participants')
        .eq('id', bookingId)
        .single()

      if (
        !booking ||
        booking.current_participants >= booking.max_participants
      ) {
        toast.error('Ce cours est complet')
        return
      }

      // Join the class
      const { error: participantError } = await supabase
        .from('gym_booking_participants')
        .insert({
          booking_id: bookingId,
          user_id: user.id,
        })

      if (participantError) throw participantError

      // Update participant count
      const { error: updateError } = await supabase
        .from('gym_bookings')
        .update({
          current_participants: booking.current_participants + 1,
        })
        .eq('id', bookingId)

      if (updateError) throw updateError

      toast.success('Inscription réussie!')
      loadBookings()
    } catch (error) {
      console.error('Error joining class:', error)
      toast.error("Erreur lors de l'inscription")
    }
  }

  const handleLeaveClass = async (bookingId: string) => {
    if (!user) return

    try {
      const { data: booking } = await supabase
        .from('gym_bookings')
        .select('current_participants')
        .eq('id', bookingId)
        .single()

      const { error: deleteError } = await supabase
        .from('gym_booking_participants')
        .delete()
        .eq('booking_id', bookingId)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      // Update participant count
      const { error: updateError } = await supabase
        .from('gym_bookings')
        .update({
          current_participants: Math.max(
            0,
            (booking?.current_participants || 1) - 1,
          ),
        })
        .eq('id', bookingId)

      if (updateError) throw updateError

      toast.success('Réservation annulée')
      loadBookings()
    } catch (error) {
      console.error('Error leaving class:', error)
      toast.error("Erreur lors de l'annulation")
    }
  }

  const checkUserBooking = useCallback(
    async (bookingId: string): Promise<boolean> => {
      if (!user) return false

      const { data } = await supabase
        .from('gym_booking_participants')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('user_id', user.id)
        .single()

      return !!data
    },
    [user, supabase],
  )

  const [userBookings, setUserBookings] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user && bookings.length > 0) {
      const loadUserBookings = async () => {
        const bookingIds = await Promise.all(
          bookings.map(async (booking) => {
            const isBooked = await checkUserBooking(booking.id)
            return isBooked ? booking.id : null
          }),
        )
        setUserBookings(new Set(bookingIds.filter(Boolean) as string[]))
      }
      loadUserBookings()
    }
  }, [user, bookings, checkUserBooking])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Réservation de la Salle de Sport
          </h1>
          <p className="text-gray-600">
            Réservez votre place dans les cours collectifs organisés par nos
            coachs
          </p>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sélectionner une date</h2>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Available Classes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Cours disponibles le{' '}
              {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Aucun cours disponible pour cette date
                </p>
              </div>
            ) : (
              bookings.map((booking) => {
                const isBooked = userBookings.has(booking.id)
                const isFull =
                  booking.current_participants >= booking.max_participants

                return (
                  <div key={booking.id} className="px-6 py-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">
                            {booking.title}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-md ${booking.class_type === 'fitness'
                              ? 'bg-green-100 text-green-800'
                              : booking.class_type === 'yoga'
                                ? 'bg-purple-100 text-purple-800'
                                : booking.class_type === 'danse'
                                  ? 'bg-pink-100 text-pink-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                          >
                            {booking.class_type}
                          </span>
                        </div>

                        {booking.description && (
                          <p className="text-gray-600 mb-3">
                            {booking.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {booking.coach?.first_name}{' '}
                            {booking.coach?.last_name}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {format(
                              new Date(booking.start_time),
                              'HH:mm',
                            )} - {format(new Date(booking.end_time), 'HH:mm')}
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {booking.current_participants}/
                            {booking.max_participants}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {(booking.price_cents / 100).toFixed(2)} €
                          </div>
                        </div>

                        <div className="mt-3 flex items-center text-sm text-gray-500">
                          <MapPin className="w-4 h-4 mr-1" />
                          Salle de sport principale
                        </div>
                      </div>

                      <div className="ml-4">
                        {isBooked ? (
                          <button
                            onClick={() => handleLeaveClass(booking.id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                          >
                            Annuler
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinClass(booking.id)}
                            disabled={isFull}
                            className={`px-4 py-2 text-sm rounded-md transition-colors ${isFull
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                          >
                            {isFull ? 'Complet' : 'Réserver'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
