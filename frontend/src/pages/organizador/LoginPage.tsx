import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, AlertCircle, Zap, ShieldCheck, TrendingUp } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { AuthResponseDTO, LoginRequestDTO } from "../../lib/types";

const LOGIN_FEATURES = [
  { icon: Zap, text: "Publicá tu evento en minutos" },
  { icon: ShieldCheck, text: "Validación QR sin planillas" },
  { icon: TrendingUp, text: "Ventas en vivo desde cualquier lado" },
];

export function OrganizadorLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const session = await api.post<AuthResponseDTO>(
        "/auth/login",
        { email, password: pass } satisfies LoginRequestDTO,
        { skipAuth: true },
      );
      if (session.rol !== "Organizador") {
        setError("Esta cuenta no es de Organizador.");
        return;
      }
      login(session);
      navigate("/organizador/dashboard");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecovery() {
    setLoading(true);
    setError(null);
    try {
      // El backend nunca revela si el email existe (evita filtrar usuarios registrados).
      await api.post("/auth/recuperar-password", { email }, { skipAuth: true });
      setRecoverySent(true);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen lg:flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16 relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.35),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(124,58,237,0.25),transparent_50%)] bg-card">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <div className="absolute top-1/4 -right-16 w-72 h-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-primary/15 blur-3xl" />

        <button onClick={() => navigate("/")} className="relative text-left w-fit mb-8 group">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Asistí<span className="text-primary">APP</span>
          </h1>
          <span className="block h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full mt-0.5" />
        </button>

        <h2 className="text-4xl font-extrabold text-white tracking-tight relative leading-tight">
          Tu evento, <span className="text-primary">sin comisión</span>
        </h2>
        <p className="text-white/70 text-base mt-3 max-w-sm relative">
          Publicá, gestioná tu staff y controlá el acceso — todo desde un solo panel.
        </p>

        <div className="relative mt-10 space-y-3.5">
          {LOGIN_FEATURES.map((f) => (
            <div key={f.text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-none">
                <f.icon size={14} className="text-primary" />
              </div>
              <span className="text-sm text-white/80">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 lg:w-1/2 lg:px-16 py-12">
        <div className="max-w-sm mx-auto w-full">
          <div className="mb-10 lg:hidden">
            <button onClick={() => navigate("/")} className="text-left">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                Asistí<span className="text-primary">APP</span>
              </h1>
            </button>
            <p className="text-muted-foreground text-sm mt-1">Panel del Organizador</p>
          </div>

          {!forgot ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hola@miempresa.com"
                className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 pr-11 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <button
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button onClick={() => setForgot(true)} className="text-xs text-primary hover:underline text-right w-full block">
              ¿Olvidaste tu contraseña?
            </button>
            <button
              disabled={loading || !email || !pass}
              onClick={handleLogin}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Ingresando..." : "Ingresar al panel"}
            </button>
            <p className="text-center text-xs text-muted-foreground pt-2">
              ¿No tenés cuenta?{" "}
              <span onClick={() => navigate("/organizador/registro")} className="text-primary cursor-pointer hover:underline font-semibold">
                Registrate gratis
              </span>
            </p>
          </div>
        ) : recoverySent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-foreground">
              Si <span className="font-medium">{email}</span> está registrado, te enviamos un email con instrucciones para restablecer tu contraseña.
            </p>
            <button onClick={() => { setForgot(false); setRecoverySent(false); }} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Volver al login
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex gap-3">
              <AlertCircle size={18} className="text-primary flex-none mt-0.5" />
              <p className="text-sm text-foreground">Ingresá tu email y te enviamos un link para restablecer tu contraseña.</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hola@miempresa.com"
                className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              disabled={loading || !email}
              onClick={handleRecovery}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Enviar link de recupero"}
            </button>
            <button onClick={() => setForgot(false)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Volver al login
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
