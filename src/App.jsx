import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import OnboardingLayer from "./components/onboarding/OnboardingLayer";
import Spinner from "./components/ui/Spinner";

// Layouts
import PublicLayout from "./components/layout/PublicLayout";
import AdminLayout from "./components/admin/AdminLayout";

// Public pages
const HomePage = lazy(() => import("./pages/public/HomePage"));
const CataloguePage = lazy(() => import("./pages/public/CataloguePage"));
const ProductPage = lazy(() => import("./pages/public/ProductPage"));
const CartPage = lazy(() => import("./pages/public/CartPage"));
const CheckoutPage = lazy(() => import("./pages/public/CheckoutPage"));
const OrderConfirmPage = lazy(() => import("./pages/public/OrderConfirmPage").then(m => ({ default: m.OrderConfirmPage })));
const TrackOrderPage = lazy(() => import("./pages/public/TrackOrderPage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));

// Customer pages
const CustomerDashboardPage = lazy(() => import("./pages/customer/DashboardPage"));
const CustomerOrderDetailPage = lazy(() => import("./pages/customer/OrderDetailPage"));
const CustomerProfilePage = lazy(() => import("./pages/customer/ProfilePage"));

// Driver portal
const DriverLayout        = lazy(() => import("./components/driver/DriverLayout"));
const DriverDashboardPage = lazy(() => import("./pages/driver/DriverDashboardPage"));
const DriverOrdersPage    = lazy(() => import("./pages/driver/DriverOrdersPage"));
const DriversPage         = lazy(() => import("./pages/admin/drivers/DriversPage"));

// Admin pages
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const OrderListPage = lazy(() => import("./pages/admin/orders/OrderListPage"));
const AdminOrderDetailPage = lazy(() => import("./pages/admin/orders/OrderDetailPage"));
const ProductListPage = lazy(() => import("./pages/admin/products/ProductListPage"));
const ProductFormPage = lazy(() => import("./pages/admin/products/ProductFormPage"));
const StockPage = lazy(() => import("./pages/admin/stock/StockPage"));
const StockIntakePage = lazy(() => import("./pages/admin/stock/StockIntakePage"));
const CustomerListPage = lazy(() => import("./pages/admin/customers/CustomerListPage"));
const AdminCustomerProfilePage = lazy(() => import("./pages/admin/customers/CustomerProfilePage"));
const ReportsPage = lazy(() => import("./pages/admin/reports/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/admin/settings/SettingsPage"));
const ActivityLogPage = lazy(() => import("./pages/admin/logs/ActivityLogPage"));
const UserManagementPage = lazy(() => import("./pages/admin/users/UserManagementPage"));
const BranchManagementPage = lazy(() => import("./pages/admin/branches/BranchManagementPage"));
const BackupManagementPage = lazy(() => import("./pages/admin/backups/BackupManagementPage"));

const ADMIN_ROLES        = ["staff", "supervisor", "admin", "superadmin"];
const BUSINESS_ROLES     = ["staff", "supervisor", "admin"];
const ALL_EXCEPT_STAFF   = ["supervisor", "admin", "superadmin"]; // superadmin can observe
const SUPERVISOR_UP      = ["supervisor", "admin", "superadmin"]; // superadmin can observe
const ADMIN_UP           = ["admin", "superadmin"];               // superadmin can observe + manage settings
const ADMIN_ONLY_ROLES   = ["admin"];
const SUPERADMIN_ROLES   = ["superadmin"];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppSettingsProvider>
          <OnboardingProvider>
            <CartProvider>
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3500,
                  style: {
                    background: "#1E293B",
                    color: "#F8FAFC",
                    fontFamily: "'Outfit', system-ui, sans-serif",
                    fontSize: "14px",
                    borderRadius: "10px",
                    padding: "12px 16px",
                  },
                  success: { iconTheme: { primary: "#C8912A", secondary: "#F8FAFC" } },
                  error:   { iconTheme: { primary: "#EF4444", secondary: "#F8FAFC" } },
                }}
              />
              <ScrollToTop />
              <OnboardingLayer />
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-cream">
                  <Spinner size="lg" />
                </div>
              }>
              <Routes>
            {/* ── PUBLIC ───────────────────────────────────────────── */}
            <Route element={<PublicLayout />}>
              <Route path="/"                element={<HomePage />} />
              <Route path="/shop"            element={<CataloguePage />} />
              <Route path="/shop/:id"        element={<ProductPage />} />
              <Route path="/cart"            element={<CartPage />} />
              <Route path="/checkout"        element={<CheckoutPage />} />
              <Route path="/order-confirmed" element={<OrderConfirmPage />} />
              <Route path="/track"           element={<TrackOrderPage />} />

              <Route path="/dashboard" element={
                <ProtectedRoute requireRole={["customer"]}>
                  <CustomerDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/orders/:id" element={
                <ProtectedRoute requireRole={["customer"]}>
                  <CustomerOrderDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute requireRole={["customer"]}>
                  <CustomerProfilePage />
                </ProtectedRoute>
              } />
            </Route>

            {/* ── AUTH ─────────────────────────────────────────────── */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── DRIVER PORTAL ────────────────────────────────────── */}
            <Route path="/driver" element={
              <ProtectedRoute requireRole={["driver"]}>
                <DriverLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/driver/dashboard" replace />} />
              <Route path="dashboard" element={<DriverDashboardPage />} />
              <Route path="orders"    element={<DriverOrdersPage />} />
            </Route>

            {/* ── ADMIN ────────────────────────────────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute requireRole={ADMIN_ROLES}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />

              {/* Dashboard — all admin roles including superadmin */}
              <Route path="dashboard" element={<AdminDashboardPage />} />

              {/* Business operations — superadmin can VIEW, not act */}
              <Route path="orders" element={
                <ProtectedRoute requireRole={ADMIN_ROLES}>
                  <OrderListPage />
                </ProtectedRoute>
              } />
              <Route path="orders/:id" element={
                <ProtectedRoute requireRole={ADMIN_ROLES}>
                  <AdminOrderDetailPage />
                </ProtectedRoute>
              } />

              <Route path="products" element={
                <ProtectedRoute requireRole={ADMIN_UP}>
                  <ProductListPage />
                </ProtectedRoute>
              } />
              <Route path="products/new" element={
                <ProtectedRoute requireRole={ADMIN_ONLY_ROLES}>
                  <ProductFormPage />
                </ProtectedRoute>
              } />
              <Route path="products/:id/edit" element={
                <ProtectedRoute requireRole={ADMIN_ONLY_ROLES}>
                  <ProductFormPage />
                </ProtectedRoute>
              } />

              <Route path="stock" element={
                <ProtectedRoute requireRole={ADMIN_ROLES}>
                  <StockPage />
                </ProtectedRoute>
              } />

              <Route path="stock/intake" element={
                <ProtectedRoute requireRole={SUPERVISOR_UP}>
                  <StockIntakePage />
                </ProtectedRoute>
              } />

              <Route path="drivers" element={
                <ProtectedRoute requireRole={SUPERVISOR_UP}>
                  <DriversPage />
                </ProtectedRoute>
              } />

              <Route path="customers" element={
                <ProtectedRoute requireRole={SUPERVISOR_UP}>
                  <CustomerListPage />
                </ProtectedRoute>
              } />
              <Route path="customers/:id" element={
                <ProtectedRoute requireRole={SUPERVISOR_UP}>
                  <AdminCustomerProfilePage />
                </ProtectedRoute>
              } />

              <Route path="reports" element={
                <ProtectedRoute requireRole={SUPERVISOR_UP}>
                  <ReportsPage />
                </ProtectedRoute>
              } />

              <Route path="settings" element={
                <ProtectedRoute requireRole={ADMIN_UP}>
                  <SettingsPage />
                </ProtectedRoute>
              } />

              {/* Superadmin: branch management */}
              <Route path="branches" element={
                <ProtectedRoute requireRole={SUPERADMIN_ROLES}>
                  <BranchManagementPage />
                </ProtectedRoute>
              } />

              {/* System — superadmin only */}
              <Route path="logs" element={
                <ProtectedRoute requireRole={SUPERADMIN_ROLES}>
                  <ActivityLogPage />
                </ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute requireRole={SUPERADMIN_ROLES}>
                  <UserManagementPage />
                </ProtectedRoute>
              } />
              <Route path="backups" element={
                <ProtectedRoute requireRole={SUPERADMIN_ROLES}>
                  <BackupManagementPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* ── FALLBACK ─────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </CartProvider>
          </OnboardingProvider>
        </AppSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
