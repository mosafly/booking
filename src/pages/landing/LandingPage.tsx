import React from 'react'
import {
  ChevronDown,
  MapPin,
  Clock,
  Users,
  Award,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Star,
  Calendar,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const handleGetStarted = () => {
    navigate('/home/reservation')
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Logo */}
              <img
                src="/icon.png"
                alt="Padel Palmeraie Logo"
                className="w-8 h-8 md:w-12 md:h-12 rounded-md object-cover"
                onError={(e) => {
                  // Fallback si le logo n'existe pas encore
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement!.innerHTML =
                    '<div class="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-lime-400 to-green-600 rounded-md flex items-center justify-center"><span class="text-white font-bold text-sm md:text-lg">P</span></div>'
                }}
              />
              <div>
                <div className="text-lg md:text-2xl font-bold text-gray-800">
                  Padel Palmeraie
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  Riviera Faya, Abidjan
                </div>
              </div>
            </div>
            <div className="hidden md:flex space-x-8">
              <button
                onClick={() => scrollToSection('hero')}
                className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
              >
                {t('landingPage.nav.home')}
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
              >
                {t('landingPage.nav.about')}
              </button>
              <button
                onClick={() => scrollToSection('courts')}
                className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
              >
                {t('landingPage.nav.courts')}
              </button>
              <button
                onClick={() => scrollToSection('services')}
                className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
              >
                {t('landingPage.nav.services')}
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
              >
                {t('landingPage.nav.contact')}
              </button>
            </div>
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-lime-500 to-green-600 text-white px-4 py-2 md:px-8 md:py-3 rounded-md hover:from-lime-600 hover:to-green-700 transition-all transform hover:scale-105 font-semibold shadow-lg text-sm md:text-base"
            >
              {t('landingPage.nav.reserve')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0">
          <img
            src="/hero.jpg"
            alt="Padel Palmeraie - Terrain de padel moderne"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback vers une image Unsplash si locale non disponible
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1544717440-6b0c1b0e8b5a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight">
            {t('landingPage.hero.welcome')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-green-400">
              {t('landingPage.hero.title')}
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 max-w-3xl mx-auto opacity-90 leading-relaxed px-2">
            {t('landingPage.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center px-4">
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto bg-gradient-to-r from-lime-500 to-green-600 text-white px-6 py-3 md:px-10 md:py-4 rounded-md text-base md:text-lg font-semibold hover:from-lime-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-xl"
            >
              {t('landingPage.hero.bookCourt')}
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="w-full sm:w-auto border-2 border-white text-white px-6 py-3 md:px-10 md:py-4 rounded-md text-base md:text-lg font-semibold hover:bg-white hover:text-gray-800 transition-all backdrop-blur-sm"
            >
              {t('landingPage.hero.discoverClub')}
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-white/80" />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t('landingPage.about.title')}{' '}
              <span className="text-lime-600">
                {t('landingPage.about.titleBrand')}
              </span>{' '}
              ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('landingPage.about.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center p-8 bg-gradient-to-br from-lime-50 to-green-50 rounded-md shadow-lg hover:shadow-xl transition-all">
              <div className="w-20 h-20 bg-gradient-to-br from-lime-500 to-green-600 rounded-md flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                {t('landingPage.about.features.premium.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landingPage.about.features.premium.description')}
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-md shadow-lg hover:shadow-xl transition-all">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-md flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                {t('landingPage.about.features.flexible.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landingPage.about.features.flexible.description')}
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-md shadow-lg hover:shadow-xl transition-all">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-md flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                {t('landingPage.about.features.community.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landingPage.about.features.community.description')}
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-lime-600 mb-2">4</div>
              <div className="text-gray-600 font-medium">
                {t('landingPage.about.stats.courts')}
              </div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-lime-600 mb-2">500+</div>
              <div className="text-gray-600 font-medium">
                {t('landingPage.about.stats.members')}
              </div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-lime-600 mb-2">24/7</div>
              <div className="text-gray-600 font-medium">
                {t('landingPage.about.stats.booking')}
              </div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-lime-600 mb-2">5★</div>
              <div className="text-gray-600 font-medium">
                {t('landingPage.about.stats.rating')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courts Section */}
      <section
        id="courts"
        className="py-20 bg-gradient-to-br from-gray-50 to-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t('landingPage.courts.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landingPage.courts.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-md shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-2"
              >
                <img
                  src={`/images/courts/court-${i}.jpg`}
                  alt={`Terrain ${i}`}
                  className="w-full h-40 md:h-48 object-cover"
                  onError={(e) => {
                    // Fallback vers une image Unsplash si locale non disponible
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                  }}
                />
                <div className="p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-800">
                    {t('landingPage.courts.courtTitle')} {i}
                  </h3>
                  <p className="text-gray-600 mb-3 md:mb-4 text-sm leading-relaxed">
                    {t('landingPage.courts.courtDescription')}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-lime-600 font-semibold">
                      <Star size={14} className="mr-1 fill-current" />
                      <span>{t('landingPage.courts.premium')}</span>
                    </div>
                    <div className="flex items-center text-green-600 font-medium">
                      <Calendar size={14} className="mr-1" />
                      <span className="hidden sm:inline">
                        {t('landingPage.courts.available')}
                      </span>
                      <span className="sm:hidden">
                        {t('landingPage.courts.available')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t('landingPage.services.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landingPage.services.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 bg-gradient-to-br from-lime-50 to-green-50 rounded-md shadow-lg">
              <div className="w-16 h-16 bg-lime-600 rounded-md flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t('landingPage.services.coaching.title')}
              </h3>
              <p className="text-gray-600">
                {t('landingPage.services.coaching.description')}
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-md shadow-lg">
              <div className="w-16 h-16 bg-blue-600 rounded-md flex items-center justify-center mb-6">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t('landingPage.services.tournaments.title')}
              </h3>
              <p className="text-gray-600">
                {t('landingPage.services.tournaments.description')}
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-md shadow-lg">
              <div className="w-16 h-16 bg-purple-600 rounded-md flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t('landingPage.services.equipment.title')}
              </h3>
              <p className="text-gray-600">
                {t('landingPage.services.equipment.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="py-20 bg-gradient-to-br from-lime-600 to-green-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t('landingPage.contact.title')}
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              {t('landingPage.contact.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-8">
                {t('landingPage.contact.info')}
              </h3>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-md flex items-center justify-center mr-4">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {t('landingPage.contact.location')}
                    </div>
                    <div className="opacity-90">
                      {t('landingPage.contact.locationSub')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-md flex items-center justify-center mr-4">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {t('landingPage.contact.phone')}
                    </div>
                    <div className="opacity-90">
                      {t('landingPage.contact.phoneSub')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-md flex items-center justify-center mr-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {t('landingPage.contact.email')}
                    </div>
                    <div className="opacity-90">
                      {t('landingPage.contact.emailSub')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-4">
                  {t('landingPage.contact.followUs')}
                </h4>
                <div className="flex space-x-4">
                  <a
                    href="#"
                    className="w-12 h-12 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                  <a
                    href="#"
                    className="w-12 h-12 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <Facebook className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-8">
                {t('landingPage.contact.hours')}
              </h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="font-medium">
                    {t('landingPage.contact.weekdays')}
                  </span>
                  <span>6h00 - 23h00</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="font-medium">
                    {t('landingPage.contact.saturday')}
                  </span>
                  <span>7h00 - 23h00</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-medium">
                    {t('landingPage.contact.sunday')}
                  </span>
                  <span>8h00 - 22h00</span>
                </div>
              </div>

              <button
                onClick={handleGetStarted}
                className="w-full bg-white text-lime-600 px-8 py-4 rounded-md font-semibold hover:bg-gray-100 transition-colors text-lg shadow-lg"
              >
                {t('landingPage.contact.bookFirst')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img
                src="/icon.png"
                alt="Padel Palmeraie Logo"
                className="w-10 h-10 rounded-md object-cover"
                onError={(e) => {
                  // Fallback si le logo n'existe pas encore
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement!.innerHTML =
                    '<div class="w-10 h-10 bg-gradient-to-br from-lime-400 to-green-600 rounded-md flex items-center justify-center"><span class="text-white font-bold">P</span></div><div class="text-xl font-bold">Padel Palmeraie</div>'
                }}
              />
              <div className="text-xl font-bold">
                {t('landingPage.hero.title')}
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              {t('landingPage.footer.description')}
            </p>
            <div className="flex justify-center mb-4">
              <button
                onClick={() => {
                  const currentLang = i18n.language
                  const newLang = currentLang === 'en' ? 'fr' : 'en'
                  i18n.changeLanguage(newLang)
                  localStorage.setItem('language', newLang)
                }}
                className="text-white hover:text-lime-300 transition-colors text-sm font-medium px-4 py-2 border border-white/20 rounded-md hover:border-lime-300"
              >
                {i18n.language === 'en' ? 'English' : 'Français'}
              </button>
            </div>
            <p className="text-gray-500">{t('landingPage.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
