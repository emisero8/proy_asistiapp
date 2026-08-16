import { NavLink, Outlet } from "react-router";
import { LayoutDashboard, Users, Calendar, CircleDollarSign } from "lucide-react";
import { useAuth } from "../../lib/auth";

const TABS = [
  { to: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/admin/usuarios", label: "Usuarios", Icon: Users },
  { to: "/admin/eventos", label: "Eventos", Icon: Calendar },
  { to: "/admin/config", label: "Config", Icon: CircleDollarSign },
];

export function AdminLayout() {
  const { session, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 md:pl-52">
      {/* Sidebar — desktop (md+) */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-52 md:border-r md:border-border md:bg-card/40">
        <div className="px-5 pt-7 pb-5 border-b border-border">
          <h2 className="text-base font-extrabold text-foreground">
            Asistí<span className="text-primary">APP</span>
          </h2>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">Backoffice Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
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
        <div className="px-3 pb-5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-none">
              {session?.nombre?.charAt(0) ?? "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{session?.nombre}</p>
              <p className="text-[10px] text-muted-foreground truncate">Cerrar sesión</p>
            </div>
          </button>
        </div>
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
