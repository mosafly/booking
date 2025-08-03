import React, { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/lib/contexts/Supabase'
import CourtCard, { Court } from '@/components/booking/court-card'
import { Search, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Spinner } from '@/components/dashboard/spinner'
import { useTranslation } from 'react-i18next'

const HomePage: React.FC = () => {
  const { supabase } = useSupabase()
  const { t } = useTranslation()
  const [courts, setCourts] = useState<Court[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchCourts = useCallback(async () => {
    try {
      console.log('Fetching courts using RPC...')
      setIsLoading(true)
      setError(null)

      // Fetch courts using the new RPC function for reliable access
      const { data, error } = await supabase.rpc('get_all_courts')

      if (error) {
        console.error('Supabase RPC error fetching courts:', error)

        // If RPC fails, try direct table access as fallback
        console.log('RPC failed, trying direct table access...')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('courts')
          .select('*')
          .order('name')

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
          setError(t('homePage.errorLoadingGeneric'))
          toast.error(t('homePage.errorLoadingToast'))
        } else {
          console.log('Fallback successful, courts received:', fallbackData?.length || 0)
          setCourts(fallbackData || [])

          if (!fallbackData || fallbackData.length === 0) {
            console.warn('No courts found in database')
            toast.error(t('homePage.noCourtsAvailable'))
          }
        }
      } else {
        console.log('RPC successful, courts received:', data?.length || 0)
        setCourts(data || [])

        // If no courts found, show helpful message
        if (!data || data.length === 0) {
          console.warn('No courts found in database')
          toast.error(t('homePage.noCourtsAvailable'))
        }
      }
    } catch (error) {
      console.error('Exception while fetching courts:', error)
      setError(t('homePage.errorLoadingRefresh'))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, t])

  const handleRefresh = () => {
    fetchCourts()
  }

  useEffect(() => {
    // Log session information for debugging
    const logSessionInfo = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      console.log('Current session:', session?.user ? 'User logged in' : 'No user')
    }

    logSessionInfo()

    // Charger les courts immédiatement
    fetchCourts()
  }, [fetchCourts, supabase])

  const filteredCourts = courts.filter(
    (court) =>
      court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (court.description?.toLowerCase() || '').includes(
        searchQuery.toLowerCase(),
      ),
  )

  // Categorize courts
  const padelCourts = filteredCourts.filter(
    (court) =>
      court.name.toLowerCase().includes('terrain') ||
      court.description?.toLowerCase().includes('padel') ||
      court.description?.toLowerCase().includes('terrain'),
  )

  const gymEquipment = filteredCourts.filter(
    (court) =>
      court.name.toLowerCase().includes('vélo') ||
      court.name.toLowerCase().includes('velo') ||
      court.name.toLowerCase().includes('tapis') ||
      court.name.toLowerCase().includes('elliptique') ||
      court.description?.toLowerCase().includes('vélo') ||
      court.description?.toLowerCase().includes('velo') ||
      court.description?.toLowerCase().includes('tapis') ||
      court.description?.toLowerCase().includes('elliptique'),
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('homePage.title')}
        </h1>
        <p className="text-gray-600">{t('homePage.subtitle')}</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t('homePage.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pl-10 w-full"
          />
        </div>

        <button
          onClick={handleRefresh}
          className="ml-4 p-2 rounded-md hover:bg-gray-100 transition-colors"
          title={t('homePage.refreshButtonTitle')}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-5 w-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Spinner />
          </div>
        </div>
      ) : error ? (
        <div
          className="text-center py-12 bg-white rounded-md shadow-sm p-6"
          data-component-name="HomePage"
        >
          <p className="text-red-500 mb-4">{error}</p>
          {error &&
            (error.includes('auth') ||
              error.includes('credentials') ||
              error.includes('session') ||
              error.includes(t('homePage.errorLoadingGeneric'))) ? (
            <div>
              <p className="text-gray-600 mb-4">
                {t('homePage.errorAuthMessage')}
              </p>
              <button
                onClick={() => (window.location.href = '/login')}
                className="btn btn-primary mr-3"
              >
                {t('homePage.loginButton')}
              </button>
              <button onClick={handleRefresh} className="btn btn-outline mt-2">
                {t('homePage.retryButton')}
              </button>
            </div>
          ) : (
            <button onClick={handleRefresh} className="btn btn-primary">
              {t('homePage.refreshPageButton')}
            </button>
          )}
        </div>
      ) : filteredCourts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-md shadow-sm">
          <p className="text-gray-500">
            {searchQuery
              ? t('homePage.noCourtsFoundSearch')
              : t('homePage.noCourtsAvailable')}
          </p>
          {!searchQuery && courts.length === 0 && (
            <button onClick={handleRefresh} className="btn btn-primary mt-4">
              {t('homePage.refreshCourtsButton')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Section Terrain réservation */}
          {padelCourts.length > 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Terrain réservation
                </h2>
                <p className="text-gray-600">
                  Réservez nos terrains de padel pour vos matchs
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {padelCourts.map((court) => (
                  <CourtCard key={court.id} court={court} />
                ))}
              </div>
            </div>
          )}

          {/* Section Salle de sport */}
          {gymEquipment.length > 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Salle de sport
                </h2>
                <p className="text-gray-600">
                  Équipements de fitness disponibles à la réservation
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gymEquipment.map((court) => (
                  <CourtCard key={court.id} court={court} />
                ))}
              </div>
            </div>
          )}

          {/* Message si aucune section n'a de contenu après filtrage */}
          {padelCourts.length === 0 &&
            gymEquipment.length === 0 &&
            filteredCourts.length > 0 && (
              <div className="text-center py-12 bg-white rounded-md shadow-sm">
                <p className="text-gray-500">
                  Aucun résultat ne correspond aux critères de recherche
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export default HomePage
