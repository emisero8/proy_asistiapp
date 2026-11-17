import { useState } from "react";
import { PortadaGenerativa } from "./PortadaGenerativa";

interface Props {
  /** URL de la portada. null/undefined/"" muestra la portada generativa directamente. */
  src?: string | null;
  alt?: string;
  /** Tamaño, bordes y encuadre — se aplica igual a la imagen real y a la portada generativa. */
  className: string;
  loading?: "eager" | "lazy";
  /** Nombre del evento: siembra la portada generativa (patrón + iniciales) cuando no hay imagen. */
  nombre?: string | null;
}

/**
 * Portada de un evento. Si no hay URL, o si la imagen no llega a cargar (link roto, 404, etc.),
 * muestra una **portada generativa** (patrón geométrico determinístico + iniciales) en vez de un
 * ícono de "imagen rota" del navegador o un espacio en blanco.
 */
export function EventoImagen({ src, alt = "", className, loading = "lazy", nombre }: Props) {
  const [fallo, setFallo] = useState(false);

  if (!src || fallo) {
    return <PortadaGenerativa nombre={nombre ?? alt} className={className} alt={alt || undefined} />;
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
