import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
]

interface LanguageSwitcherProps {
  onLanguageChange?: (language: string) => void
}

export const LanguageSwitcher = memo(function LanguageSwitcher({
  onLanguageChange,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const location = useLocation()
  const currentLangName = languages.find((l) => l.code === i18n.language)?.name
  const isPortalRoute = location.pathname.startsWith('/portal')

  // Sync with localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage && i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage)
    }
  }, [i18n])

  const toggleLanguage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isPortalRoute) return
      const currentIndex = languages.findIndex((l) => l.code === i18n.language)
      const nextIndex = (currentIndex + 1) % languages.length
      const nextLang = languages[nextIndex]?.code || 'en'
      const nextLangName = languages[nextIndex]?.name || 'English'
      i18n.changeLanguage(nextLang)
      localStorage.setItem('language', nextLang)
      if (onLanguageChange) {
        onLanguageChange(nextLangName)
      }
    },
    [i18n, isPortalRoute, onLanguageChange],
  )

  if (isPortalRoute) return null

  return (
    <button
      onMouseDown={toggleLanguage}
      type="button"
      className="relative overflow-visible text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors pl-10 mt-1 sm:pr-0"
      aria-label="Switch language"
    >
      <div className="relative w-[100px] h-[16px] overflow-visible">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i18n.language}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap truncate translate-y-1.5"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 20, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{
              duration: 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {currentLangName}
          </motion.span>
        </AnimatePresence>
      </div>
    </button>
  )
})
