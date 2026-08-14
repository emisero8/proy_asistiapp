import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Navigate } from "react-router";
import { SESSION_STORAGE_KEY } from "./api";
import type { AuthResponseDTO, RolUsuario } from "./types";

type Session = AuthResponseDTO;

interface AuthContextValue {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): Session | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readStoredSession());

  const login = useCallback((newSession: Session) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

/** Sesión + helpers de login/logout del usuario autenticado actual (Organizador, Staff o Admin). */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/**
 * Bloquea una ruta a menos que haya sesión con uno de los roles permitidos.
 * Redirige a `redirectTo` (por defecto la raíz) si no corresponde.
 */
export function RequireRole({
  roles,
  redirectTo = "/",
  children,
}: {
  roles: RolUsuario[];
  redirectTo?: string;
  children: ReactNode;
}) {
  const { session } = useAuth();
  if (!session || !roles.includes(session.rol)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}
