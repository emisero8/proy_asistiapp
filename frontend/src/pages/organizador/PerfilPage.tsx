import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Save, KeyRound, AlertCircle } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ImagenPortadaField } from "../../components/ImagenPortadaField";
import type { CambiarPasswordRequestDTO, PerfilRequestDTO, PerfilResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const INPUT =
  "w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";
const LABEL = "text-xs text-muted-foreground block mb-1.5";
const BOTON =
  "w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

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
    <div className="max-w-md lg:max-w-[1800px] mx-auto">
      <div className="px-4 lg:px-8 pt-6 pb-4 border-b border-border bg-background">
        <h2 className="text-lg lg:text-xl font-extrabold text-foreground">Mi perfil</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Tus datos y tu contraseña</p>
      </div>

      {loadError && (
        <div className="mx-4 lg:mx-8 mt-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 flex gap-2">
          <AlertCircle size={16} className="flex-none mt-0.5" /> {loadError}
        </div>
      )}

      {!perfil && !loadError && <div className="mx-4 lg:mx-8 mt-4 h-48 rounded-3xl bg-card border border-border animate-pulse" />}

      {perfil && (
        <div className="px-4 lg:px-8 py-4 lg:py-6 pb-8 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
          <form onSubmit={guardarPerfil} className="rounded-3xl bg-card border border-border p-5 space-y-5">
            <h3 className="text-sm font-bold text-foreground">Datos del perfil</h3>

            <ImagenPortadaField variant="avatar" value={foto} onChange={setFoto} endpoint="/organizador/perfil/foto" />

            <div>
              <label htmlFor="perfil-nombre" className={LABEL}>Nombre</label>
              <input id="perfil-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} className={INPUT} />
            </div>

            <div>
              <label className={LABEL}>Email</label>
              <input value={perfil.email} disabled className={`${INPUT} opacity-60 cursor-not-allowed`} />
              <p className="text-[11px] text-muted-foreground mt-1.5">El email no se puede cambiar.</p>
            </div>

            {errorPerfil && <p className="text-xs text-destructive">{errorPerfil}</p>}

            <button type="submit" disabled={guardandoPerfil} className={BOTON}>
              <Save size={15} /> {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>

          <form onSubmit={cambiarPassword} className="rounded-3xl bg-card border border-border p-5 space-y-5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <KeyRound size={15} className="text-primary" /> Cambiar contraseña
            </h3>

            <div>
              <label htmlFor="pwd-actual" className={LABEL}>Contraseña actual</label>
              <input id="pwd-actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="pwd-nueva" className={LABEL}>Nueva contraseña</label>
              <input id="pwd-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 8 caracteres" className={INPUT} />
            </div>
            <div>
              <label htmlFor="pwd-confirmar" className={LABEL}>Repetir la nueva contraseña</label>
              <input id="pwd-confirmar" type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className={INPUT} />
            </div>

            {errorPassword && <p className="text-xs text-destructive">{errorPassword}</p>}

            <button type="submit" disabled={guardandoPassword} className={BOTON}>
              {guardandoPassword ? "Cambiando…" : "Cambiar contraseña"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
