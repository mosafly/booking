import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/dashboard/language-switcher'
import { useAuth } from '@/lib/contexts/Auth'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ChevronDown, Settings, Users, User } from 'lucide-react'

interface PublicLayoutProps {
  children: React.ReactNode
}

type ViewMode = 'admin' | 'coach' | 'client'

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { t } = useTranslation()
  const { userRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [currentView, setCurrentView] = useState<ViewMode>('client')
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false)
  const viewDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/admin')) setCurrentView('admin')
    else if (path.startsWith('/coach')) setCurrentView('coach')
    else setCurrentView('client')
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!viewDropdownOpen) return
      const container = viewDropdownRef.current
      if (container && !container.contains(e.target as Node)) {
        setViewDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [viewDropdownOpen])

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view)
    setViewDropdownOpen(false)
    switch (view) {
      case 'admin':
        navigate('/admin/dashboard')
        break
      case 'coach':
        navigate('/coach')
        break
      case 'client':
        navigate('/home')
        break
    }
  }

  const getViewIcon = (view: ViewMode) => {
    switch (view) {
      case 'admin':
        return <Settings size={16} />
      case 'coach':
        return <Users size={16} />
      case 'client':
        return <User size={16} />
    }
  }

  const getViewLabel = (view: ViewMode) => {
    switch (view) {
      case 'admin':
        return 'Administration'
      case 'coach':
        return 'Coach'
      case 'client':
        return 'Client'
    }
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
            {(userRole === 'admin' || userRole === 'super_admin') && (
              <div className="relative" ref={viewDropdownRef}>
                <button
                  onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getViewIcon(currentView)}
                  <span>Vue: {getViewLabel(currentView)}</span>
                  <ChevronDown
                    size={16}
                    className={`transform transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {viewDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-1">
                      <button
                        onClick={() => handleViewChange('admin')}
                        className={`w-full flex items-center space-x-2 px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                          currentView === 'admin' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <Settings size={16} />
                        <span>Administration</span>
                      </button>
                      <button
                        onClick={() => handleViewChange('coach')}
                        className={`w-full flex items-center space-x-2 px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                          currentView === 'coach' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <Users size={16} />
                        <span>Coach</span>
                      </button>
                      <button
                        onClick={() => handleViewChange('client')}
                        className={`w-full flex items-center space-x-2 px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                          currentView === 'client' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <User size={16} />
                        <span>Client</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Quick access tabs for booking navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex" aria-label="Quick tabs">
            <Link
              to="/home"
              className={`w-1/2 text-center py-3 border-b-2 text-sm font-medium ${location.pathname.startsWith('/home/reservation') || location.pathname === '/home'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent hover:text-[var(--primary)] hover:border-[var(--primary)]'
                }`}
              aria-current={location.pathname === '/home' || location.pathname.startsWith('/home/reservation') ? 'page' : undefined}
            >
              {t('courts')}
            </Link>
            <Link
              to="/home/my-reservations"
              className={`w-1/2 text-center py-3 border-b-2 text-sm font-medium ${location.pathname.startsWith('/home/my-reservations')
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent hover:text-[var(--primary)] hover:border-[var(--primary)]'
                }`}
              aria-current={location.pathname.startsWith('/home/my-reservations') ? 'page' : undefined}
            >
              {t('myReservations')}
            </Link>
          </nav>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
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

export default PublicLayout
