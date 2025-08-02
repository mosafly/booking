import { Court } from "@/components/booking/court-card";

export type EquipmentType = 'padel_court' | 'gym_equipment';

export interface ReservationRules {
  minimumDurationMinutes: number;
  incrementMinutes: number;
  maxDurationMinutes: number;
}

/**
 * Determine equipment type based on court name and description
 */
export const getEquipmentType = (court: Court): EquipmentType => {
  const name = court.name.toLowerCase();
  const description = court.description?.toLowerCase() || '';
  
  // Check if it's gym equipment
  const gymKeywords = ['vélo', 'velo', 'tapis', 'elliptique', 'fitness', 'musculation'];
  const isGymEquipment = gymKeywords.some(keyword => 
    name.includes(keyword) || description.includes(keyword)
  );
  
  if (isGymEquipment) {
    return 'gym_equipment';
  }
  
  // Default to padel court for terrains and other equipment
  return 'padel_court';
};

/**
 * Get reservation rules based on equipment type
 */
export const getReservationRules = (equipmentType: EquipmentType): ReservationRules => {
  switch (equipmentType) {
    case 'padel_court':
      return {
        minimumDurationMinutes: 60,    // 1 hour minimum
        incrementMinutes: 30,          // 30-minute increments
        maxDurationMinutes: 240,       // 4 hours maximum
      };
    
    case 'gym_equipment':
      return {
        minimumDurationMinutes: 30,    // 30 minutes minimum
        incrementMinutes: 30,          // 30-minute increments
        maxDurationMinutes: 120,       // 2 hours maximum
      };
    
    default:
      return {
        minimumDurationMinutes: 60,
        incrementMinutes: 30,
        maxDurationMinutes: 240,
      };
  }
};

/**
 * Generate available time slots based on equipment type
 */
export const generateTimeSlots = (
  date: Date,
  equipmentType: EquipmentType,
  startHour: number = 8,
  endHour: number = 22
): { startTime: Date; endTime: Date; durationMinutes: number }[] => {
  const rules = getReservationRules(equipmentType);
  const slots: { startTime: Date; endTime: Date; durationMinutes: number }[] = [];
  
  // Generate slots every 30 minutes
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minutes = 0; minutes < 60; minutes += 30) {
      const startTime = new Date(date);
      startTime.setHours(hour, minutes, 0, 0);
      
      // Generate different duration options for this start time
      for (let duration = rules.minimumDurationMinutes; 
           duration <= rules.maxDurationMinutes; 
           duration += rules.incrementMinutes) {
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);
        
        // Make sure the end time doesn't exceed the closing hour
        if (endTime.getHours() <= endHour) {
          slots.push({
            startTime: new Date(startTime),
            endTime,
            durationMinutes: duration,
          });
        }
      }
    }
  }
  
  return slots;
};

/**
 * Calculate price based on duration and hourly rate
 */
export const calculatePrice = (
  pricePerHour: number,
  durationMinutes: number
): number => {
  const hours = durationMinutes / 60;
  return pricePerHour * hours;
};

/**
 * Format duration for display
 */
export const formatDuration = (durationMinutes: number): string => {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h${minutes}`;
  }
};
