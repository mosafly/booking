import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/dashboard/language-switcher'

interface PublicLayoutProps {
  children: React.ReactNode
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()

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
            <button
              onClick={() => navigate('/login')}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-[var(--primary)] transition-colors"
            >
              <LogIn size={16} className="mr-1" />
              {t('adminLogin', 'Admin Login')}
            </button>
          </div>
        </div>
      </header>

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
