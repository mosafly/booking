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
import { createConversionClickHandler } from '@/lib/utils/conversion-tracking'
import { useSupabase } from '@/lib/contexts/Supabase'
import { useEffect, useMemo, useState } from 'react'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { supabase } = useSupabase()

  // CMS hero content (overrides translations if present)
  const [hero, setHero] = useState<{ title?: string; subtitle?: string; image?: string } | null>(null)

  // Courts from DB (use image_url from storage)
  const [courts, setCourts] = useState<Array<{ id: string; name: string; description: string | null; image_url: string | null }>>([])

  useEffect(() => {
    // Load CMS sections for landing page (hero only for now)
    const loadCMS = async () => {
      try {
        const { data: page, error: pageErr } = await supabase
          .from('cms_pages')
          .select('id')
          .eq('slug', 'landing')
          .eq('enabled', true)
          .maybeSingle()
        if (pageErr || !page) return
        const { data: sections } = await supabase
          .from('cms_sections')
          .select('key, type, locale, content')
          .eq('page_id', page.id)
          .eq('locale', i18n.language || 'fr')
          .order('sort_order', { ascending: true })
        const heroSec = (sections || []).find((s: any) => s.key === 'hero' || s.type === 'hero')
        if (heroSec?.content && typeof heroSec.content === 'object') {
          setHero({
            title: heroSec.content.title || undefined,
            subtitle: heroSec.content.subtitle || undefined,
            image: heroSec.content.image || undefined,
          })
        }
      } catch (e) {
        // silent fallback to static content
      }
    }

    // Load courts
    const loadCourts = async () => {
      try {
        const { data } = await supabase
          .from('courts')
          .select('id, name, description, image_url, status')
          .order('created_at', { ascending: true })
        setCourts((data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          image_url: c.image_url,
        })))
      } catch (e) {
        // keep fallback
      }
    }

    loadCMS()
    loadCourts()
  }, [supabase, i18n.language])

  const heroTitle = useMemo(() => hero?.title ?? t('landingPage.hero.title'), [hero, t])
  const heroSubtitle = useMemo(() => hero?.subtitle ?? t('landingPage.hero.subtitle'), [hero, t])

  const handleGetStarted = createConversionClickHandler(() => {
    navigate('/home/reservation')
  })

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
                onClick={() => scrollToSection('gym')}
                className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
              >
                {t('landingPage.nav.gym')}
              </button>
              <button
                onClick={() => scrollToSection('bar')}
                className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
              >
                {t('landingPage.nav.bar')}
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
            src={hero?.image || '/hero.png'}
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
              {heroTitle}
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 max-w-3xl mx-auto opacity-90 leading-relaxed px-2">
            {heroSubtitle}
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
              <div className="text-4xl font-bold text-lime-600 mb-2">2</div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
            {(courts.length > 0 ? courts : [1, 2]).map((c: any, idx: number) => (
              <div
                key={typeof c === 'number' ? `fallback-${c}` : c.id}
                className="bg-white rounded-md shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-2"
              >
                <img
                  src={typeof c === 'number' ? `/images/courts/court-${c}.jpg` : c.image_url || '/images/courts/court-1.jpg'}
                  alt={`Terrain ${typeof c === 'number' ? c : c.name || idx + 1}`}
                  className="w-full h-40 md:h-48 object-cover"
                  onError={(e) => {
                    // Fallback vers une image Unsplash si locale non disponible
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                  }}
                />
                <div className="p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-800">
                    {typeof c === 'number' ? (
                      <>
                        {t('landingPage.courts.courtTitle')} {c}
                      </>
                    ) : (
                      c.name || `${t('landingPage.courts.courtTitle')} ${idx + 1}`
                    )}
                  </h3>
                  <p className="text-gray-600 mb-3 md:mb-4 text-sm leading-relaxed">
                    {typeof c === 'number' ? t('landingPage.courts.courtDescription') : (c.description || t('landingPage.courts.courtDescription'))}
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

      {/* Gym Section */}
      <section id="gym" className="py-20 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t('landingPage.gym.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landingPage.gym.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src="/images/gym/salle-sport.jpg"
                alt="Salle de sport"
                className="w-full h-64 md:h-80 object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                }}
              />
            </div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-600 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">💪</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{t('landingPage.gym.equipment.title')}</h3>
                  <p className="text-gray-600">{t('landingPage.gym.equipment.description')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-600 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">🏋️</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{t('landingPage.gym.personal.title')}</h3>
                  <p className="text-gray-600">{t('landingPage.gym.personal.description')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-600 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">🕐</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{t('landingPage.gym.hours.title')}</h3>
                  <p className="text-gray-600">{t('landingPage.gym.hours.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bar & Relaxation Section */}
      <section id="bar" className="py-20 bg-gradient-to-br from-amber-50 to-yellow-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t('landingPage.bar.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landingPage.bar.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-16 h-16 bg-amber-600 rounded-md flex items-center justify-center mb-4">
                <span className="text-white text-2xl">🍹</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landingPage.bar.bar.title')}</h3>
              <p className="text-gray-600">{t('landingPage.bar.bar.description')}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-16 h-16 bg-green-600 rounded-md flex items-center justify-center mb-4">
                <span className="text-white text-2xl">⚽</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landingPage.bar.foosball.title')}</h3>
              <p className="text-gray-600">{t('landingPage.bar.foosball.description')}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-16 h-16 bg-blue-600 rounded-md flex items-center justify-center mb-4">
                <span className="text-white text-2xl">🏓</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landingPage.bar.pingpong.title')}</h3>
              <p className="text-gray-600">{t('landingPage.bar.pingpong.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section id="find-us" className="py-20 bg-gradient-to-br from-green-50 to-lime-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-lime-700">Nous trouver</h2>
            <p className="text-lg text-gray-700 mb-8">Cliquez sur la carte pour ouvrir l'itinéraire Google Maps vers Riviera Faya, Abidjan.</p>
          </div>
          <div className="rounded-lg overflow-hidden shadow-xl border-2 border-lime-200">
            <a href="https://maps.google.com/?geocode=FRjuUQAdXHPD_w%3D%3D;FXbsUQAdsfnD_ymZMkL8ZO3BDzHh9e6gh7tL0Q%3D%3D&daddr=Riviera%20Faya,%20Abidjan&saddr=5.3693685,-3.9681648&dirflg=d&ftid=0xfc1ed64fc423299:0xd14bbb87a0eef5e1&lucs=,94224825,94227247,94227248,94231188,47071704,47069508,94218641,94282134,94203019,47084304&g_st=ic" target="_blank" rel="noopener noreferrer">
              <iframe
                title="Carte Padel Palmeraie"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.528215956954!2d-3.9681648!3d5.3693685!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfc1ed64fc423299%3A0xd14bbb87a0eef5e1!2sRiviera%20Faya%2C%20Abidjan!5e0!3m2!1sfr!2sci!4v1691244778000!5m2!1sfr!2sci"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </a>
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
                    <div className="font-semibold flex items-center space-x-2">
                      <span>{t('landingPage.contact.location')}</span>
                      <a href="https://maps.google.com/?geocode=FRjuUQAdXHPD_w%3D%3D;FXbsUQAdsfnD_ymZMkL8ZO3BDzHh9e6gh7tL0Q%3D%3D&daddr=Riviera%20Faya,%20Abidjan&saddr=5.3693685,-3.9681648&dirflg=d&ftid=0xfc1ed64fc423299:0xd14bbb87a0eef5e1&lucs=,94224825,94227247,94227248,94231188,47071704,47069508,94218641,94282134,94203019,47084304&g_st=ic" target="_blank" rel="noopener noreferrer" className="ml-2 text-lime-200 underline hover:text-lime-400 transition-colors text-sm">Voir sur Google Maps</a>
                    </div>
                    <div className="opacity-90">
                      {t('landingPage.contact.locationSub')}
                    </div>
                  </div>
                </div>
                {/* WhatsApp */}
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-md flex items-center justify-center mr-4">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <a href="https://wa.me/2250585663073" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-lime-300 transition-colors block">
                      +225 05 85 66 30 73
                    </a>
                    <div className="opacity-90">
                      Réservations & Informations
                    </div>
                  </div>
                </div>
                {/* Email */}
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-md flex items-center justify-center mr-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <a href="mailto:contact@padelpalmeraie.com" className="font-semibold hover:text-lime-300 transition-colors block">
                      contact@padelpalmeraie.com
                    </a>
                    <div className="opacity-90">
                      Email principal
                    </div>
                  </div>
                </div>
                {/* Instagram */}
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-md flex items-center justify-center mr-4">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <div>
                    <a href="https://instagram.com/padel_palmeraie" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-lime-300 transition-colors block">
                      @padel_palmeraie
                    </a>
                    <div className="opacity-90">
                      Instagram
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

            {/* Contact Row */}
            <div className="flex flex-wrap justify-center items-center gap-6 mb-4 text-base">
              {/* Email */}
              <a href="mailto:contact@padelpalmeraie.com" className="flex items-center space-x-2 hover:text-lime-300 transition-colors">
                <svg width="20" height="20" fill="currentColor" className="inline-block"><path d="M2.5 4.5A2.5 2.5 0 0 1 5 2h10a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 15 16H5a2.5 2.5 0 0 1-2.5-2.5v-11Zm1.75.5 6.25 5.25L17.75 5v-.5a.75.75 0 0 0-.75-.75H5a.75.75 0 0 0-.75.75V5Zm13 1.06-5.93 4.98a1.25 1.25 0 0 1-1.64 0L3.5 6.56V13.5c0 .414.336.75.75.75h10a.75.75 0 0 0 .75-.75V6.56Z"/></svg>
                <span>contact@padelpalmeraie.com</span>
              </a>
              {/* Instagram */}
              <a href="https://instagram.com/padel_palmeraie" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 hover:text-lime-300 transition-colors">
                <svg width="20" height="20" fill="currentColor" className="inline-block"><path d="M7.5 2h5A5.5 5.5 0 0 1 18 7.5v5A5.5 5.5 0 0 1 12.5 18h-5A5.5 5.5 0 0 1 2 12.5v-5A5.5 5.5 0 0 1 7.5 2Zm0 1.5A4 4 0 0 0 3.5 7.5v5A4 4 0 0 0 7.5 16.5h5a4 4 0 0 0 4-4v-5a4 4 0 0 0-4-4h-5ZM10 6.5A3.5 3.5 0 1 1 6.5 10 3.5 3.5 0 0 1 10 6.5Zm0 1.5A2 2 0 1 0 12 10a2 2 0 0 0-2-2Zm4.25-.75a.75.75 0 1 1-.75.75.75.75 0 0 1 .75-.75Z"/></svg>
                <span>@padel_palmeraie</span>
              </a>
              {/* WhatsApp */}
              <a href="https://wa.me/2250585663073" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 hover:text-lime-300 transition-colors">
                <svg width="20" height="20" fill="currentColor" className="inline-block"><path d="M16.7 3.3A9.4 9.4 0 0 0 10 1.2 9.4 9.4 0 0 0 3.3 3.3 9.4 9.4 0 0 0 1.2 10c0 1.7.5 3.3 1.4 4.7L1 19l4.3-1.1A9.4 9.4 0 0 0 10 18.8c1.7 0 3.3-.5 4.7-1.4A9.4 9.4 0 0 0 18.8 10c0-2.5-1-4.8-2.8-6.7ZM10 17c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.6.7.7-2.5-.2-.3A7.5 7.5 0 1 1 17 10a7.5 7.5 0 0 1-7 7Zm4.2-5.4c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.6.1-.2.2-.7.7-.9.9-.2.2-.3.2-.5.1-.7-.3-1.3-.7-1.8-1.3-.5-.5-.9-1.1-1.2-1.7-.1-.2 0-.3.1-.5.1-.1.2-.3.3-.5.1-.1.1-.2.2-.4.1-.2 0-.4 0-.6 0-.2-.7-1.7-.9-2.3-.2-.6-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2 0 1.3.9 2.6 1 2.7.2.3 1.8 2.8 4.4 3.7.6.2 1 .3 1.4.2.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.2-1 0-.1-.2-.1-.4-.2Z"/></svg>
                <span>+225 05 85 66 30 73</span>
              </a>
            </div>

            <p className="text-gray-500">{t('landingPage.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
