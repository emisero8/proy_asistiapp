import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Eye, EyeOff, AlertCircle, Check, UserPlus, BadgeCheck } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { AuthResponseDTO, MovimientoCreditoResponseDTO, RegisterRequestDTO } from "../../lib/types";

export function OrganizadorRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [done, setDone] = useState(false);
  const [creditosBienvenida, setCreditosBienvenida] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passMatch = pass === pass2 && pass.length >= 8;
  const valid = name.trim().length > 1 && email.includes("@") && passMatch && agreed;

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const session = await api.post<AuthResponseDTO>(
        "/auth/register",
        { nombre: name, email, password: pass } satisfies RegisterRequestDTO,
        { skipAuth: true },
      );
      login(session);
      // El primer movimiento del historial es la Bienvenida recién otorgada al registrarse.
      const historial = await api.get<MovimientoCreditoResponseDTO[]>("/creditos/historial");
      setCreditosBienvenida(historial[0]?.saldoResultante ?? null);
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-6">
          <BadgeCheck size={38} className="text-primary" />
        </div>
        <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-2">¡Registro exitoso!</p>
        <h2 className="text-2xl font-extrabold text-foreground mb-2">Bienvenido/a, {name.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Ya podés empezar a publicar tus eventos con <span className="text-foreground font-medium">{email}</span>
        </p>
        {creditosBienvenida !== null && (
          <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-sm mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Créditos de bienvenida</span>
              <span className="text-sm font-bold text-emerald-400">+{creditosBienvenida} créditos 🎉</span>
            </div>
          </div>
        )}
        <button
          onClick={() => navigate("/organizador/dashboard")}
          className="w-full max-w-sm py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all"
        >
          Ir a mi panel
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-sm mx-auto">
        <div className="px-6 pt-8 pb-4 border-b border-border">
          <button onClick={() => navigate("/organizador/login")} className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors">
            <ChevronLeft size={15} />
            Volver
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <UserPlus size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">Crear cuenta gratis</h2>
              <p className="text-xs text-muted-foreground">Empezá a vender entradas hoy</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 flex flex-wrap gap-3">
            {["Créditos gratis al registrarte", "Sin comisiones", "Soporte 24/7"].map((b) => (
              <span key={b} className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Check size={11} /> {b}
              </span>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Nombre completo *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="María García"
              className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hola@miempresa.com"
              className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Contraseña * <span className="text-muted-foreground/60">(mín. 8 caracteres)</span>
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 pr-11 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button onClick={() => setShow((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Confirmar contraseña *</label>
            <div className="relative">
              <input
                type={show2 ? "text" : "password"}
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-3.5 pr-11 bg-card border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                  pass2 && !passMatch ? "border-red-500/60" : "border-border"
                }`}
              />
              <button onClick={() => setShow2((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {show2 ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pass2 && !passMatch && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                Las contraseñas no coinciden o son muy cortas.
              </p>
            )}
            {pass2 && passMatch && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <Check size={11} />
                Contraseñas coinciden.
              </p>
            )}
          </div>

          <button onClick={() => setAgreed((a) => !a)} className="flex items-start gap-3 w-full text-left">
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-none mt-0.5 transition-all ${
                agreed ? "bg-primary border-primary" : "border-border"
              }`}
            >
              {agreed && <Check size={12} className="text-white" />}
            </div>
            <span className="text-xs text-muted-foreground leading-relaxed">
              Acepto los <span className="text-primary underline">Términos y Condiciones</span> y la{" "}
              <span className="text-primary underline">Política de Privacidad</span> de AsistíAPP.
            </span>
          </button>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="px-6 py-4">
          <button
            disabled={!valid || loading}
            onClick={handleSubmit}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
              valid && !loading ? "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            ¿Ya tenés cuenta?{" "}
            <span onClick={() => navigate("/organizador/login")} className="text-primary cursor-pointer hover:underline">
              Iniciá sesión
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
