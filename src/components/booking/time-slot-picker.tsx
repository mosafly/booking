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
    <div className="mt-3 md:mt-4">
      <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">
        {t('timeSlotPicker.title')}
      </h3>

      {/* Equipment type info */}
      <div className="mb-3 md:mb-4 p-2 md:p-3 bg-blue-50 rounded-md">
        <p className="text-xs md:text-sm text-blue-800">
          {equipmentType === EquipmentType.PADEL
            ? t('timeSlotPicker.padelCourtInfo')
            : t('timeSlotPicker.gymEquipmentInfo')}
        </p>
      </div>

      {/* Time slots organized by start time */}
      <div className="space-y-3 md:space-y-4">
        {uniqueStartTimes.map((startTime) => {
          const slotsForTime = slotsByStartTime[startTime.getTime()]

          return (
            <div
              key={startTime.getTime()}
              className="border rounded-lg p-3 md:p-4"
            >
              <h4 className="font-medium mb-2 md:mb-3 text-sm md:text-base">
                {format(startTime, 'p', { locale: currentLocale })}
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                        px-2 py-2 md:px-3 md:py-2 rounded-md text-center text-xs md:text-sm transition-colors min-h-[3rem]
                        ${isSelected
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-[var(--primary)] hover:text-[var(--primary)] active:bg-gray-50'
                        }
                      `}
                    >
                      <div className="font-medium">
                        {formatDuration(slot.durationMinutes)}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
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
        <div className="text-center py-6 md:py-8 text-gray-500">
          <p className="text-sm md:text-base">
            {t('timeSlotPicker.noSlotsAvailable')}
          </p>
        </div>
      )}
    </div>
  )
}

export default TimeSlotPicker
