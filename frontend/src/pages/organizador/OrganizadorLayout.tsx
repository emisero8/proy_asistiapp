import { NavLink, Outlet } from "react-router";
import { LayoutDashboard, Sparkles, Wallet, Users } from "lucide-react";

const TABS = [
  { to: "/organizador/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/organizador/crear", label: "Crear", Icon: Sparkles },
  { to: "/organizador/creditos", label: "Créditos", Icon: Wallet },
  { to: "/organizador/staff", label: "Staff", Icon: Users },
];

export function OrganizadorLayout() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 md:pl-56">
      {/* Sidebar — desktop (md+) */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 md:border-r md:border-border md:bg-card/40">
        <div className="px-5 pt-6 pb-8">
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">
            Asistí<span className="text-primary">APP</span>
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">Organizador</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
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
              <Icon size={17} />
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
