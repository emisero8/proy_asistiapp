import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound, MessageCircle, Save, UserRound, Users } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ImagenPortadaField } from "../../components/ImagenPortadaField";
import { Alert, Button, Card, ErrorState, Field, Input, PageHeader, PasswordInput, Skeleton } from "../../components/ui";
import { ComisionMpPanel } from "./ComisionMpPanel";
import { CuentaMercadoPagoCard } from "./CuentaMercadoPagoCard";
import { EncabezadoTarjeta } from "./EncabezadoTarjeta";
import type { CambiarPasswordRequestDTO, ContactoRequestDTO, PerfilRequestDTO, PerfilResponseDTO, TopeCompradorRequestDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export function OrganizadorPerfilPage() {
  useDocumentTitle("Mi perfil");
  const { session, login } = useAuth();

  const [perfil, setPerfil] = useState<PerfilResponseDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [foto, setFoto] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

  const [tope, setTope] = useState("");
  const [guardandoTope, setGuardandoTope] = useState(false);
  const [errorTope, setErrorTope] = useState<string | null>(null);

  const [contactoWa, setContactoWa] = useState("");
  const [contactoMail, setContactoMail] = useState("");
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [errorContacto, setErrorContacto] = useState<string | null>(null);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PerfilResponseDTO>("/organizador/perfil")
      .then((p) => {
        setPerfil(p);
        setNombre(p.nombre);
        setFoto(p.fotoPerfilUrl ?? "");
        setTope(p.maxEntradasPorComprador == null ? "" : String(p.maxEntradasPorComprador));
        setContactoWa(p.contactoWhatsapp ?? "");
        setContactoMail(p.contactoEmail ?? "");
      })
      .catch((e: unknown) => setLoadError(e instanceof ApiError ? e.message : "No pudimos cargar tu perfil."));
  }, []);

  async function guardarPerfil(e: FormEvent) {
    e.preventDefault();
    setErrorPerfil(null);
    if (!nombre.trim()) {
      setErrorPerfil("El nombre es obligatorio.");
      return;
    }
    const dto: PerfilRequestDTO = { nombre: nombre.trim(), fotoPerfilUrl: foto || null };
    setGuardandoPerfil(true);
    try {
      const actualizado = await api.put<PerfilResponseDTO>("/organizador/perfil", dto);
      setPerfil(actualizado);
      setNombre(actualizado.nombre);
      setFoto(actualizado.fotoPerfilUrl ?? "");
      // La sidebar lee el nombre y la foto de la sesión: se actualiza sin pedir un nuevo login
      if (session) {
        login({ ...session, nombre: actualizado.nombre, fotoPerfilUrl: actualizado.fotoPerfilUrl });
      }
      toast.success("Perfil actualizado");
    } catch (err: unknown) {
      setErrorPerfil(err instanceof ApiError ? err.message : "No pudimos guardar el perfil.");
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function guardarContacto(e: FormEvent) {
    e.preventDefault();
    setErrorContacto(null);
    const dto: ContactoRequestDTO = {
      contactoWhatsapp: contactoWa.trim() === "" ? null : contactoWa.trim(),
      contactoEmail: contactoMail.trim() === "" ? null : contactoMail.trim(),
    };
    setGuardandoContacto(true);
    try {
      const actualizado = await api.put<PerfilResponseDTO>("/organizador/perfil/contacto", dto);
      setPerfil(actualizado);
      setContactoWa(actualizado.contactoWhatsapp ?? "");
      setContactoMail(actualizado.contactoEmail ?? "");
      toast.success("Contacto guardado");
    } catch (err) {
      setErrorContacto(err instanceof ApiError ? err.message : "No pudimos guardar el contacto.");
    } finally {
      setGuardandoContacto(false);
    }
  }

  async function guardarTope(e: FormEvent) {
    e.preventDefault();
    setErrorTope(null);
    // Vacío = volver al tope de la plataforma.
    const valor = tope.trim() === "" ? null : Number(tope);
    if (valor !== null && (!Number.isInteger(valor) || valor < 1 || valor > 100)) {
      setErrorTope("El tope tiene que ser un número entero entre 1 y 100.");
      return;
    }
    const dto: TopeCompradorRequestDTO = { maxEntradasPorComprador: valor };
    setGuardandoTope(true);
    try {
      const actualizado = await api.put<PerfilResponseDTO>("/organizador/perfil/tope-comprador", dto);
      setPerfil(actualizado);
      setTope(actualizado.maxEntradasPorComprador == null ? "" : String(actualizado.maxEntradasPorComprador));
      toast.success("Tope guardado");
    } catch (err: unknown) {
      setErrorTope(err instanceof ApiError ? err.message : "No pudimos guardar el tope.");
    } finally {
      setGuardandoTope(false);
    }
  }

  async function cambiarPassword(e: FormEvent) {
    e.preventDefault();
    setErrorPassword(null);
    if (!actual) return setErrorPassword("Ingresá tu contraseña actual.");
    if (nueva.length < 8) return setErrorPassword("La nueva contraseña debe tener al menos 8 caracteres.");
    if (nueva !== confirmacion) return setErrorPassword("La confirmación no coincide con la nueva contraseña.");
    if (nueva === actual) return setErrorPassword("La nueva contraseña debe ser distinta a la actual.");

    const dto: CambiarPasswordRequestDTO = { passwordActual: actual, passwordNueva: nueva };
    setGuardandoPassword(true);
    try {
      await api.put<void>("/organizador/perfil/password", dto);
      setActual("");
      setNueva("");
      setConfirmacion("");
      toast.success("Contraseña cambiada");
    } catch (err: unknown) {
      setErrorPassword(err instanceof ApiError ? err.message : "No pudimos cambiar la contraseña.");
    } finally {
      setGuardandoPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader title="Mi perfil" description="Tus datos, tu cuenta de cobro, el contacto para compradores y tu contraseña." />

      {loadError && <ErrorState title="No pudimos cargar tu perfil" description={loadError} />}

      {!perfil && !loadError && (
        <div className="flex flex-col gap-6 md:flex-row md:items-start" aria-busy="true">
          <span className="sr-only">Cargando tu perfil…</span>
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      )}

      {perfil && (
        // Dos columnas flex independientes (no una grilla de filas): cada tarjeta ocupa su altura natural y una
        // tarjeta alta no deja un hueco al lado de la más baja. En mobile es una sola columna en el mismo orden.
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Card as="form" variant="editorial" onSubmit={guardarPerfil} aria-labelledby="perfil-titulo" className="space-y-5">
              <EncabezadoTarjeta id="perfil-titulo" indice="01" eyebrow="Identidad" icon={UserRound}>
                Datos del perfil
              </EncabezadoTarjeta>

              <ImagenPortadaField variant="avatar" value={foto} onChange={setFoto} endpoint="/organizador/perfil/foto" />

              <Field label="Nombre" labelVariant="mono">
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} autoComplete="name" />
              </Field>

              <Field label="Email" labelVariant="mono" hint="El email no se puede cambiar.">
                <Input value={perfil.email} disabled readOnly className="font-mono" />
              </Field>

              {errorPerfil && <Alert tone="danger">{errorPerfil}</Alert>}

              <Button type="submit" block tactil leftIcon={<Save size={16} />} loading={guardandoPerfil} loadingText="Guardando…">
                Guardar cambios
              </Button>
            </Card>

            <CuentaMercadoPagoCard>
              <ComisionMpPanel perfil={perfil} onGuardado={setPerfil} />
            </CuentaMercadoPagoCard>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Card as="form" variant="editorial" onSubmit={guardarTope} noValidate aria-labelledby="tope-titulo" className="space-y-5">
              <EncabezadoTarjeta id="tope-titulo" indice="03" eyebrow="Compradores" icon={Users}>
                Entradas por persona
              </EncabezadoTarjeta>
              <Field
                label="Máximo de entradas por persona"
                labelVariant="mono"
                hint="Cuántas entradas puede tener una misma persona (mismo email) en cada uno de tus eventos, online y en las ventas del staff. Vacío: rige el de la plataforma."
                error={errorTope ?? undefined}
              >
                <Input
                  type="number"
                  min={1}
                  max={100}
                  inputMode="numeric"
                  value={tope}
                  onChange={(e) => setTope(e.target.value)}
                  placeholder={String(perfil.maxEntradasPorCompradorPlataforma)}
                  className="font-mono tabular-nums"
                />
              </Field>
              <p className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
                <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-secondary" />
                {perfil.maxEntradasPorComprador == null
                  ? `Hoy rige el de la plataforma: ${perfil.maxEntradasPorCompradorPlataforma}.`
                  : `Tu tope es de ${perfil.maxEntradasPorComprador} entradas por persona.`}
              </p>
              <Button type="submit" block variant="secondary" tactil leftIcon={<Save size={16} />} loading={guardandoTope} loadingText="Guardando…">
                Guardar tope
              </Button>
            </Card>

            <Card as="form" variant="editorial" onSubmit={guardarContacto} noValidate aria-labelledby="contacto-titulo" className="space-y-5">
              <EncabezadoTarjeta
                id="contacto-titulo"
                indice="04"
                eyebrow="Arrepentimiento"
                icon={MessageCircle}
                descripcion="Quien quiera arrepentirse de una compra es derivado a este contacto: el pedido lo resolvés vos. Necesitás al menos uno para publicar un evento."
              >
                Contacto para el arrepentimiento
              </EncabezadoTarjeta>
              <Field label="WhatsApp de contacto" labelVariant="mono">
                <Input type="tel" autoComplete="tel" value={contactoWa} onChange={(e) => setContactoWa(e.target.value)} placeholder="+54 9 11 5555-1234" />
              </Field>
              <Field label="Email de contacto" labelVariant="mono">
                <Input type="email" autoComplete="email" value={contactoMail} onChange={(e) => setContactoMail(e.target.value)} placeholder="contacto@tuevento.com" />
              </Field>
              {errorContacto && <Alert tone="danger">{errorContacto}</Alert>}
              <Button type="submit" block variant="secondary" tactil leftIcon={<Save size={16} />} loading={guardandoContacto} loadingText="Guardando…">
                Guardar contacto
              </Button>
            </Card>

            <Card as="form" variant="editorial" onSubmit={cambiarPassword} aria-labelledby="password-titulo" className="space-y-5">
              <EncabezadoTarjeta id="password-titulo" indice="05" eyebrow="Seguridad" icon={KeyRound}>
                Cambiar contraseña
              </EncabezadoTarjeta>

              <Field label="Contraseña actual" labelVariant="mono">
                <PasswordInput autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
              </Field>
              <Field label="Nueva contraseña" labelVariant="mono" hint="Mínimo 8 caracteres.">
                <PasswordInput autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} toggleLabel="nueva contraseña" />
              </Field>
              <Field label="Repetir la nueva contraseña" labelVariant="mono">
                <PasswordInput autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} toggleLabel="confirmación" />
              </Field>

              {errorPassword && <Alert tone="danger">{errorPassword}</Alert>}

              <Button type="submit" block variant="secondary" tactil loading={guardandoPassword} loadingText="Cambiando…">
                Cambiar contraseña
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
