import React from 'react'
import { format, isBefore, isSameDay } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { Court } from '@/components/booking/court-card'
import {
  getEquipmentType,
  generateTimeSlots,
  formatDuration,
  EquipmentType,
  TimeSlot,
} from '@/lib/utils/reservation-rules'

interface TimeSlotPickerProps {
  date: Date
  court: Court
  availableSlots: {
    startTime: Date
    endTime: Date
  }[]
  selectedStartTime: Date | null
  selectedEndTime: Date | null
  onSelectTimeSlot: (startTime: Date, endTime: Date) => void
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  date,
  court,
  availableSlots,
  selectedStartTime,
  selectedEndTime,
  onSelectTimeSlot,
}) => {
  const { t, i18n } = useTranslation()
  const currentLocale = i18n.language === 'fr' ? fr : enUS
  const equipmentType = getEquipmentType(court)
  const availableTimeSlots = generateTimeSlots(date, equipmentType)

  // Filter out past slots and unavailable slots
  const validSlots = availableTimeSlots.filter((slot: TimeSlot) => {
    const isPast =
      isSameDay(date, new Date()) && isBefore(slot.startTime, new Date())

    // Check if slot conflicts with existing reservations
    const hasConflict = !availableSlots.some(
      (availableSlot) =>
        isSameDay(availableSlot.startTime, slot.startTime) &&
        availableSlot.startTime.getTime() === slot.startTime.getTime(),
    )

    return !isPast && !hasConflict
  })

  // Group slots by start time and duration
  const slotsByStartTime = validSlots.reduce(
    (acc: Record<number, TimeSlot[]>, slot: TimeSlot) => {
      const startTimeKey = slot.startTime.getTime()
      if (!acc[startTimeKey]) {
        acc[startTimeKey] = []
      }
      acc[startTimeKey].push(slot)
      return acc
    },
    {} as Record<number, TimeSlot[]>,
  )

  const uniqueStartTimes = Object.keys(slotsByStartTime)
    .map((key) => parseInt(key))
    .sort((a, b) => a - b)
    .map((timestamp) => new Date(timestamp))

  const handleSlotSelection = (startTime: Date, endTime: Date) => {
    onSelectTimeSlot(startTime, endTime)
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-3">
        {t('timeSlotPicker.title')}
      </h3>

      {/* Equipment type info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-800">
          {equipmentType === EquipmentType.PADEL
            ? 'Terrain de padel - Durée minimum: 1h, par tranches de 30min'
            : 'Équipement de sport - Durée minimum: 30min, par tranches de 30min'}
        </p>
      </div>

      {/* Time slots organized by start time */}
      <div className="space-y-4">
        {uniqueStartTimes.map((startTime) => {
          const slotsForTime = slotsByStartTime[startTime.getTime()]

          return (
            <div key={startTime.getTime()} className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">
                {format(startTime, 'p', { locale: currentLocale })}
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {slotsForTime.map((slot: TimeSlot, index: number) => {
                  const isSelected =
                    selectedStartTime && selectedEndTime
                      ? selectedStartTime.getTime() ===
                          slot.startTime.getTime() &&
                        selectedEndTime.getTime() === slot.endTime.getTime()
                      : false

                  return (
                    <button
                      key={index}
                      onClick={() =>
                        handleSlotSelection(slot.startTime, slot.endTime)
                      }
                      className={`
                        px-3 py-2 rounded-md text-center text-sm transition-colors
                        ${
                          isSelected
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-[var(--primary)] hover:text-[var(--primary)]'
                        }
                      `}
                    >
                      <div>{formatDuration(slot.durationMinutes)}</div>
                      <div className="text-xs opacity-75">
                        {format(slot.endTime, 'p', { locale: currentLocale })}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {uniqueStartTimes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun créneau disponible pour cette date</p>
        </div>
      )}
    </div>
  )
}

export default TimeSlotPicker
