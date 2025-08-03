'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/contexts/Auth'

interface ReservationData {
  reservation_id: string
  court_name: string
  start_time: string
  end_time: string
  total_price: number
  user_email: string
  user_name: string
  verification_used_at?: string
  verified_by?: string
  status: string
}

const PIN_CACHE_KEY = 'staff_verification_pin'
const PIN_CACHE_DURATION = 8 * 60 * 60 * 1000 // 8 hours

const storage = {
  set: (key: string, value: unknown): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.warn('localStorage not available, PIN will not be cached.')
    }
  },
  get: (key: string): unknown => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch {
      console.warn('localStorage not available, PIN will not be cached.')
    }
  },
}

export function VerificationPage() {
  const { verificationId } = useParams<{ verificationId: string }>()
  const { user } = useAuth()
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [reservationData, setReservationData] =
    useState<ReservationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPinVerified, setIsPinVerified] = useState(false)

  const callVerificationApi = useCallback(
    async (action: string, body: object) => {
      const { data, error } = await supabase.functions.invoke(
        'verify-booking',
        {
          body: { action, ...body },
        },
      )

      if (error) {
        throw new Error(error.message)
      }
      return data
    },
    [],
  )

  // Check for cached PIN on component mount
  useEffect(() => {
    const checkCachedPin = () => {
      const cached = storage.get(PIN_CACHE_KEY) as { timestamp: number } | null
      if (cached && Date.now() - cached.timestamp < PIN_CACHE_DURATION) {
        setIsPinVerified(true)
      } else {
        storage.remove(PIN_CACHE_KEY)
      }
    }
    checkCachedPin()
  }, [])

  const fetchReservationDetails = useCallback(
    async (id: string) => {
      setIsLoading(true)
      setError(null)
      setReservationData(null)
      try {
        const data = await callVerificationApi('get_reservation', {
          verificationId: id,
        })
        if (!data || data.length === 0) {
          setError('Booking not found or invalid ID.')
        } else {
          setReservationData(data[0])
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch booking details.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [callVerificationApi],
  )

  // Auto-verify ticket when page loads with ID and user is verified
  useEffect(() => {
    if (verificationId && isPinVerified && !reservationData) {
      fetchReservationDetails(verificationId)
    }
  }, [verificationId, isPinVerified, reservationData, fetchReservationDetails])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const isValidPin = await callVerificationApi('verify_pin', { pin })

      if (isValidPin) {
        storage.set(PIN_CACHE_KEY, { timestamp: Date.now() })
        setIsPinVerified(true)
        setError(null)
        setPin('')
      } else {
        setError('Invalid PIN.')
        setPin('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN verification failed.')
      setPin('')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsUsed = useCallback(async () => {
    if (!verificationId) return

    setIsLoading(true)
    try {
      const result = await callVerificationApi('mark_used', { verificationId })

      if (result[0]?.success) {
        setError(null)
      } else {
        setError(result[0]?.message || 'Failed to mark as used.')
      }
      await fetchReservationDetails(verificationId)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to mark booking as used.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [verificationId, callVerificationApi, fetchReservationDetails])

  const getStatus = () => {
    if (error)
      return {
        bgColor: 'bg-red-50/50 dark:bg-red-900/10',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-800 dark:text-red-200',
        icon: <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />,
        badgeText: 'Invalid',
        statusText: 'Verification Failed',
      }
    if (reservationData?.verification_used_at)
      return {
        bgColor: 'bg-orange-50/50 dark:bg-orange-900/10',
        borderColor: 'border-orange-200 dark:border-orange-800',
        textColor: 'text-orange-800 dark:text-orange-200',
        icon: (
          <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        ),
        badgeText: 'Already Used',
        statusText: 'Already Checked In',
      }
    if (reservationData)
      return {
        bgColor: 'bg-green-50/50 dark:bg-green-900/10',
        borderColor: 'border-green-200 dark:border-green-800',
        textColor: 'text-green-800 dark:text-green-200',
        icon: (
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        ),
        badgeText: 'Valid',
        statusText: 'Ready for Check-in',
      }
    return null
  }

  if (!user) {
    return <div>You must be logged in to access this page.</div>
  }

  // If no ticket ID in URL, show manual entry
  if (!verificationId) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Manual Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please scan a QR code to begin verification.</p>
            <Button asChild className="mt-4">
              <Link to="/admin/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show PIN entry if not verified yet
  if (!isPinVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Staff Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Enter your PIN to verify this booking.</p>
            <form onSubmit={handlePinSubmit} className="space-y-4 mt-4">
              <Input
                type="password"
                placeholder="Staff PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                disabled={isLoading}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={pin.length !== 4 || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Verify PIN'
                )}
              </Button>
            </form>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = getStatus()

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {isLoading && !reservationData && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading booking details...</p>
            </CardContent>
          </Card>
        )}

        {status && (
          <Card className={`border-2 ${status.borderColor} ${status.bgColor}`}>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-4">
                {status.icon}
                <h2 className={`text-xl font-bold ${status.textColor}`}>
                  {status.statusText}
                </h2>
                {reservationData && (
                  <div>
                    <p className="text-2xl font-bold">
                      {reservationData.user_name}
                    </p>
                    <p>{reservationData.court_name}</p>
                  </div>
                )}
                {error && <p className="text-red-500">{error}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {reservationData && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Court:</strong> {reservationData.court_name}
              </p>
              <p>
                <strong>Time:</strong>{' '}
                {new Date(reservationData.start_time).toLocaleString()}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                {reservationData.verification_used_at
                  ? `Used at ${new Date(reservationData.verification_used_at).toLocaleString()}`
                  : 'Not used'}
              </p>
              <p>
                <strong>Email:</strong> {reservationData.user_email}
              </p>
              {!reservationData.verification_used_at && (
                <Button
                  onClick={markAsUsed}
                  disabled={isLoading}
                  className="w-full mt-4"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Mark as Used'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
