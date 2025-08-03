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
import { hasRoleAccess } from './lib/utils/role-utils'
import ErrorBoundary from './components/booking/error-boundary'
import { Spinner } from './components/dashboard/spinner'

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

  // Check if user has required role access
  if (requiredRole && !hasRoleAccess(userRole, requiredRole)) {
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
