import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, RequireRole } from "./lib/auth";

import { ListingPage } from "./pages/buyer/ListingPage";
import { DetailPage } from "./pages/buyer/DetailPage";
import { CheckoutPage } from "./pages/buyer/CheckoutPage";
import { TicketPage } from "./pages/buyer/TicketPage";

import { OrganizadorLoginPage } from "./pages/organizador/LoginPage";
import { OrganizadorRegisterPage } from "./pages/organizador/RegisterPage";
import { OrganizadorLayout } from "./pages/organizador/OrganizadorLayout";
import { OrganizadorDashboardPage } from "./pages/organizador/DashboardPage";
import { OrganizadorWizardPage } from "./pages/organizador/WizardPage";
import { OrganizadorWalletPage } from "./pages/organizador/WalletPage";
import { OrganizadorStaffMgmtPage } from "./pages/organizador/StaffMgmtPage";

import { StaffLoginPage } from "./pages/staff/LoginPage";
import { StaffScannerPage } from "./pages/staff/ScannerPage";
import { StaffPosPage } from "./pages/staff/PosPage";

import { AdminLoginPage } from "./pages/admin/LoginPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboardPage } from "./pages/admin/DashboardPage";
import { AdminUsersPage } from "./pages/admin/UsersPage";
import { AdminEventsPage } from "./pages/admin/EventsPage";
import { AdminConfigPage } from "./pages/admin/ConfigPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}
