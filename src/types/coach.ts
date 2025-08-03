export type CoachType = 'fitness' | 'yoga' | 'danse' | 'padel'

export interface CoachProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  coach_type: CoachType
  bio?: string
  phone?: string
  avatar_url?: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface GymBooking {
  id: string
  coach_id: string
  title: string
  description?: string
  class_type: CoachType
  start_time: string
  end_time: string
  max_participants: number
  current_participants: number
  price_cents: number
  status: 'scheduled' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
  coach?: CoachProfile
}

export interface GymBookingParticipant {
  id: string
  booking_id: string
  user_id: string
  status: 'confirmed' | 'cancelled'
  created_at: string
}

export interface CreateCoachProfileData {
  first_name: string
  last_name: string
  coach_type: CoachType
  bio?: string
  phone?: string
  avatar_url?: string
}

export interface CreateGymBookingData {
  title: string
  description?: string
  class_type: CoachType
  start_time: string
  end_time: string
  max_participants?: number
  price_cents?: number
}

export interface CoachDashboardStats {
  total_classes: number
  upcoming_classes: number
  total_participants: number
  total_revenue: number
}
