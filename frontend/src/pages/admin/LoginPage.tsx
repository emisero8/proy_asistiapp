import { useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { AuthHeader, AuthLayout } from "../../components/AuthLayout";
import { Alert, Button, Field, Input, PasswordInput } from "../../components/ui";
import type { AuthResponseDTO, LoginRequestDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export function AdminLoginPage() {
  useDocumentTitle("Ingreso de administrador");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
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
    <AuthLayout>
      <AuthHeader icon={ShieldCheck} title="Panel de administración" description="Ingresá con tu cuenta de administrador." />
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
            placeholder="admin@asistiapp.com"
          />
        </Field>
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
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" block size="lg" loading={loading} loadingText="Ingresando…" disabled={!email || !pass}>
          Ingresar al sistema
        </Button>
      </form>
    </AuthLayout>
  );
}
