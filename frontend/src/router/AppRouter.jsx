import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import WorkerLayout from '../layouts/WorkerLayout.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

const HomePage           = lazy(() => import('../pages/public/HomePage.jsx'))
const RulesPage          = lazy(() => import('../pages/public/RulesPage.jsx'))
const RentTransportPage  = lazy(() => import('../pages/public/RentTransportPage.jsx'))
const BecomeWorkerPage   = lazy(() => import('../pages/public/BecomeWorkerPage.jsx'))

const LoginPage          = lazy(() => import('../pages/auth/LoginPage.jsx'))
const ResetPasswordPage  = lazy(() => import('../pages/auth/ResetPasswordPage.jsx'))

const WorkerDashboardPage = lazy(() => import('../pages/worker/WorkerDashboardPage.jsx'))
const WorkerRulesPage     = lazy(() => import('../pages/worker/WorkerRulesPage.jsx'))

const AdminDashboardPage  = lazy(() => import('../pages/admin/AdminDashboardPage.jsx'))
const WorkersPage         = lazy(() => import('../pages/admin/WorkersPage.jsx'))
const WorkerDetailPage    = lazy(() => import('../pages/admin/WorkerDetailPage.jsx'))
const PaymentReceiptsPage = lazy(() => import('../pages/admin/PaymentReceiptsPage.jsx'))
const TransportsPage      = lazy(() => import('../pages/admin/TransportsPage.jsx'))
const ArchivePage         = lazy(() => import('../pages/admin/ArchivePage.jsx'))

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/rent-transport" element={<RentTransportPage />} />
          <Route path="/become-worker" element={<BecomeWorkerPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRole="worker" />}>
          <Route element={<WorkerLayout />}>
            <Route path="/worker/dashboard" element={<WorkerDashboardPage />} />
            <Route path="/worker/rules" element={<WorkerRulesPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRole="super_admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/workers" element={<WorkersPage />} />
            <Route path="/admin/workers/:id" element={<WorkerDetailPage />} />
            {import.meta.env.VITE_ENABLE_MAP === 'true' && (
              <Route path="/admin/map" element={<Navigate to="/admin/dashboard" replace />} />
            )}
            <Route path="/admin/transports" element={<TransportsPage />} />
            <Route path="/admin/payment-receipts" element={<PaymentReceiptsPage />} />
            <Route path="/admin/archive" element={<ArchivePage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
