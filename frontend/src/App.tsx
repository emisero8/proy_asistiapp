import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider, RequireRole } from "./lib/auth";
import { ThemeProvider, useTheme } from "./lib/theme";
import { DialogProvider } from "./components/DialogProvider";
import { FloatingThemeToggle } from "./components/ThemeToggle";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { AnimatedOutlet, RouteFallback } from "./components/AnimatedOutlet";

const ListingPage = lazy(() => import("./pages/buyer/ListingPage").then((m) => ({ default: m.ListingPage })));
const AllEventsPage = lazy(() => import("./pages/buyer/AllEventsPage").then((m) => ({ default: m.AllEventsPage })));
const DetailPage = lazy(() => import("./pages/buyer/DetailPage").then((m) => ({ default: m.DetailPage })));
const CheckoutPage = lazy(() => import("./pages/buyer/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const MiEntradaPage = lazy(() => import("./pages/buyer/MiEntradaPage").then((m) => ({ default: m.MiEntradaPage })));
const PagoResultadoPage = lazy(() => import("./pages/buyer/PagoResultadoPage").then((m) => ({ default: m.PagoResultadoPage })));

const OrganizadorLoginPage = lazy(() => import("./pages/organizador/LoginPage").then((m) => ({ default: m.OrganizadorLoginPage })));
const OrganizadorRegisterPage = lazy(() => import("./pages/organizador/RegisterPage").then((m) => ({ default: m.OrganizadorRegisterPage })));
const OrganizadorResetPasswordPage = lazy(() => import("./pages/organizador/ResetPasswordPage").then((m) => ({ default: m.OrganizadorResetPasswordPage })));
const OrganizadorLayout = lazy(() => import("./pages/organizador/OrganizadorLayout").then((m) => ({ default: m.OrganizadorLayout })));
const OrganizadorDashboardPage = lazy(() => import("./pages/organizador/DashboardPage").then((m) => ({ default: m.OrganizadorDashboardPage })));
const OrganizadorWizardPage = lazy(() => import("./pages/organizador/WizardPage").then((m) => ({ default: m.OrganizadorWizardPage })));
const OrganizadorEditEventPage = lazy(() => import("./pages/organizador/EditEventPage").then((m) => ({ default: m.OrganizadorEditEventPage })));
const OrganizadorEventoDetallePage = lazy(() => import("./pages/organizador/EventoDetallePage").then((m) => ({ default: m.OrganizadorEventoDetallePage })));
const OrganizadorPerfilPage = lazy(() => import("./pages/organizador/PerfilPage").then((m) => ({ default: m.OrganizadorPerfilPage })));
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
const AdminAuditoriaPage = lazy(() => import("./pages/admin/AuditoriaPage").then((m) => ({ default: m.AdminAuditoriaPage })));

// Catálogo del sistema de diseño: solo en desarrollo. Con import.meta.env.DEV = false en el
// build, el ternario se resuelve en `null` y el import dinámico (y su chunk) desaparecen.
const UiCatalogPage = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/UiCatalogPage").then((m) => ({ default: m.UiCatalogPage })))
  : null;

/** Vuelve arriba en cada cambio de ruta (antes lo hacía el wrapper animado global). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Rutas de la app. La transición de página NO envuelve a todas las rutas: vive en
 * `<AnimatedOutlet>` adentro de cada layout, así navegar entre pantallas de Organizador
 * o Admin remonta solo el contenido — el sidebar y la campanita quedan montados (antes
 * un `key={pathname}` global los remontaba en cada navegación).
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Pantallas sin chrome compartido: comprador, logins y Staff */}
      <Route element={<AnimatedOutlet />}>
        {/* Comprador — público, sin auth (CU-015/016/017) */}
        <Route path="/" element={<ListingPage />} />
        <Route path="/eventos" element={<AllEventsPage />} />
        <Route path="/eventos/:urlPublica" element={<DetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/mi-entrada" element={<MiEntradaPage />} />
        <Route path="/pago/resultado" element={<PagoResultadoPage />} />

        {/* Accesos (logins y recupero) */}
        <Route path="/organizador/login" element={<OrganizadorLoginPage />} />
        <Route path="/organizador/registro" element={<OrganizadorRegisterPage />} />
        <Route path="/organizador/recuperar-password" element={<OrganizadorResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        {UiCatalogPage && <Route path="/dev/ui" element={<UiCatalogPage />} />}

        {/* Staff (QR y Vendedor) — pantallas de una sola tarea, sin layout compartido */}
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
      </Route>

      {/* Organizador — el layout usa <AnimatedOutlet> para su contenido */}
      <Route
        element={
          <RequireRole roles={["Organizador"]} redirectTo="/organizador/login">
            <OrganizadorLayout />
          </RequireRole>
        }
      >
        <Route path="/organizador/dashboard" element={<OrganizadorDashboardPage />} />
        <Route path="/organizador/crear" element={<OrganizadorWizardPage />} />
        <Route path="/organizador/eventos/:id" element={<OrganizadorEventoDetallePage />} />
        <Route path="/organizador/eventos/:id/editar" element={<OrganizadorEditEventPage />} />
        <Route path="/organizador/creditos" element={<OrganizadorWalletPage />} />
        <Route path="/organizador/staff" element={<OrganizadorStaffMgmtPage />} />
        <Route path="/organizador/perfil" element={<OrganizadorPerfilPage />} />
      </Route>

      {/* Admin — el layout usa <AnimatedOutlet> para su contenido */}
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
        <Route path="/admin/eventos/:id/editar" element={<OrganizadorEditEventPage />} />
        <Route path="/admin/config" element={<AdminConfigPage />} />
        <Route path="/admin/auditoria" element={<AdminAuditoriaPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { theme } = useTheme();

  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        theme={theme}
        toastOptions={{
          style: {
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          },
        }}
      />
      <DialogProvider>
        <BrowserRouter>
          <ScrollToTop />
          <FloatingThemeToggle />
          {/* Fallback y error boundary de primera carga de una sección (todavía no hay layout
              montado, ej. el chunk de OrganizadorLayout); dentro de un layout ya montado,
              actúan los de <AnimatedOutlet>. */}
          <RouteErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <AppRoutes />
            </Suspense>
          </RouteErrorBoundary>
        </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  );
}
