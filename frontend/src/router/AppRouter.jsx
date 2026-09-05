import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import WorkerLayout from '../layouts/WorkerLayout.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

import HomePage from '../pages/public/HomePage.jsx'
import RulesPage from '../pages/public/RulesPage.jsx'
import RentTransportPage from '../pages/public/RentTransportPage.jsx'
import BecomeWorkerPage from '../pages/public/BecomeWorkerPage.jsx'

import LoginPage from '../pages/auth/LoginPage.jsx'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage.jsx'

import WorkerDashboardPage from '../pages/worker/WorkerDashboardPage.jsx'
import WorkerRulesPage from '../pages/worker/WorkerRulesPage.jsx'

import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx'
import WorkersPage from '../pages/admin/WorkersPage.jsx'
import WorkerDetailPage from '../pages/admin/WorkerDetailPage.jsx'
import MapPage from '../pages/admin/MapPage.jsx'
import PaymentReceiptsPage from '../pages/admin/PaymentReceiptsPage.jsx'
import TransportsPage from '../pages/admin/TransportsPage.jsx'
import ApplicationsPage from '../pages/admin/ApplicationsPage.jsx'

export default function AppRouter() {
  return (
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
            <Route path="/admin/map" element={<MapPage />} />
          )}
          <Route path="/admin/transports" element={<TransportsPage />} />
          <Route path="/admin/applications" element={<ApplicationsPage />} />
          <Route path="/admin/payment-receipts" element={<PaymentReceiptsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
