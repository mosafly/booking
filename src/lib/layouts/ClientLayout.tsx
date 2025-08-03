import React, { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Brackets as Racket, Calendar, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/contexts/Auth'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/dashboard/language-switcher'
import { Spinner } from '@/components/dashboard/spinner'

const ClientLayout: React.FC = () => {
  const { signOut, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    // Handle any auth-related errors that might occur
    if (!isLoading && !user) {
      console.log('No user in ClientLayout, redirecting to login')
      navigate('/login')
    }
  }, [isLoading, user, navigate])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error during sign out:', error)
      toast.error('Failed to sign out properly')
    }
  }

  // Show a mini loading indicator if auth state is still loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-2">{t('loadingAccount')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img
              src="/icon.png"
              alt="Padel Palmeraie Logo"
              className="h-8 w-auto"
            />
            <h1 className="ml-2 text-xl font-bold text-[var(--primary)]">
              {t('brand')}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700"
              aria-label={t('signOut')}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-12">
            <div className="flex space-x-8">
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1 border-b-2 text-sm font-medium ${
                    isActive
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <Racket size={16} className="mr-1" />
                {t('courts')}
              </NavLink>

              <NavLink
                to="/home/my-reservations"
                className={({ isActive }) =>
                  `flex items-center px-2 py-1 border-b-2 text-sm font-medium ${
                    isActive
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <Calendar size={16} className="mr-1" />
                {t('myReservations')}
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {t('footer.copyright')}
          </p>
          <LanguageSwitcher />
        </div>
      </footer>
    </div>
  )
}

export default ClientLayout
