import { useState } from "react";
import { ImageOff } from "lucide-react";

interface Props {
  /** URL de la portada. null/undefined/"" muestra el placeholder directamente. */
  src?: string | null;
  alt?: string;
  /** Tamaño, bordes y encuadre — se aplica igual a la imagen real y al placeholder. */
  className: string;
  loading?: "eager" | "lazy";
  /** Tamaño del ícono del placeholder. Ajustar según el tamaño del contenedor. */
  iconSize?: number;
}

/**
 * Portada de un evento. Si no hay URL, o si la imagen no llega a cargar (link roto,
 * 404, etc.), muestra un placeholder con ícono en vez de un ícono de "imagen rota"
 * del navegador o un espacio en blanco.
 */
export function EventoImagen({ src, alt = "", className, loading = "lazy", iconSize = 20 }: Props) {
  const [fallo, setFallo] = useState(false);

  if (!src || fallo) {
    return (
      <div className={`${className} bg-gradient-to-br from-primary/25 via-card to-background flex items-center justify-center`}>
        <ImageOff size={iconSize} className="text-primary/40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      onError={() => setFallo(true)}
    />
  );
}
