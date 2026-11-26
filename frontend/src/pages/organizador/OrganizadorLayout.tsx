import { useNavigate } from "react-router";
import { LayoutDashboard, Sparkles, Wallet, Users, UserRound } from "lucide-react";
import { AppShell, type ShellNavItem } from "../../components/AppShell";
import { useAuth } from "../../lib/auth";

const NAV: ShellNavItem[] = [
  { to: "/organizador/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/organizador/crear", label: "Crear evento", mobileLabel: "Crear", icon: Sparkles },
  { to: "/organizador/creditos", label: "Créditos", icon: Wallet },
  { to: "/organizador/staff", label: "Staff", icon: Users },
];

// En mobile no hay sidebar: el perfil va como quinta pestaña.
const MOBILE_NAV: ShellNavItem[] = [...NAV, { to: "/organizador/perfil", label: "Perfil", icon: UserRound }];

export function OrganizadorLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell
      ayudaTo="/ayuda/organizadores"
      nav={NAV}
      mobileNav={MOBILE_NAV}
      usuario={{
        nombre: session?.nombre ?? "",
        rol: "Organizador",
        fotoUrl: session?.fotoPerfilUrl,
        perfilTo: "/organizador/perfil",
      }}
      onLogout={() => {
        logout();
        navigate("/organizador/login");
      }}
    />
  );
}
