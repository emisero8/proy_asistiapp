import { useRef, useState } from "react";
import { ImagePlus, Loader2, CircleX, UserRound } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { ImagenSubidaResponseDTO } from "../lib/types";

const TIPOS_ACEPTADOS = "image/jpeg,image/png,image/webp";
const TAMANO_MAXIMO_MB = 5;

interface Props {
  /** URL actual de la imagen (la que devuelve Cloudinary o la que ya tenía el registro). */
  value: string;
  onChange: (url: string) => void;
  /** Endpoint de subida del backend. Portadas: /eventos/imagenes (default). Perfil: /organizador/perfil/foto. */
  endpoint?: string;
  /** "portada" = banner ancho de evento; "avatar" = foto circular de perfil. */
  variant?: "portada" | "avatar";
  label?: string;
}

/**
 * Campo para cargar una imagen. El archivo se sube al backend, que lo aloja en Cloudinary,
 * y la URL devuelta se guarda en el formulario.
 */
export function ImagenPortadaField({
  value,
  onChange,
  endpoint = "/eventos/imagenes",
  variant = "portada",
  label = "Imagen de portada",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esAvatar = variant === "avatar";

  const handleArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);
    if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      setError(`La imagen no puede superar los ${TAMANO_MAXIMO_MB} MB.`);
      return;
    }
    const formData = new FormData();
    formData.append("archivo", archivo);
    setSubiendo(true);
    try {
      const res = await api.upload<ImagenSubidaResponseDTO>(endpoint, formData);
      onChange(res.url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos subir la imagen. Intentá nuevamente.");
    } finally {
      setSubiendo(false);
      // Limpia el input para poder volver a elegir el mismo archivo si hace falta
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const botonLabel = subiendo
    ? "Subiendo…"
    : value
      ? esAvatar
        ? "Cambiar foto"
        : "Cambiar imagen"
      : esAvatar
        ? "Subir foto"
        : "Cargar imagen";

  const boton = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="inline-flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {subiendo ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        {botonLabel}
      </button>
      {value && !subiendo && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <CircleX size={14} /> Quitar
        </button>
      )}
    </div>
  );

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={TIPOS_ACEPTADOS}
      className="hidden"
      onChange={(e) => handleArchivo(e.target.files?.[0])}
    />
  );

  const mensajes = (
    <>
      <p className="text-[11px] text-muted-foreground mt-1.5">JPG, PNG o WEBP de hasta {TAMANO_MAXIMO_MB} MB.</p>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </>
  );

  if (esAvatar) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center flex-none">
          {value ? (
            <img src={value} alt="Foto de perfil" className="w-full h-full object-cover" />
          ) : (
            <UserRound size={28} className="text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          {boton}
          {input}
          {mensajes}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
      {boton}
      {input}
      {mensajes}
      {value && <img src={value} alt="preview" className="w-full h-32 object-cover rounded-xl mt-2 bg-muted" />}
    </div>
  );
}
