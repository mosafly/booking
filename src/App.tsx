import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import { SupabaseProvider } from './lib/contexts/Supabase'
import { AuthProvider, useAuth, UserRole } from './lib/contexts/Auth'
import ErrorBoundary from './components/booking/error-boundary'
import { Spinner } from './components/dashboard/spinner'
import { MarketingPixels } from './lib/analytics/MarketingPixels'

// Layouts
import AdminLayout from './lib/layouts/AdminLayout'
import PublicLayout from './lib/layouts/PublicLayout'

// Client Pages
import HomePage from './pages/client/HomePage'
import ReservationPage from './pages/client/ReservationPage'
import MyReservationsPage from './pages/client/MyReservationsPage'
import PaymentSuccessPage from './pages/client/PaymentSuccessPage'
import PaymentCancelPage from './pages/client/PaymentCancelPage'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import CourtsManagement from './pages/admin/CourtsManagement'
import ReservationsManagement from './pages/admin/ReservationsManagement'
import FinancialTracking from './pages/admin/FinancialTracking'
import ProductsManagement from './pages/admin/ProductsManagement'
import { PricingManagement } from './components/admin/PricingManagement'
import { VerificationPage } from './pages/admin/VerificationPage'
import UnavailabilityManagement from './pages/admin/UnavailabilityManagement'

// Coach Pages
import { CoachDashboard } from './pages/coach/CoachDashboard'

// Gym Booking Page
import { GymBookingPage } from './pages/gym/GymBookingPage'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import LandingPage from './pages/landing/LandingPage'

// Protected Route Component
const ProtectedRoute = ({
  children,
  requiredRole = null,
}: {
  children: React.ReactNode
  requiredRole?: UserRole
}) => {
  const { user, userRole, isLoading } = useAuth()

  // Local role hierarchy: maps a required role to roles that are allowed
  const roleSatisfies = (
    role: UserRole | null | undefined,
    required: UserRole | null | undefined,
  ): boolean => {
    if (!required) return true // no specific role required
    if (!role) return false
    type RoleNonNull = Exclude<UserRole, null>
    const allowedByRequirement: Record<RoleNonNull, RoleNonNull[]> = {
      // Any authenticated role can access client routes
      client: ['client', 'coach', 'admin', 'super_admin'],
      // Coach routes are accessible by coach and above (admin, super_admin)
      coach: ['coach', 'admin', 'super_admin'],
      // Admin routes are accessible by admin and super_admin
      admin: ['admin', 'super_admin'],
      // Super admin routes (if ever used) are only for super_admin
      super_admin: ['super_admin'],
    }
    const r = required as RoleNonNull
    const current = role as RoleNonNull
    return allowedByRequirement[r].includes(current)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner />
        </div>
      </div>
    )
  }

  // Check role access using local hierarchy
  if (requiredRole && !roleSatisfies(userRole, requiredRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <AuthProvider>
          <Router>
            <Toaster position="top-center" />
            <Analytics />
            <MarketingPixels />
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Public Client Routes */}
              <Route
                path="/home"
                element={
                  <PublicLayout>
                    <HomePage />
                  </PublicLayout>
                }
              />
              <Route
                path="/home/reservation/:courtId?"
                element={
                  <PublicLayout>
                    <ReservationPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/home/my-reservations"
                element={
                  <PublicLayout>
                    <MyReservationsPage />
                  </PublicLayout>
                }
              />

              {/* Public Gym Booking Route */}
              <Route
                path="/gym"
                element={
                  <PublicLayout>
                    <GymBookingPage />
                  </PublicLayout>
                }
              />

              {/* Public Payment Routes */}
              <Route
                path="/payment/success"
                element={
                  <PublicLayout>
                    <PaymentSuccessPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/payment/cancel"
                element={
                  <PublicLayout>
                    <PaymentCancelPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/home/payment/success"
                element={
                  <PublicLayout>
                    <PaymentSuccessPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/home/payment/cancel"
                element={
                  <PublicLayout>
                    <PaymentCancelPage />
                  </PublicLayout>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route
                  index
                  element={<Navigate to="/admin/dashboard" replace />}
                />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="courts" element={<CourtsManagement />} />
                <Route
                  path="reservations"
                  element={<ReservationsManagement />}
                />
                <Route path="financial" element={<FinancialTracking />} />
                <Route path="products" element={<ProductsManagement />} />
                <Route path="pricing" element={<PricingManagement />} />
                <Route
                  path="unavailability"
                  element={<UnavailabilityManagement />}
                />
                <Route
                  path="verify/:verificationId"
                  element={<VerificationPage />}
                />
              </Route>

              {/* Coach Routes */}
              <Route
                path="/coach"
                element={
                  <ProtectedRoute requiredRole="coach">
                    <CoachDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </SupabaseProvider>
    </ErrorBoundary>
  )
}

export default App
