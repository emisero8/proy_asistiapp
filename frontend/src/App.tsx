import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider, RequireRole } from "./lib/auth";

const ListingPage = lazy(() => import("./pages/buyer/ListingPage").then((m) => ({ default: m.ListingPage })));
const DetailPage = lazy(() => import("./pages/buyer/DetailPage").then((m) => ({ default: m.DetailPage })));
const CheckoutPage = lazy(() => import("./pages/buyer/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const TicketPage = lazy(() => import("./pages/buyer/TicketPage").then((m) => ({ default: m.TicketPage })));

const OrganizadorLoginPage = lazy(() => import("./pages/organizador/LoginPage").then((m) => ({ default: m.OrganizadorLoginPage })));
const OrganizadorRegisterPage = lazy(() => import("./pages/organizador/RegisterPage").then((m) => ({ default: m.OrganizadorRegisterPage })));
const OrganizadorLayout = lazy(() => import("./pages/organizador/OrganizadorLayout").then((m) => ({ default: m.OrganizadorLayout })));
const OrganizadorDashboardPage = lazy(() => import("./pages/organizador/DashboardPage").then((m) => ({ default: m.OrganizadorDashboardPage })));
const OrganizadorWizardPage = lazy(() => import("./pages/organizador/WizardPage").then((m) => ({ default: m.OrganizadorWizardPage })));
const OrganizadorWalletPage = lazy(() => import("./pages/organizador/WalletPage").then((m) => ({ default: m.OrganizadorWalletPage })));
const OrganizadorStaffMgmtPage = lazy(() => import("./pages/organizador/StaffMgmtPage").then((m) => ({ default: m.OrganizadorStaffMgmtPage })));

const StaffLoginPage = lazy(() => import("./pages/staff/LoginPage").then((m) => ({ default: m.StaffLoginPage })));
const StaffScannerPage = lazy(() => import("./pages/staff/ScannerPage").then((m) => ({ default: m.StaffScannerPage })));
const StaffPosPage = lazy(() => import("./pages/staff/PosPage").then((m) => ({ default: m.StaffPosPage })));

const AdminLoginPage = lazy(() => import("./pages/admin/LoginPage").then((m) => ({ default: m.AdminLoginPage })));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() => import("./pages/admin/DashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import("./pages/admin/UsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminEventsPage = lazy(() => import("./pages/admin/EventsPage").then((m) => ({ default: m.AdminEventsPage })));
const AdminConfigPage = lazy(() => import("./pages/admin/ConfigPage").then((m) => ({ default: m.AdminConfigPage })));

/** Fallback mientras carga el chunk de la sección (Organizador/Staff/Admin traen recharts/html5-qrcode, code-split por ruta). */
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "#131222",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#f0eeff",
          },
        }}
      />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Comprador — público, sin auth (CU-015/016/017) */}
            <Route path="/" element={<ListingPage />} />
            <Route path="/eventos/:urlPublica" element={<DetailPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/ticket/:id" element={<TicketPage />} />

            {/* Organizador */}
            <Route path="/organizador/login" element={<OrganizadorLoginPage />} />
            <Route path="/organizador/registro" element={<OrganizadorRegisterPage />} />
            <Route
              element={
                <RequireRole roles={["Organizador"]} redirectTo="/organizador/login">
                  <OrganizadorLayout />
                </RequireRole>
              }
            >
              <Route path="/organizador/dashboard" element={<OrganizadorDashboardPage />} />
              <Route path="/organizador/crear" element={<OrganizadorWizardPage />} />
              <Route path="/organizador/creditos" element={<OrganizadorWalletPage />} />
              <Route path="/organizador/staff" element={<OrganizadorStaffMgmtPage />} />
            </Route>

            {/* Staff (QR y Vendedor) */}
            <Route path="/staff/login" element={<StaffLoginPage />} />
            <Route
              path="/staff/scanner"
              element={
                <RequireRole roles={["Staff_QR"]} redirectTo="/staff/login">
                  <StaffScannerPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/pos"
              element={
                <RequireRole roles={["Staff_Vendedor"]} redirectTo="/staff/login">
                  <StaffPosPage />
                </RequireRole>
              }
            />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              element={
                <RequireRole roles={["Administrador"]} redirectTo="/admin/login">
                  <AdminLayout />
                </RequireRole>
              }
            >
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/usuarios" element={<AdminUsersPage />} />
              <Route path="/admin/eventos" element={<AdminEventsPage />} />
              <Route path="/admin/config" element={<AdminConfigPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
