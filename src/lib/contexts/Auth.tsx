import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from './Supabase'
import { Session, User } from '@supabase/supabase-js'

// Types
export type UserRole = 'super_admin' | 'admin' | 'client' | 'coach' | null

export type AuthContextType = {
  user: User | null
  session: Session | null
  userRole: UserRole
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { supabase } = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Met à jour le rôle utilisateur à chaque changement d'utilisateur
  useEffect(() => {
    if (!user) {
      setUserRole(null)
      return
    }
    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) {
          console.warn('Error fetching user role:', error)
          // If profile doesn't exist or can't be fetched, try to create it
          if (error.code === 'PGRST116' || error.code === 'PGRST301') {
            console.log('Attempting to create user profile...')
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{ id: user.id, role: 'client' }])

            if (!insertError) {
              setUserRole('client')
            } else {
              console.error('Failed to create profile:', insertError)
              setUserRole('client') // Default to client role
            }
          } else {
            setUserRole('client') // Default to client role on other errors
          }
        } else {
          setUserRole(data?.role ?? 'client')
        }
      } catch (error) {
        console.error('Exception while fetching role:', error)
        setUserRole('client') // Default to client role
      }
    }
    fetchRole()
  }, [user, supabase])

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    }
    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      },
    )
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    await supabase.auth.signInWithPassword({ email, password })
    setIsLoading(false)
  }

  const signUp = async (email: string, password: string) => {
    setIsLoading(true)
    await supabase.auth.signUp({ email, password })
    setIsLoading(false)
  }

  const signOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setIsLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, session, userRole, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
