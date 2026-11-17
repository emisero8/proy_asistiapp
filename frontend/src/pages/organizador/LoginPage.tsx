import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { MailCheck, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { AuthHeader, AuthLayout, type AuthBrand, MarcaAcento } from "../../components/AuthLayout";
import { Alert, Button, Field, Input, PasswordInput } from "../../components/ui";
import type { AuthResponseDTO, LoginRequestDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const MARCA: AuthBrand = {
  title: (
    <>
      Tu evento, <MarcaAcento>sin comisión</MarcaAcento>
    </>
  ),
  description: "Publicá, gestioná tu staff y controlá el acceso — todo desde un solo panel.",
  features: [
    { icon: Zap, text: "Publicá tu evento en minutos" },
    { icon: ShieldCheck, text: "Validación QR sin planillas" },
    { icon: TrendingUp, text: "Ventas en vivo desde cualquier lado" },
  ],
};

export function OrganizadorLoginPage() {
  useDocumentTitle("Ingreso de organizador");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
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

  function volverAlLogin() {
    setForgot(false);
    setRecoverySent(false);
    setError(null);
  }

  return (
    <AuthLayout brand={MARCA}>
      {!forgot ? (
        <>
          <AuthHeader title="Ingresá a tu panel" description="Panel del organizador" />
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading && email && pass) handleLogin();
            }}
          >
            <Field label="Email">
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="hola@miempresa.com"
              />
            </Field>
            <div className="space-y-1.5">
              <Field label="Contraseña">
                <PasswordInput
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setForgot(true);
                    setError(null);
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button type="submit" block size="lg" loading={loading} loadingText="Ingresando…" disabled={!email || !pass}>
              Ingresar al panel
            </Button>
          </form>
          <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link to="/organizador/registro" className="font-semibold text-primary underline-offset-4 hover:underline">
              Registrate gratis
            </Link>
          </p>
        </>
      ) : recoverySent ? (
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-success/12 text-success">
            <MailCheck size={22} aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Revisá tu email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Si <span className="font-medium text-foreground">{email}</span> está registrado, te enviamos un link para restablecer tu
            contraseña.
          </p>
          <Button variant="secondary" block className="mt-6" onClick={volverAlLogin}>
            Volver al ingreso
          </Button>
        </div>
      ) : (
        <>
          <AuthHeader title="Recuperar contraseña" description="Ingresá tu email y te enviamos un link para crear una nueva." />
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading && email) handleRecovery();
            }}
          >
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="hola@miempresa.com"
              />
            </Field>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button type="submit" block size="lg" loading={loading} loadingText="Enviando…" disabled={!email}>
              Enviar link de recupero
            </Button>
            <Button variant="ghost" block onClick={volverAlLogin}>
              Volver al ingreso
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
