import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Clock, KeyRound, ShieldCheck } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { AuthHeader, AuthLayout, type AuthBrand } from "../../components/AuthLayout";
import { Alert, Button, Field, PasswordInput } from "../../components/ui";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const MARCA: AuthBrand = {
  title: (
    <>
      Nueva contraseña, <span className="text-[#9cadd3]">nueva etapa</span>
    </>
  ),
  description: "Elegí una contraseña segura para volver a acceder a tu panel de organizador.",
  features: [
    { icon: ShieldCheck, text: "Mínimo 8 caracteres" },
    { icon: Clock, text: "El link de recupero vence a los 30 minutos" },
  ],
};

export function OrganizadorResetPasswordPage() {
  useDocumentTitle("Restablecer contraseña");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") ?? "";

  const [pass, setPass] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
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
      await api.post("/auth/restablecer-password", { token, nuevaPassword: pass }, { skipAuth: true });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos restablecer la contraseña. El enlace puede haber expirado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout brand={MARCA}>
      {success ? (
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-success/12 text-success">
            <CheckCircle2 size={22} aria-hidden="true" />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">¡Contraseña actualizada!</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ya podés ingresar con tu nueva contraseña.</p>
          <Button block size="lg" className="mt-6" onClick={() => navigate("/organizador/login")}>
            Ir al ingreso
          </Button>
        </div>
      ) : (
        <>
          <AuthHeader icon={KeyRound} title="Crear nueva contraseña" description="Elegí la contraseña con la que vas a ingresar a tu panel." />
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading && canSubmit) handleReset();
            }}
          >
            <Field
              label="Nueva contraseña"
              hint="Mínimo 8 caracteres."
              error={pass.length > 0 && !passValid ? "Tiene que tener al menos 8 caracteres." : undefined}
            >
              <PasswordInput autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </Field>
            <Field
              label="Confirmar contraseña"
              error={passConfirm.length > 0 && !passMatch ? "Las contraseñas no coinciden." : undefined}
            >
              <PasswordInput
                autoComplete="new-password"
                toggleLabel="la confirmación"
                value={passConfirm}
                onChange={(e) => setPassConfirm(e.target.value)}
              />
            </Field>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button type="submit" block size="lg" loading={loading} loadingText="Guardando…" disabled={!canSubmit}>
              Guardar nueva contraseña
            </Button>
            <Button variant="ghost" block onClick={() => navigate("/organizador/login")}>
              Volver al ingreso
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
