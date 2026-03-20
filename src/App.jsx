import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import ProtectedRoute from './routes/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'

// Layouts
import PublicLayout from './components/layout/PublicLayout'
import AdminLayout from './components/admin/AdminLayout'

// Public pages
import HomePage from './pages/public/HomePage'
import CataloguePage from './pages/public/CataloguePage'
import ProductPage from './pages/public/ProductPage'
import CartPage from './pages/public/CartPage'
import CheckoutPage from './pages/public/CheckoutPage'
import { OrderConfirmPage } from './pages/public/OrderConfirmPage'
import TrackOrderPage from './pages/public/TrackOrderPage'
import LoginPage from './pages/public/LoginPage'
import RegisterPage from './pages/public/RegisterPage'

// Customer pages
import CustomerDashboardPage from './pages/customer/DashboardPage'
import CustomerOrderDetailPage from './pages/customer/OrderDetailPage'
import CustomerProfilePage from './pages/customer/ProfilePage'

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import OrderListPage from './pages/admin/orders/OrderListPage'
import AdminOrderDetailPage from './pages/admin/orders/OrderDetailPage'
import ProductListPage from './pages/admin/products/ProductListPage'
import ProductFormPage from './pages/admin/products/ProductFormPage'
import StockPage from './pages/admin/stock/StockPage'
import CustomerListPage from './pages/admin/customers/CustomerListPage'
import AdminCustomerProfilePage from './pages/admin/customers/CustomerProfilePage'
import ReportsPage from './pages/admin/reports/ReportsPage'
import SettingsPage from './pages/admin/settings/SettingsPage'
import ActivityLogPage from './pages/admin/logs/ActivityLogPage'
import UserManagementPage from './pages/admin/users/UserManagementPage'

const ADMIN_ROLES = ['staff', 'supervisor', 'admin', 'superadmin']

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1E293B',
                color: '#F8FAFC',
                fontFamily: "'Outfit', system-ui, sans-serif",
                fontSize: '14px',
                borderRadius: '10px',
                padding: '12px 16px'
              },
              success: { iconTheme: { primary: '#C8912A', secondary: '#F8FAFC' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#F8FAFC' } }
            }}
          />
          <ScrollToTop />

          <Routes>
            {/* ── PUBLIC WITH LAYOUT ────────────────────────────────── */}
            <Route element={<PublicLayout />}>
              <Route path="/"                element={<HomePage />} />
              <Route path="/shop"            element={<CataloguePage />} />
              <Route path="/shop/:id"        element={<ProductPage />} />
              <Route path="/cart"            element={<CartPage />} />
              <Route path="/checkout"        element={<CheckoutPage />} />
              <Route path="/order-confirmed" element={<OrderConfirmPage />} />
              <Route path="/track"           element={<TrackOrderPage />} />

              <Route path="/dashboard" element={
                <ProtectedRoute requireRole={['customer']}>
                  <CustomerDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/orders/:id" element={
                <ProtectedRoute requireRole={['customer']}>
                  <CustomerOrderDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute requireRole={['customer']}>
                  <CustomerProfilePage />
                </ProtectedRoute>
              } />
            </Route>

            {/* ── AUTH PAGES ────────────────────────────────────────── */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── ADMIN WITH ADMIN LAYOUT ───────────────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute requireRole={ADMIN_ROLES}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />

              <Route path="orders"     element={<OrderListPage />} />
              <Route path="orders/:id" element={<AdminOrderDetailPage />} />

              <Route path="products/new" element={
                <ProtectedRoute requireRole={['admin', 'superadmin']}>
                  <ProductFormPage />
                </ProtectedRoute>
              } />
              <Route path="products/:id/edit" element={
                <ProtectedRoute requireRole={['admin', 'superadmin']}>
                  <ProductFormPage />
                </ProtectedRoute>
              } />
              <Route path="products" element={
                <ProtectedRoute requireRole={['admin', 'superadmin']}>
                  <ProductListPage />
                </ProtectedRoute>
              } />

              <Route path="stock" element={<StockPage />} />

              <Route path="customers" element={
                <ProtectedRoute requireRole={['supervisor', 'admin', 'superadmin']}>
                  <CustomerListPage />
                </ProtectedRoute>
              } />
              <Route path="customers/:id" element={
                <ProtectedRoute requireRole={['supervisor', 'admin', 'superadmin']}>
                  <AdminCustomerProfilePage />
                </ProtectedRoute>
              } />

              <Route path="reports" element={
                <ProtectedRoute requireRole={['supervisor', 'admin', 'superadmin']}>
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute requireRole={['admin', 'superadmin']}>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="logs" element={
                <ProtectedRoute requireRole={['superadmin']}>
                  <ActivityLogPage />
                </ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute requireRole={['superadmin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* ── FALLBACK ──────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}