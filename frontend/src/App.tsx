import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, RequireRole } from "./lib/auth";

import { ListingPage } from "./pages/buyer/ListingPage";
import { DetailPage } from "./pages/buyer/DetailPage";
import { CheckoutPage } from "./pages/buyer/CheckoutPage";
import { TicketPage } from "./pages/buyer/TicketPage";

import { OrganizadorLoginPage } from "./pages/organizador/LoginPage";
import { OrganizadorDashboardPage } from "./pages/organizador/DashboardPage";
import { OrganizadorWizardPage } from "./pages/organizador/WizardPage";
import { OrganizadorWalletPage } from "./pages/organizador/WalletPage";
import { OrganizadorStaffMgmtPage } from "./pages/organizador/StaffMgmtPage";

import { StaffLoginPage } from "./pages/staff/LoginPage";
import { StaffScannerPage } from "./pages/staff/ScannerPage";
import { StaffPosPage } from "./pages/staff/PosPage";

import { AdminLoginPage } from "./pages/admin/LoginPage";
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
          <Route
            path="/organizador/dashboard"
            element={
              <RequireRole roles={["Organizador"]} redirectTo="/organizador/login">
                <OrganizadorDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/organizador/crear"
            element={
              <RequireRole roles={["Organizador"]} redirectTo="/organizador/login">
                <OrganizadorWizardPage />
              </RequireRole>
            }
          />
          <Route
            path="/organizador/creditos"
            element={
              <RequireRole roles={["Organizador"]} redirectTo="/organizador/login">
                <OrganizadorWalletPage />
              </RequireRole>
            }
          />
          <Route
            path="/organizador/staff"
            element={
              <RequireRole roles={["Organizador"]} redirectTo="/organizador/login">
                <OrganizadorStaffMgmtPage />
              </RequireRole>
            }
          />

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
            path="/admin/dashboard"
            element={
              <RequireRole roles={["Administrador"]} redirectTo="/admin/login">
                <AdminDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <RequireRole roles={["Administrador"]} redirectTo="/admin/login">
                <AdminUsersPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/eventos"
            element={
              <RequireRole roles={["Administrador"]} redirectTo="/admin/login">
                <AdminEventsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/config"
            element={
              <RequireRole roles={["Administrador"]} redirectTo="/admin/login">
                <AdminConfigPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
