import React, { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/contexts/Supabase'
import { format } from 'date-fns'
import { GlobalSchedule } from '../../components/schedule/GlobalSchedule'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Brackets as Racket,
  CalendarCheck,
  DollarSign,
  Users,
  Package,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Court } from '@/components/booking/court-card'
import { Spinner } from '@/components/dashboard/spinner'

interface DashboardStat {
  icon: React.ReactNode
  label: string
  value: string | number
  bgColor: string
}

interface Reservation {
  id: string
  court_id: string
  start_time: string
  end_time: string
  status: string
}

const Dashboard: React.FC = () => {
  const { supabase } = useSupabase()

  const [todayReservations, setTodayReservations] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [activeCourts, setActiveCourts] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [revenueData, setRevenueData] = useState<
    { date: string; revenue: number }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [reservationsData, setReservationsData] = useState<Reservation[]>([])
  const [courtsData, setCourtsData] = useState<Court[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date()
        const formattedToday = format(today, 'yyyy-MM-dd')

        const { data: reservationsDataRaw, error: reservationsError } =
          await supabase
            .from('reservations')
            .select('*')
            .gte('start_time', `${formattedToday}T00:00:00`)
            .lt('start_time', `${formattedToday}T23:59:59`)

        if (reservationsError) throw reservationsError
        setReservationsData(reservationsDataRaw || [])
        setTodayReservations(reservationsDataRaw?.length || 0)

        const { data: courtsDataRaw, error: courtsError } = await supabase
          .from('courts')
          .select('*')
          .eq('status', 'available')

        if (courtsError) throw courtsError
        setActiveCourts(courtsDataRaw?.length || 0)
        setCourtsData(courtsDataRaw || [])

        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('count', { count: 'exact' })

        if (usersError) throw usersError
        setTotalUsers(usersData[0]?.count || 0)

        const startOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        ).toISOString()
        const endOfMonth = today.toISOString()

        const { data: revenueDataRaw, error: revenueError } = await supabase
          .from('reservations')
          .select('total_price')
          .gte('start_time', startOfMonth)
          .lte('start_time', endOfMonth)
          .eq('status', 'confirmed')

        if (revenueError) throw revenueError

        const totalRevenue =
          revenueDataRaw?.reduce(
            (acc, curr) => acc + (curr.total_price || 0),
            0,
          ) || 0
        setMonthlyRevenue(totalRevenue)

        const revenuePerDay: { date: string; revenue: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const day = new Date()
          day.setDate(day.getDate() - i)
          const start = new Date(day.setHours(0, 0, 0, 0)).toISOString()
          const end = new Date(day.setHours(23, 59, 59, 999)).toISOString()

          const { data: dayData, error: dayError } = await supabase
            .from('reservations')
            .select('total_price')
            .gte('start_time', start)
            .lte('start_time', end)
            .eq('status', 'confirmed')

          if (dayError) {
            revenuePerDay.push({
              date: format(new Date(start), 'MMM dd'),
              revenue: 0,
            })
          } else {
            const total =
              dayData?.reduce(
                (acc, curr) => acc + (curr.total_price || 0),
                0,
              ) || 0
            revenuePerDay.push({
              date: format(new Date(start), 'MMM dd'),
              revenue: total,
            })
          }
        }
        setRevenueData(revenuePerDay)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [supabase])

  const stats: DashboardStat[] = [
    {
      icon: <CalendarCheck size={24} />,
      label: "Today's Reservations",
      value: todayReservations,
      bgColor: 'bg-blue-50',
    },
    {
      icon: <Racket size={24} />,
      label: 'Active Courts',
      value: activeCourts,
      bgColor: 'bg-green-50',
    },
    {
      icon: <Users size={24} />,
      label: 'Registered Users',
      value: totalUsers,
      bgColor: 'bg-purple-50',
    },
    {
      icon: <DollarSign size={24} />,
      label: 'Revenue This Month',
      value: `$${monthlyRevenue.toFixed(2)}`,
      bgColor: 'bg-orange-50',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-600">
          Overview of reservations and business metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-md shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center mb-2">
              <div className="text-[var(--primary)]">{stat.icon}</div>
              <h3 className="ml-2 text-sm font-medium text-gray-700">
                {stat.label}
              </h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4">Actions Rapides</h3>
          <div className="space-y-3">
            <a
              href="/admin/products"
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Package className="h-4 w-4 mr-2" />
              Gestion Produits
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Revenue Trend (Last 7 Days)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revenueData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis
                tickFormatter={(value) => `${value} FCFA`}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <Tooltip
                formatter={(value) => [`$${value}`, 'Revenue']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e5e7eb',
                  padding: '0.5rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                fill="var(--primary-light)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-md shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            {reservationsData && reservationsData.length > 0 ? (
              reservationsData.slice(0, 5).map((reservation: Reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-3 border-b border-gray-100"
                >
                  <div>
                    <p className="font-medium">Court {reservation.court_id}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(reservation.start_time), 'h:mm a')} -{' '}
                      {format(new Date(reservation.end_time), 'h:mm a')}
                    </p>
                  </div>
                  <span className="badge badge-success">Confirmed</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No reservations for today
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Court Status</h2>
          <div className="space-y-3">
            {courtsData && courtsData.length > 0 ? (
              courtsData.map((court: Court) => (
                <div
                  key={court.id}
                  className="flex items-center justify-between p-3 border-b border-gray-100"
                >
                  <p className="font-medium">{court.name}</p>
                  <span
                    className={`badge ${
                      court.status === 'available'
                        ? 'badge-success'
                        : court.status === 'maintenance'
                          ? 'badge-danger'
                          : 'badge-accent'
                    }`}
                  >
                    {court.status.charAt(0).toUpperCase() +
                      court.status.slice(1)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Aucun court</p>
            )}
          </div>
        </div>

        {/* Planning Global Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Planning Global
          </h2>
          <GlobalSchedule viewMode="admin" />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
