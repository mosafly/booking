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
        console.log('Fetching role for user:', user.id)

        // Debug: Check user authentication status
        const { data: debugData, error: debugError } =
          await supabase.rpc('debug_user_auth')

        if (!debugError && debugData && debugData.length > 0) {
          const debug = debugData[0]
          console.log('Debug auth status:', debug)

          if (!debug.user_exists_in_auth) {
            console.error(
              'User does not exist in auth.users table! This is the root problem.',
            )
            setUserRole('client')
            return
          }
        }

        // First try to get existing profile
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error && error.code === 'PGRST116') {
          // Profile doesn't exist, use our ensure_user_profile function
          console.log('Profile not found, creating it...')
          try {
            const { data: roleData, error: roleError } = await supabase.rpc(
              'ensure_user_profile',
              { user_id: user.id },
            )

            if (roleError) {
              console.error('Error creating profile:', roleError)
              setUserRole('client')
            } else {
              console.log('Profile created with role:', roleData)
              setUserRole(roleData as UserRole)
            }
          } catch (rpcError) {
            console.error('RPC call failed:', rpcError)
            setUserRole('client')
          }
        } else if (error) {
          console.warn('Error fetching user role:', error)
          setUserRole('client') // Default to client role on other errors
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
