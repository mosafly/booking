import React, { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../../lib/contexts/Supabase'
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'

interface ScheduleItem {
  id: string
  title: string
  start_time: string
  end_time: string
  type: 'court' | 'gym'
  court_name?: string
  coach_name?: string
  participants?: number
  max_participants?: number
  price?: number
  status: 'scheduled' | 'completed' | 'cancelled'
  class_type?: string
}

interface CourtReservation {
  id: string
  start_time: string
  end_time: string
  status: string
  courts: Array<{ name: string }> | null
  profiles: Array<{ first_name: string; last_name: string }> | null
}

interface GymBooking {
  id: string
  title: string
  start_time: string
  end_time: string
  status: string
  max_participants: number
  price_cents: number
  class_type: string
  coach_profiles: Array<{ first_name: string; last_name: string }> | null
}

interface GlobalScheduleProps {
  viewMode?: 'admin' | 'coach'
  coachId?: string
}

export const GlobalSchedule: React.FC<GlobalScheduleProps> = ({
  viewMode = 'admin',
  coachId,
}) => {
  const { supabase } = useSupabase()
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [selectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'day' | 'week'>('week')

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true)

      // Charger les réservations de terrains
      const courtQuery = supabase
        .from('reservations')
        .select(
          `
          id,
          start_time,
          end_time,
          status,
courts:court_id(name),
          profiles:user_id(first_name, last_name)
        `,
        )
        .gte(
          'start_time',
          startOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString(),
        )
        .lte(
          'end_time',
          endOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString(),
        )

      // Charger les cours de gym
      const gymQuery = supabase
        .from('gym_bookings')
        .select(
          `
          id,
          title,
          start_time,
          end_time,
          class_type,
          max_participants,
          price_cents,
          status,
          coach_profiles:coach_id(first_name, last_name)
        `,
        )
        .gte(
          'start_time',
          startOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString(),
        )
        .lte(
          'end_time',
          endOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString(),
        )

      if (coachId && viewMode === 'coach') {
        gymQuery.eq('coach_id', coachId)
      }

      const [courtRes, gymRes] = await Promise.all([courtQuery, gymQuery])

      if (courtRes.error) throw courtRes.error
      if (gymRes.error) throw gymRes.error

      const courtBookings: ScheduleItem[] = (
        (courtRes.data as CourtReservation[]) || []
      ).map((item) => ({
        id: item.id,
        title: `Réservation ${item.courts?.[0]?.name || 'Terrain'}`,
        start_time: item.start_time,
        end_time: item.end_time,
        type: 'court' as const,
        court_name: item.courts?.[0]?.name,
        coach_name:
          `${item.profiles?.[0]?.first_name || ''} ${item.profiles?.[0]?.last_name || ''}`.trim(),
        status: item.status as 'scheduled' | 'completed' | 'cancelled',
      }))

      const gymBookings: ScheduleItem[] = (
        (gymRes.data as GymBooking[]) || []
      ).map((item) => ({
        id: item.id,
        title: item.title,
        start_time: item.start_time,
        end_time: item.end_time,
        type: 'gym' as const,
        coach_name:
          `${item.coach_profiles?.[0]?.first_name || ''} ${item.coach_profiles?.[0]?.last_name || ''}`.trim(),
        max_participants: item.max_participants,
        price: item.price_cents,
        status: item.status as 'scheduled' | 'completed' | 'cancelled',
        class_type: item.class_type,
      }))

      setSchedule([...courtBookings, ...gymBookings])
    } catch (error) {
      console.error('Error loading schedule:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedDate, coachId, viewMode])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }

  const getTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }

  const getScheduleForSlot = (date: Date, time: string) => {
    const [hour] = time.split(':').map(Number)
    const slotStart = new Date(date)
    slotStart.setHours(hour, 0, 0, 0)
    const slotEnd = new Date(slotStart)
    slotEnd.setHours(hour + 1, 0, 0, 0)

    return schedule.filter((item) => {
      const itemStart = parseISO(item.start_time)
      const itemEnd = parseISO(item.end_time)
      return (
        isSameDay(itemStart, date) &&
        ((itemStart >= slotStart && itemStart < slotEnd) ||
          (itemEnd > slotStart && itemEnd <= slotEnd) ||
          (itemStart <= slotStart && itemEnd >= slotEnd))
      )
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'court':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'gym':
        return 'bg-green-100 border-green-300 text-green-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'border-l-4 border-blue-500'
      case 'completed':
        return 'border-l-4 border-green-500'
      case 'cancelled':
        return 'border-l-4 border-red-500'
      default:
        return 'border-l-4 border-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-md h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Planning Global {viewMode === 'admin' ? 'Admin' : 'Coach'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType(viewType === 'day' ? 'week' : 'day')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {viewType === 'day' ? 'Vue Semaine' : 'Vue Jour'}
          </button>
        </div>
      </div>

      {viewType === 'week' ? (
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div className="grid grid-cols-8 gap-px bg-gray-200">
              <div className="bg-gray-50 p-2 font-semibold text-sm">Heure</div>
              {getWeekDays().map((day) => (
                <div
                  key={day.toISOString()}
                  className="bg-gray-50 p-2 text-center"
                >
                  <div className="font-semibold text-sm">
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className="text-xs">
                    {format(day, 'd MMM', { locale: fr })}
                  </div>
                </div>
              ))}
            </div>

            {getTimeSlots().map((time) => (
              <div key={time} className="grid grid-cols-8 gap-px bg-gray-200">
                <div className="bg-white p-2 text-sm font-medium">{time}</div>
                {getWeekDays().map((day) => {
                  const items = getScheduleForSlot(day, time)
                  return (
                    <div
                      key={`${day}-${time}`}
                      className="bg-white p-1 min-h-20"
                    >
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`text-xs p-1 mb-1 rounded border ${getTypeColor(item.type)} ${getStatusColor(item.status)}`}
                        >
                          <div className="font-semibold truncate">
                            {item.title}
                          </div>
                          {item.coach_name && (
                            <div className="text-xs opacity-75">
                              {item.coach_name}
                            </div>
                          )}
                          {item.type === 'gym' && item.max_participants && (
                            <div className="text-xs opacity-75">
                              {item.max_participants} max
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {getWeekDays().map((day) => {
            const dayItems = schedule.filter((item) =>
              isSameDay(parseISO(item.start_time), day),
            )

            return (
              <div key={day.toISOString()} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">
                  {format(day, 'EEEE d MMMM', { locale: fr })}
                </h3>
                {dayItems.length === 0 ? (
                  <p className="text-gray-500">Aucune réservation</p>
                ) : (
                  <div className="space-y-2">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${getTypeColor(item.type)} ${getStatusColor(item.status)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{item.title}</h4>
                            <p className="text-sm text-gray-600">
                              {format(parseISO(item.start_time), 'HH:mm', {
                                locale: fr,
                              })}{' '}
                              -
                              {format(parseISO(item.end_time), 'HH:mm', {
                                locale: fr,
                              })}
                            </p>
                            {item.court_name && (
                              <p className="text-sm text-gray-600">
                                {item.court_name}
                              </p>
                            )}
                            {item.coach_name && (
                              <p className="text-sm text-gray-600">
                                Coach: {item.coach_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {item.type === 'gym' && item.price && (
                              <p className="font-semibold">
                                {item.price / 100} FCFA
                              </p>
                            )}
                            {item.type === 'gym' && item.max_participants && (
                              <p className="text-sm">
                                Max: {item.max_participants}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
