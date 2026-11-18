import { LayoutDashboard, Users, Calendar, CircleDollarSign, History } from "lucide-react";
import { AppShell, type ShellNavItem } from "../../components/AppShell";
import { useAuth } from "../../lib/auth";

// Las 5 secciones también en mobile: antes Auditoría solo se alcanzaba desde el sidebar de
// desktop (o con "Ver todo" del Dashboard), porque la barra inferior era un grid fijo de 4.
const NAV: ShellNavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users },
  { to: "/admin/eventos", label: "Eventos", icon: Calendar },
  { to: "/admin/config", label: "Configuración", mobileLabel: "Config", icon: CircleDollarSign },
  { to: "/admin/auditoria", label: "Auditoría", icon: History },
];

export function AdminLayout() {
  const { session, logout } = useAuth();

  return (
    <AppShell
      nav={NAV}
      mobileNav={NAV}
      // Sin perfilTo: no existe pantalla de perfil de Administrador.
      usuario={{ nombre: session?.nombre ?? "", rol: "Administrador" }}
      // RequireRole manda a /admin/login apenas se borra la sesión.
      onLogout={logout}
    />
  );
}
