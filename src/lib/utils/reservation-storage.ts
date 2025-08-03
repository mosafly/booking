// Utility functions for managing reservation data in localStorage/cookies for anonymous users

export interface StoredReservation {
  id: string
  court: string
  date: string
  time: string
  total: number
  email: string
  status?: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

const STORAGE_KEY = 'myReservations'
const PENDING_RESERVATION_KEY = 'pendingReservation'

export const getStoredReservations = (): StoredReservation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading stored reservations:', error)
    return []
  }
}

export const addStoredReservation = (reservation: StoredReservation): void => {
  try {
    const existing = getStoredReservations()
    const updated = [reservation, ...existing]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error storing reservation:', error)
  }
}

export const updateStoredReservation = (
  id: string,
  updates: Partial<StoredReservation>,
): void => {
  try {
    const existing = getStoredReservations()
    const updated = existing.map((res) =>
      res.id === id ? { ...res, ...updates } : res,
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error updating stored reservation:', error)
  }
}

export const removeStoredReservation = (id: string): void => {
  try {
    const existing = getStoredReservations()
    const updated = existing.filter((res) => res.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error removing stored reservation:', error)
  }
}

export const getPendingReservation = (): StoredReservation | null => {
  try {
    const stored = localStorage.getItem(PENDING_RESERVATION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Error reading pending reservation:', error)
    return null
  }
}

export const setPendingReservation = (reservation: StoredReservation): void => {
  try {
    localStorage.setItem(PENDING_RESERVATION_KEY, JSON.stringify(reservation))
  } catch (error) {
    console.error('Error storing pending reservation:', error)
  }
}

export const clearPendingReservation = (): void => {
  try {
    localStorage.removeItem(PENDING_RESERVATION_KEY)
  } catch (error) {
    console.error('Error clearing pending reservation:', error)
  }
}

// Cookie utilities for cross-session persistence (optional enhancement)
export const setCookie = (
  name: string,
  value: string,
  days: number = 30,
): void => {
  try {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
  } catch (error) {
    console.error('Error setting cookie:', error)
  }
}

export const getCookie = (name: string): string | null => {
  try {
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  } catch (error) {
    console.error('Error reading cookie:', error)
    return null
  }
}

export const deleteCookie = (name: string): void => {
  try {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
  } catch (error) {
    console.error('Error deleting cookie:', error)
  }
}
