import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { AuthResponseDTO, LoginRequestDTO } from "../../lib/types";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const session = await api.post<AuthResponseDTO>(
        "/auth/login",
        { email, password: pass } satisfies LoginRequestDTO,
        { skipAuth: true },
      );
      if (session.rol !== "Administrador") {
        setError("Esta cuenta no es de Administrador.");
        return;
      }
      login(session);
      navigate("/admin/dashboard");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="w-full max-w-sm relative bg-card/60 border border-border rounded-3xl p-6 sm:p-8">
        <div className="mb-10 text-center">
          <button onClick={() => navigate("/")} className="mx-auto mb-4 block">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
              <ShieldCheck size={22} className="text-white" />
            </div>
          </button>
          <button onClick={() => navigate("/")} className="block w-full">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Admin · Asistí<span className="text-primary">APP</span>
            </h1>
          </button>
          <p className="text-muted-foreground text-sm mt-1">Ingresá con tu cuenta de administrador</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email de administrador</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="admin@asistiapp.com"
              className={`w-full px-4 py-3.5 bg-card border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${error ? "border-destructive/60" : "border-border"}`}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                className={`w-full px-4 py-3.5 pr-11 bg-card border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${error ? "border-destructive/60" : "border-border"}`}
              />
              <button
                onClick={() => setShow((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
          <button
            disabled={loading || !email || !pass}
            onClick={handleLogin}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar al sistema"}
          </button>
        </div>
      </div>
    </div>
  );
}
