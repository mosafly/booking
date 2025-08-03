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
      console.log('🔍 Starting court fetch process...')
      console.log('Supabase client:', supabase ? 'Available' : 'Not available')
      setIsLoading(true)
      setError(null)

      // Check current session status
      const {
        data: { session },
      } = await supabase.auth.getSession()
      console.log(
        'Current session status:',
        session ? 'Authenticated' : 'Anonymous',
      )

      // Fetch courts using the new RPC function for reliable access
      console.log('🔄 Attempting RPC call: get_all_courts...')
      const { data, error } = await supabase.rpc('get_all_courts')

      if (error) {
        console.error('❌ Supabase RPC error fetching courts:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })

        // If RPC fails, try direct table access as fallback
        console.log('🔄 RPC failed, trying direct table access...')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('courts')
          .select('*')
          .order('name')

        if (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError)
          console.error('Fallback error details:', {
            message: fallbackError.message,
            details: fallbackError.details,
            hint: fallbackError.hint,
            code: fallbackError.code,
          })
          setError(t('homePage.errorLoadingGeneric'))
          toast.error(t('homePage.errorLoadingToast'))
        } else {
          console.log(
            '✅ Fallback successful, courts received:',
            fallbackData?.length || 0,
          )
          console.log('Fallback courts data:', fallbackData)
          setCourts(fallbackData || [])

          if (!fallbackData || fallbackData.length === 0) {
            console.warn('⚠️ No courts found in database')
            toast.error(t('homePage.noCourtsAvailable'))
          }
        }
      } else {
        console.log('✅ RPC successful, courts received:', data?.length || 0)
        console.log('RPC courts data:', data)
        setCourts(data || [])

        // If no courts found, show helpful message
        if (!data || data.length === 0) {
          console.warn(
            '⚠️ No courts found in database - might need to run seed.sql',
          )
          toast.error(t('homePage.noCourtsAvailable'))
        }
      }
    } catch (error) {
      console.error('💥 Exception while fetching courts:', error)
      console.error('Exception type:', typeof error)
      console.error('Exception details:', error)
      setError(t('homePage.errorLoadingRefresh'))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, t])

  const handleRefresh = () => {
    fetchCourts()
  }

  useEffect(() => {
    // Test database connectivity for anonymous users
    const testDatabaseConnectivity = async () => {
      console.log('🧪 Testing database connectivity...')

      try {
        // Test 1: Basic Supabase connection
        const {
          data: { session },
        } = await supabase.auth.getSession()
        console.log(
          '✅ Supabase auth connection:',
          session ? 'Authenticated' : 'Anonymous',
        )

        // Test 2: Try a simple query to test basic connectivity
        const { data: testData, error: testError } = await supabase
          .from('courts')
          .select('count(*)')
          .limit(1)

        if (testError) {
          console.error('❌ Basic connectivity test failed:', testError)
        } else {
          console.log('✅ Basic database connectivity test passed:', testData)
        }

        // Test 3: Check if RPC function exists
        try {
          const { data: rpcTest, error: rpcError } =
            await supabase.rpc('get_all_courts')
          if (rpcError) {
            console.error('❌ RPC function test failed:', rpcError)
          } else {
            console.log(
              '✅ RPC function exists and accessible, got courts:',
              rpcTest?.length || 0,
            )
          }
        } catch (rpcException) {
          console.error('❌ RPC function exception:', rpcException)
        }

        // Test 4: Test anonymous access function (if available)
        try {
          const { data: anonTest, error: anonError } = await supabase.rpc(
            'test_anonymous_access',
          )
          if (anonError) {
            console.error('❌ Anonymous access test failed:', anonError)
          } else {
            console.log('✅ Anonymous access test passed:', anonTest)
          }
        } catch {
          console.log(
            'ℹ️ Anonymous access test function not available (run migration 07)',
          )
        }
      } catch (exception) {
        console.error('💥 Database connectivity test exception:', exception)
      }
    }

    testDatabaseConnectivity()

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
      court.name.toLowerCase().includes('padel') ||
      court.name.toLowerCase().includes('terrain') ||
      court.description?.toLowerCase().includes('padel') ||
      court.description?.toLowerCase().includes('terrain') ||
      court.description?.toLowerCase().includes('court'),
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

  // Debug logging for court categorization
  console.log('Debug courts categorization:')
  console.log('Total courts:', courts.length)
  console.log('Filtered courts:', filteredCourts.length)
  console.log('Padel courts:', padelCourts.length)
  console.log('Gym equipment:', gymEquipment.length)
  if (courts.length > 0) {
    console.log('Sample court:', courts[0])
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => (window.location.href = '/')}
          className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium flex items-center mb-4"
        >
          ← {t('homePage.backToHome', 'Back to Home')}
        </button>
      </div>

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
          className="ml-4 p-2 rounded-sm hover:bg-gray-100 transition-colors"
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
          className="text-center py-12 bg-white rounded-sm shadow-sm p-6"
          data-component-name="HomePage"
        >
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            {t('homePage.refreshPageButton')}
          </button>
        </div>
      ) : filteredCourts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-sm shadow-sm">
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
                  {t('homePage.courtReservationTitle', 'Court Reservations')}
                </h2>
                <p className="text-gray-600">
                  {t(
                    'homePage.courtReservationDescription',
                    'Book our padel courts for your matches',
                  )}
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
                  {t('homePage.gymEquipmentTitle', 'Gym Equipment')}
                </h2>
                <p className="text-gray-600">
                  {t(
                    'homePage.gymEquipmentDescription',
                    'Fitness equipment available for reservation',
                  )}
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
              <div className="text-center py-12 bg-white rounded-sm shadow-sm">
                <p className="text-gray-500">
                  {t(
                    'homePage.noMatchingResults',
                    'No results match your search criteria',
                  )}
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export default HomePage
