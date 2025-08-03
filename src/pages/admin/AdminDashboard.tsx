import React, { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../../lib/contexts/Supabase'
import { GlobalSchedule } from '../../components/schedule/GlobalSchedule'
import { Users, Calendar, DollarSign } from 'lucide-react'

export const AdminDashboard: React.FC = () => {
  const { supabase } = useSupabase()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReservations: 0,
    totalRevenue: 0,
    totalCoaches: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)

      const [usersRes, reservationsRes, coachesRes, revenueRes] =
        await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('reservations').select('id', { count: 'exact' }),
          supabase.from('coach_profiles').select('id', { count: 'exact' }),
          supabase
            .from('reservations')
            .select('total_price')
            .eq('status', 'confirmed'),
        ])

      const totalRevenue =
        revenueRes.data?.reduce(
          (sum, res) => sum + (res.total_price || 0),
          0,
        ) || 0

      setStats({
        totalUsers: usersRes.count || 0,
        totalReservations: reservationsRes.count || 0,
        totalRevenue,
        totalCoaches: coachesRes.count || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadStats()
  }, [loadStats])

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
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de Bord Admin
          </h1>
          <p className="mt-2 text-gray-600">
            Gérez votre complexe sportif en un seul endroit
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Utilisateurs
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Réservations
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalReservations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Coaches</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalCoaches}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Revenus Total
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalRevenue.toLocaleString()} FCFA
                </p>
              </div>
            </div>
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
