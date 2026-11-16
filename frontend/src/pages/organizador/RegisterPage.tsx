import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { BadgeCheck, Gift, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { AuthHeader, AuthLayout, type AuthBrand } from "../../components/AuthLayout";
import { Alert, Button, Checkbox, Field, Input, PasswordInput } from "../../components/ui";
import type { AuthResponseDTO, MovimientoCreditoResponseDTO, RegisterRequestDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const MARCA: AuthBrand = {
  title: (
    <>
      Vendé entradas <span className="text-[#9cadd3]">sin comisión</span> y con todo bajo control
    </>
  ),
  description: "Publicá tu evento, vendé online o en la puerta y validá cada entrada con QR — todo desde un mismo panel.",
  features: [
    { icon: Gift, text: "Créditos de bienvenida al registrarte" },
    { icon: Zap, text: "Cargá tu evento y sus tandas de precios en minutos" },
    { icon: ShieldCheck, text: "Validación QR en la puerta, sin entradas duplicadas" },
    { icon: TrendingUp, text: "Seguí tus ventas en vivo desde cualquier lado" },
  ],
};

type Campo = "nombre" | "email" | "pass" | "pass2" | "terminos";

export function OrganizadorRegisterPage() {
  useDocumentTitle("Crear cuenta de organizador");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [done, setDone] = useState(false);
  const [creditosBienvenida, setCreditosBienvenida] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Los errores de cada campo se muestran recién al salir de él o al intentar enviar,
  // no mientras la persona todavía está escribiendo.
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const errores: Partial<Record<Campo, string>> = {
    nombre: name.trim().length > 1 ? undefined : "Ingresá tu nombre completo.",
    email: email.includes("@") ? undefined : "Ingresá un email válido.",
    pass: pass.length >= 8 ? undefined : "Tiene que tener al menos 8 caracteres.",
    pass2: pass2 && pass2 === pass ? undefined : "Las contraseñas no coinciden.",
    terminos: agreed ? undefined : "Tenés que aceptar los términos para crear la cuenta.",
  };
  const valid = Object.values(errores).every((e) => !e);
  const mostrar = (c: Campo) => (intentoEnviar || tocados[c] ? errores[c] : undefined);
  const tocar = (c: Campo) => () => setTocados((t) => ({ ...t, [c]: true }));

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
      <AuthLayout brand={MARCA}>
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-success/12 text-success">
            <BadgeCheck size={22} aria-hidden="true" />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">¡Bienvenido/a, {name.split(" ")[0]}!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta <span className="font-medium text-foreground">{email}</span> ya está lista para publicar eventos.
          </p>
          {creditosBienvenida !== null && (
            <div className="mt-5 flex items-center justify-between rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-left">
              <span className="text-sm text-foreground">Créditos de bienvenida</span>
              <span className="text-base font-extrabold tabular-nums text-success">+{creditosBienvenida}</span>
            </div>
          )}
          <Button block size="lg" className="mt-6" onClick={() => navigate("/organizador/dashboard")}>
            Ir a mi panel
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout brand={MARCA} size="md">
      <AuthHeader title="Crear cuenta de organizador" description="Gratis. Recibís créditos de bienvenida para publicar tu primer evento." />
      <form
        ref={formRef}
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (loading) return;
          if (!valid) {
            setIntentoEnviar(true);
            // Lleva el foco al primer campo con problemas (los inválidos quedan con aria-invalid).
            requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
          }
          handleSubmit();
        }}
      >
        <Field label="Nombre completo" error={mostrar("nombre")}>
          <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={tocar("nombre")} placeholder="María García" />
        </Field>
        <Field label="Email" error={mostrar("email")}>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={tocar("email")}
            placeholder="hola@miempresa.com"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contraseña" hint="Mínimo 8 caracteres." error={mostrar("pass")}>
            <PasswordInput autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} onBlur={tocar("pass")} />
          </Field>
          <Field label="Confirmar contraseña" error={mostrar("pass2")}>
            <PasswordInput
              autoComplete="new-password"
              toggleLabel="la confirmación"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              onBlur={tocar("pass2")}
            />
          </Field>
        </div>
        <div className="space-y-1.5">
          <Checkbox
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              setTocados((t) => ({ ...t, terminos: true }));
            }}
            aria-invalid={mostrar("terminos") ? true : undefined}
            aria-describedby={mostrar("terminos") ? "registro-terminos-error" : undefined}
            label="Acepto los Términos y Condiciones y la Política de Privacidad de AsistíAPP."
          />
          {mostrar("terminos") && <p id="registro-terminos-error" className="pl-[30px] text-xs font-medium text-destructive">{mostrar("terminos")}</p>}
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" block size="lg" loading={loading} loadingText="Creando cuenta…">
          Crear cuenta gratis
        </Button>
      </form>
      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link to="/organizador/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Ingresá
        </Link>
      </p>
    </AuthLayout>
  );
}
