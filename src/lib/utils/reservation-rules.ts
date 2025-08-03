/**
 * Reservation rules and pricing calculation utilities
 */

/**
 * Equipment types for courts
 */
export enum EquipmentType {
  PADEL = 'padel',
  TENNIS = 'tennis',
  BASKETBALL = 'basketball',
  FOOTBALL = 'football',
}

/**
 * Get equipment type based on court name or description
 * @param courtNameOrCourt Court name or court object
 * @param description Court description
 * @returns Equipment type
 */
export const getEquipmentType = (
  courtNameOrCourt: string | { name: string; description?: string },
  description?: string
): EquipmentType => {
  let text: string;
  
  if (typeof courtNameOrCourt === 'string') {
    text = `${courtNameOrCourt} ${description || ''}`.toLowerCase();
  } else {
    text = `${courtNameOrCourt.name} ${courtNameOrCourt.description || ''}`.toLowerCase();
  }
  
  if (text.includes('padel')) return EquipmentType.PADEL;
  if (text.includes('tennis')) return EquipmentType.TENNIS;
  if (text.includes('basketball') || text.includes('basket')) return EquipmentType.BASKETBALL;
  if (text.includes('football') || text.includes('foot')) return EquipmentType.FOOTBALL;
  
  // Default to padel
  return EquipmentType.PADEL;
};

/**
 * Calculate price based on hourly rate and duration
 * @param pricePerHour Hourly rate
 * @param durationMinutes Duration in minutes
 * @returns Total price
 */
export const calculatePrice = (
  pricePerHour: number,
  durationMinutes: number
): number => {
  const hours = durationMinutes / 60;
  return Math.round(pricePerHour * hours);
};

/**
 * Calculate price with potential discounts for longer durations
 * @param pricePerHour Hourly rate
 * @param durationMinutes Duration in minutes
 * @param applyDiscounts Whether to apply duration-based discounts
 * @returns Total price
 */
export const calculatePriceWithDiscounts = (
  pricePerHour: number,
  durationMinutes: number,
  applyDiscounts: boolean = false
): number => {
  const basePrice = calculatePrice(pricePerHour, durationMinutes);
  
  if (!applyDiscounts) return basePrice;
  
  const hours = durationMinutes / 60;
  
  // Apply discounts for longer durations
  if (hours >= 3) {
    return Math.round(basePrice * 0.9); // 10% discount for 3+ hours
  } else if (hours >= 2) {
    return Math.round(basePrice * 0.95); // 5% discount for 2+ hours
  }
  
  return basePrice;
};

/**
 * Get available time slots for a given date
 * @param date Target date
 * @returns Array of available time slots
 */
export const getAvailableTimeSlots = (): string[] => {
  const slots: string[] = [];
  
  // Generate slots from 8:00 to 22:00
  for (let hour = 8; hour <= 22; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  
  return slots;
};

/**
 * Check if a time slot is valid (within business hours)
 * @param hour Hour of the day
 * @param minute Minute of the hour
 * @returns Whether the time slot is valid
 */
export const isValidTimeSlot = (hour: number, minute: number): boolean => {
  // Business hours: 8:00 - 22:00
  if (hour < 8 || hour > 22) return false;
  
  // Only allow 00 and 30 minute slots
  if (minute !== 0 && minute !== 30) return false;
  
  // Last slot is at 21:30
  if (hour === 22 && minute === 30) return false;
  
  return true;
};

/**
 * Get minimum and maximum booking duration in minutes
 */
export const BOOKING_CONSTRAINTS = {
  MIN_DURATION_MINUTES: 60,
  MAX_DURATION_MINUTES: 240,
  SLOT_INTERVAL_MINUTES: 30,
} as const;

/**
 * Time slot interface
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

/**
 * Generate time slots for a given date and equipment type
 * @param date Target date
 * @param equipmentType Equipment type
 * @returns Array of time slots
 */
export const generateTimeSlots = (date: Date, equipmentType: EquipmentType): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const baseDate = new Date(date);
  
  // Determine min duration based on equipment type
  const minDuration = equipmentType === EquipmentType.PADEL ? 60 : 30;
  const maxDuration = 240; // 4 hours max
  
  // Generate slots from 8:00 to 22:00
  for (let hour = 8; hour < 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startTime = new Date(baseDate);
      startTime.setHours(hour, minute, 0, 0);
      
      // Generate different duration options for this start time
      for (let duration = minDuration; duration <= maxDuration; duration += 30) {
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);
        
        // Don't exceed 22:00
        if (endTime.getHours() > 22) break;
        
        slots.push({
          startTime,
          endTime,
          durationMinutes: duration,
        });
      }
    }
  }
  
  return slots;
};

/**
 * Format duration in minutes to human readable format
 * @param durationMinutes Duration in minutes
 * @returns Formatted duration string
 */
export const formatDuration = (durationMinutes: number): string => {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }
};