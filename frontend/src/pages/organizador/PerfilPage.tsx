import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound, Save } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ImagenPortadaField } from "../../components/ImagenPortadaField";
import { Alert, Button, Card, ErrorState, Field, Input, PageHeader, PasswordInput, Skeleton } from "../../components/ui";
import type { CambiarPasswordRequestDTO, PerfilRequestDTO, PerfilResponseDTO } from "../../lib/types";
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
      <PageHeader title="Mi perfil" description="Tus datos y tu contraseña." />

      {loadError && <ErrorState title="No pudimos cargar tu perfil" description={loadError} />}

      {!perfil && !loadError && (
        <div className="grid gap-6 md:grid-cols-2" aria-busy="true">
          <span className="sr-only">Cargando tu perfil…</span>
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {perfil && (
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <Card as="form" onSubmit={guardarPerfil} aria-labelledby="perfil-titulo" className="space-y-5">
            <h2 id="perfil-titulo" className="font-display text-base font-bold tracking-tight text-foreground">
              Datos del perfil
            </h2>

            <ImagenPortadaField variant="avatar" value={foto} onChange={setFoto} endpoint="/organizador/perfil/foto" />

            <Field label="Nombre">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} autoComplete="name" />
            </Field>

            <Field label="Email" hint="El email no se puede cambiar.">
              <Input value={perfil.email} disabled readOnly />
            </Field>

            {errorPerfil && <Alert tone="danger">{errorPerfil}</Alert>}

            <Button type="submit" block leftIcon={<Save size={16} />} loading={guardandoPerfil} loadingText="Guardando…">
              Guardar cambios
            </Button>
          </Card>

          <Card as="form" onSubmit={cambiarPassword} aria-labelledby="password-titulo" className="space-y-5">
            <h2 id="password-titulo" className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-foreground">
              <KeyRound size={16} aria-hidden="true" className="text-secondary" />
              Cambiar contraseña
            </h2>

            <Field label="Contraseña actual">
              <PasswordInput autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
            </Field>
            <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">
              <PasswordInput autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} toggleLabel="nueva contraseña" />
            </Field>
            <Field label="Repetir la nueva contraseña">
              <PasswordInput autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} toggleLabel="confirmación" />
            </Field>

            {errorPassword && <Alert tone="danger">{errorPassword}</Alert>}

            <Button type="submit" block variant="secondary" loading={guardandoPassword} loadingText="Cambiando…">
              Cambiar contraseña
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
