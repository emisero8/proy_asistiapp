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
    <div className="min-h-screen bg-background pb-16">
      <Outlet />
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md">
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
