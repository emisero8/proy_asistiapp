import { NavLink, Outlet, useNavigate } from "react-router";
import { LayoutDashboard, Sparkles, Wallet, Users, LogOut, UserRound } from "lucide-react";
import { NotificationBell } from "../../components/NotificationBell";
import { useAuth } from "../../lib/auth";

// "label" se usa en el sidebar de desktop (hay lugar de sobra); "mobileLabel"
// es la versión corta para la barra inferior de mobile, donde 5 pestañas
// comparten el ancho de la pantalla.
const TABS = [
  { to: "/organizador/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/organizador/crear", label: "Crear evento", mobileLabel: "Crear", Icon: Sparkles },
  { to: "/organizador/creditos", label: "Créditos", Icon: Wallet },
  { to: "/organizador/staff", label: "Staff", Icon: Users },
];

// En mobile el perfil va como quinta pestaña de la barra inferior (no hay sidebar).
const MOBILE_TABS = [...TABS, { to: "/organizador/perfil", label: "Perfil", Icon: UserRound }];

/** Foto de perfil o, si no hay, la inicial del nombre. */
function Avatar({ nombre, foto }: { nombre?: string; foto?: string | null }) {
  return foto ? (
    <img src={foto} alt="" className="w-7 h-7 rounded-full object-cover flex-none bg-muted" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-none">
      {nombre?.charAt(0) ?? "O"}
    </div>
  );
}

export function OrganizadorLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/organizador/login");
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 md:pl-56">
      {/* Notificaciones + cerrar sesión — fijo arriba a la derecha, a la izquierda del
          toggle de tema, visible en todas las pantallas de Organizador. */}
      <div className="fixed top-3 right-14 z-50 flex items-center gap-2">
        <NotificationBell />
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="h-9 pl-2.5 pr-3 rounded-full bg-card border border-border shadow-lg shadow-black/10 flex items-center gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
        >
          <LogOut size={15} />
          <span className="text-xs font-semibold hidden sm:inline">Salir</span>
        </button>
      </div>

      {/* Sidebar — desktop (md+) */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 md:border-r md:border-border md:bg-card/40 relative overflow-hidden">
        <div className="absolute -top-20 -left-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        {/* Header: logo + bienvenida + perfil clickeable */}
        <div className="px-5 pt-6 pb-4 border-b border-border/50 relative">
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            Asistí<span className="text-primary">APP</span>
          </h1>
          <p className="text-[11px] tracking-widest uppercase mt-1 mb-3 font-semibold">
            <span className="text-foreground/80">Bienvenido </span><span className="text-foreground">Organizador</span>
          </p>
          <button
            type="button"
            onClick={() => navigate("/organizador/perfil")}
            aria-label="Ver mi perfil"
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Avatar nombre={session?.nombre} foto={session?.fotoPerfilUrl} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {session?.nombre}
              </p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight">Ver Perfil</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 pt-4 space-y-1 relative">
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
        <div className="max-w-md mx-auto grid grid-cols-5">
          {MOBILE_TABS.map(({ to, label, mobileLabel, Icon }) => (
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
              {mobileLabel ?? label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
