import { NavLink, Outlet, useNavigate } from "react-router";
import { LayoutDashboard, Users, Calendar, CircleDollarSign, LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth";

const TABS = [
  { to: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/admin/usuarios", label: "Usuarios", Icon: Users },
  { to: "/admin/eventos", label: "Eventos", Icon: Calendar },
  { to: "/admin/config", label: "Config", Icon: CircleDollarSign },
];

export function AdminLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 md:pl-52">
      {/* Cerrar sesión — fijo arriba a la derecha, a la izquierda del toggle de tema,
          visible en todas las pantallas de Admin (mismo lugar que en Organizador). */}
      <button
        onClick={logout}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="fixed top-3 right-14 z-50 h-9 pl-2.5 pr-3 rounded-full bg-card border border-border shadow-lg shadow-black/10 flex items-center gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
      >
        <LogOut size={15} />
        <span className="text-xs font-semibold hidden sm:inline">Salir</span>
      </button>

      {/* Sidebar — desktop (md+) */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-52 md:border-r md:border-border md:bg-card/40 relative overflow-hidden">
        <div className="absolute -top-20 -left-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        {/* Header: logo + bienvenida + perfil */}
        <div className="px-5 pt-7 pb-4 border-b border-border/50 relative">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">
            Asistí<span className="text-primary">APP</span>
          </h2>
          <p className="text-[11px] tracking-widest uppercase mt-1 mb-3 font-semibold">
            <span className="text-foreground/80">Bienvenido </span><span className="text-foreground">Administrador</span>
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            aria-label="Ver mi perfil"
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground flex-none">
              {session?.nombre?.charAt(0) ?? "A"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">{session?.nombre}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight">Ver Perfil</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 relative">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <Outlet />

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
