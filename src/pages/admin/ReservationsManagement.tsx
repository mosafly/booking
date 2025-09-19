import React, { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/contexts/Supabase'
import ReservationList from '@/components/booking/reservation-list'
import { Calendar, Filter } from 'lucide-react'
import { addDays, format, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { Spinner } from '@/components/dashboard/spinner'

interface AdminReservation {
  id: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  court_id: string
  court_name: string
  user_id: string
  user_email?: string
  total_price: number
  created_at: string
}

const ReservationsManagement: React.FC = () => {
  const { supabase } = useSupabase()

  const [reservations, setReservations] = useState<AdminReservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoading(true)
        // 1. Fetch reservations with joined court name (limite les requêtes)
        const { data: resData, error: resError } = await supabase
          .from('reservations')
          .select(`
            *,
            courts(name)
          `)
          .gte('start_time', `${dateRange.start}T00:00:00`)
          .lte('start_time', `${dateRange.end}T23:59:59`)
          .order('start_time', { ascending: false })
        if (resError) throw resError

        // 2. Fetch related users emails (only for reservations that have a user_id)
        const userIds = Array.from(
          new Set((resData || []).map((r: any) => r.user_id).filter(Boolean)),
        )
        let profilesData: Array<{ id: string; email: string }> | undefined
        if (userIds.length > 0) {
          const { data } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', userIds as string[])
          profilesData = data || []
        } else {
          profilesData = []
        }

        // 3. Transform to AdminReservation + appliquer filtre statut côté client si nécessaire
        const transformed = (resData || []).map((r: any) => {
          const emailFromProfile = profilesData?.find((p) => p.id === r.user_id)?.email || ''
          return {
            id: r.id,
            start_time: r.start_time,
            end_time: r.end_time,
            status: r.status,
            court_id: r.court_id,
            court_name: r.courts?.name || '',
            user_id: r.user_id,
            // Préférer l'email stocké sur la réservation si présent (cas invité), sinon profil
            user_email: r.user_email || emailFromProfile,
            total_price: r.total_price,
            created_at: r.created_at,
          } as AdminReservation
        })

        const filtered =
          filterStatus === 'all'
            ? transformed
            : transformed.filter((r) => r.status === filterStatus)

        setReservations(filtered)
      } catch (err) {
        console.error('Error fetching reservations:', err)
        toast.error('Failed to load reservations')
        setReservations([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchReservations()
  }, [dateRange, filterStatus, supabase])

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setDateRange((prev) => ({ ...prev, [name]: value }))
  }

  const handleCancelReservation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) throw error

      setReservations((prev) =>
        prev.map((res) =>
          res.id === id ? { ...res, status: 'cancelled' } : res,
        ),
      )

      toast.success('Reservation cancelled successfully')
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      toast.error('Failed to cancel reservation')
    }
  }

  const handleConfirmReservation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', id)

      if (error) throw error

      setReservations((prev) =>
        prev.map((res) =>
          res.id === id ? { ...res, status: 'confirmed' } : res,
        ),
      )

      toast.success('Reservation confirmed successfully')
    } catch (error) {
      console.error('Error confirming reservation:', error)
      toast.error('Failed to confirm reservation')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Reservations Management
        </h1>
        <p className="text-gray-600">View and manage all court reservations</p>
      </div>

      <div className="bg-white rounded-md shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <Filter size={16} className="inline mr-1" />
              Filter by Status
            </label>
            <select
              id="status"
              value={filterStatus}
              onChange={handleStatusChange}
              className="form-input"
            >
              <option value="all">All Reservations</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="start"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <Calendar size={16} className="inline mr-1" />
              From Date
            </label>
            <input
              type="date"
              id="start"
              name="start"
              value={dateRange.start}
              onChange={handleDateChange}
              className="form-input"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="end"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <Calendar size={16} className="inline mr-1" />
              To Date
            </label>
            <input
              type="date"
              id="end"
              name="end"
              value={dateRange.end}
              onChange={handleDateChange}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Reservation List</h2>
          <ReservationList
            reservations={reservations}
            onCancel={handleCancelReservation}
            onConfirm={handleConfirmReservation}
            isAdmin={true}
          />
        </div>
      )}
    </div>
  )
}

export default ReservationsManagement
