import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { AuthBackground } from "../../components/AuthBackground";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export function OrganizadorResetPasswordPage() {
  useDocumentTitle("Restablecer contraseña");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") ?? "";

  const [pass, setPass] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Si no hay token en la URL, redirigir al login
  useEffect(() => {
    if (!token) {
      navigate("/organizador/login", { replace: true });
    }
  }, [token, navigate]);

  const passMatch = pass === passConfirm;
  const passValid = pass.length >= 8;
  const canSubmit = passValid && passMatch && pass.length > 0 && passConfirm.length > 0;

  async function handleReset() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(
        "/auth/restablecer-password",
        { token, nuevaPassword: pass },
        { skipAuth: true },
      );
      setSuccess(true);
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos restablecer la contraseña. El enlace puede haber expirado.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen lg:flex bg-background relative">
      <AuthBackground />

      {/* Panel de marca (igual al login) */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16 relative overflow-hidden bg-[#09090b]">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-[#9cadd3]/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-[#9cadd3]/10 blur-3xl" />

        <button onClick={() => navigate("/")} className="relative text-left w-fit mb-8 group">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Asistí<span className="text-[#9cadd3]">APP</span>
          </h1>
          <span className="block h-0.5 w-0 bg-[#9cadd3] transition-all duration-300 group-hover:w-full mt-0.5" />
        </button>

        <h2 className="text-4xl font-extrabold text-white tracking-tight relative leading-tight">
          Nueva contraseña, <span className="text-[#9cadd3]">nueva etapa</span>
        </h2>
        <p className="text-white/70 text-base mt-3 max-w-sm relative">
          Elegí una contraseña segura para volver a acceder a tu panel de organizador.
        </p>

        <div className="relative mt-10 space-y-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#9cadd3]/15 backdrop-blur-md border border-[#9cadd3]/25 flex items-center justify-center flex-none">
              <ShieldCheck size={14} className="text-[#9cadd3]" />
            </div>
            <span className="text-sm text-white/90 font-medium">Mínimo 8 caracteres</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#9cadd3]/15 backdrop-blur-md border border-[#9cadd3]/25 flex items-center justify-center flex-none">
              <ShieldCheck size={14} className="text-[#9cadd3]" />
            </div>
            <span className="text-sm text-white/90 font-medium">El token expira en 30 minutos</span>
          </div>
        </div>
      </div>

      {/* Panel formulario */}
      <div className="relative z-10 flex flex-col justify-center px-6 lg:w-1/2 lg:px-16 py-12">
        <div className="max-w-sm mx-auto w-full lg:bg-card/60 lg:backdrop-blur-xl lg:border lg:border-border lg:rounded-3xl lg:p-8 lg:shadow-xl lg:shadow-black/5">

          {/* Branding mobile */}
          <div className="mb-10 lg:hidden">
            <button onClick={() => navigate("/")} className="text-left">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                Asistí<span className="text-primary">APP</span>
              </h1>
            </button>
            <p className="text-muted-foreground text-sm mt-1">Restablecer contraseña</p>
          </div>

          {success ? (
            /* Estado: éxito */
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">¡Contraseña actualizada!</h2>
                <p className="text-sm text-muted-foreground">
                  Tu contraseña fue restablecida con éxito. Ya podés iniciar sesión con tu nueva clave.
                </p>
              </div>
              <button
                onClick={() => navigate("/organizador/login")}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 hover:scale-[1.015] active:scale-[0.98] transition-all"
              >
                Ir al login
              </button>
            </div>
          ) : (
            /* Formulario de nueva contraseña */
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading && canSubmit) handleReset();
              }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Crear nueva contraseña</h2>
                <p className="text-sm text-muted-foreground mt-1">Ingresá tu nueva contraseña para recuperar el acceso.</p>
              </div>

              {/* Campo: nueva contraseña */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3.5 pr-11 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pass.length > 0 && !passValid && (
                  <p className="text-xs text-destructive mt-1">Mínimo 8 caracteres</p>
                )}
              </div>

              {/* Campo: confirmar contraseña */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={passConfirm}
                    onChange={(e) => setPassConfirm(e.target.value)}
                    placeholder="Repetí la contraseña"
                    className="w-full px-4 py-3.5 pr-11 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passConfirm.length > 0 && !passMatch && (
                  <p className="text-xs text-destructive mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Error de API */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3 flex gap-2.5">
                  <AlertCircle size={16} className="text-destructive flex-none mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 hover:scale-[1.015] active:scale-[0.98] transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Actualizando..." : "Guardar nueva contraseña"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/organizador/login")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Volver al login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
