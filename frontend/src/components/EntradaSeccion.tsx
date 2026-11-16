import { Navigate } from "react-router";
import { useAuth } from "../lib/auth";
import type { RolUsuario } from "../lib/types";

type Seccion = "admin" | "organizador" | "staff";

/** A dónde va cada rol cuando entra a su sección con sesión iniciada. */
const PANEL_POR_ROL: Partial<Record<RolUsuario, string>> = {
  Administrador: "/admin/dashboard",
  Organizador: "/organizador/dashboard",
  Staff_QR: "/staff/scanner",
  Staff_Vendedor: "/staff/pos",
};

const ROLES_DE: Record<Seccion, RolUsuario[]> = {
  admin: ["Administrador"],
  organizador: ["Organizador"],
  staff: ["Staff_QR", "Staff_Vendedor"],
};

/**
 * Entrada de una sección (`/admin`, `/organizador`, `/staff`) y de cualquier ruta inexistente
 * dentro de ella (`/admin/algo`): con sesión del rol que corresponde va a su panel; sin sesión
 * (o con la de otro rol), a su login. Antes esas URLs caían en la ruta comodín y mandaban al
 * inicio del comprador.
 */
export function EntradaSeccion({ seccion }: { seccion: Seccion }) {
  const { session } = useAuth();
  const panel = session && ROLES_DE[seccion].includes(session.rol) ? PANEL_POR_ROL[session.rol] : undefined;
  return <Navigate to={panel ?? `/${seccion}/login`} replace />;
}
