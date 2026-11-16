import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { DatePicker } from "../../components/DatePicker";
import { TimePicker } from "../../components/TimePicker";
import { MapPicker, type Coords } from "../../components/EventMap";
import { ImagenPortadaField } from "../../components/ImagenPortadaField";
import { Card, Field, IconButton, Input, Textarea } from "../../components/ui";
import { cn } from "../../lib/cn";

/**
 * Campos compartidos por "Crear evento" (Wizard) y "Editar evento": antes cada pantalla tenía
 * su copia, con labels sin asociar (un lector de pantalla no sabía qué era cada input) y
 * colores de error literales. Acá cada control va en un `<Field>`.
 */

interface DatosEventoCamposProps {
  nombre: string;
  onNombre: (v: string) => void;
  descripcion: string;
  onDescripcion: (v: string) => void;
  fecha: string;
  onFecha: (v: string) => void;
  hora: string;
  onHora: (v: string) => void;
  lugar: string;
  onLugar: (v: string) => void;
  coords: Coords | null;
  onCoords: (c: Coords | null) => void;
  imagen: string;
  onImagen: (v: string) => void;
  /** Fecha mínima elegible (hoy). */
  hoy: string;
  fechaEnPasado: boolean;
}

export function DatosEventoCampos(p: DatosEventoCamposProps) {
  return (
    <div className="space-y-5">
      <Field label="Nombre del evento" required>
        <Input value={p.nombre} onChange={(e) => p.onNombre(e.target.value)} placeholder="Festival de Jazz al Aire Libre" maxLength={150} />
      </Field>
      <Field label="Descripción" hint="Lo que van a leer los compradores en la página del evento.">
        <Textarea
          value={p.descripcion}
          onChange={(e) => p.onDescripcion(e.target.value)}
          rows={4}
          placeholder="Describí el evento para los compradores…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha" required error={p.fechaEnPasado ? "La fecha no puede estar en el pasado." : undefined}>
          <DatePicker value={p.fecha} onChange={p.onFecha} min={p.hoy} error={p.fechaEnPasado} />
        </Field>
        <Field label="Hora" required>
          <TimePicker value={p.hora} onChange={p.onHora} />
        </Field>
      </div>
      <MapPicker venueValue={p.lugar} onVenueChange={p.onLugar} value={p.coords} onChange={p.onCoords} />
      <ImagenPortadaField value={p.imagen} onChange={p.onImagen} />
    </div>
  );
}

export interface TandaValores {
  nombre: string;
  precio: string;
  cupoMaximo: string;
  desde: string;
  hasta: string;
}

interface TandaCardProps {
  titulo: ReactNode;
  valores: TandaValores;
  onCambio: (campo: keyof TandaValores, valor: string) => void;
  /** Fecha del evento: tope de "Venta desde/hasta". */
  fechaEvento: string;
  error?: string | null;
  /** Sin `onEliminar` no se muestra el botón (ej. la única tanda del Wizard). */
  onEliminar?: () => void;
  etiquetaEliminar: string;
  eliminarDeshabilitado?: boolean;
  /** Estado de la tanda ("3 vendidas · 7 disponibles"), arriba del pie. */
  detalle?: ReactNode;
  /** Acciones de la tarjeta (ej. "Guardar tanda" en Editar). */
  pie?: ReactNode;
}

/** Tarjeta de una tanda: nombre, precio, cupo y ventana de venta. */
export function TandaCard({ titulo, valores, onCambio, fechaEvento, error, onEliminar, etiquetaEliminar, eliminarDeshabilitado, detalle, pie }: TandaCardProps) {
  return (
    <Card as="article" padding="none" className={cn("space-y-4 p-4 md:p-5", error && "border-destructive/50")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">{titulo}</h3>
        {onEliminar && (
          <IconButton
            label={etiquetaEliminar}
            icon={<Trash2 size={16} />}
            variant="danger"
            size="sm"
            disabled={eliminarDeshabilitado}
            onClick={onEliminar}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_8rem]">
        <Field label="Nombre" required>
          <Input surface="sunken" value={valores.nombre} onChange={(e) => onCambio("nombre", e.target.value)} placeholder="Anticipada 1" />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <Field label="Precio ($)" required>
            <Input surface="sunken" value={valores.precio} onChange={(e) => onCambio("precio", e.target.value)} placeholder="12000" inputMode="numeric" />
          </Field>
          <Field label="Cupo" required>
            <Input surface="sunken" value={valores.cupoMaximo} onChange={(e) => onCambio("cupoMaximo", e.target.value)} placeholder="200" inputMode="numeric" />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Venta desde">
          <DatePicker value={valores.desde} onChange={(v) => onCambio("desde", v)} max={fechaEvento || undefined} allowClear />
        </Field>
        <Field label="Venta hasta">
          <DatePicker value={valores.hasta} onChange={(v) => onCambio("hasta", v)} max={fechaEvento || undefined} allowClear />
        </Field>
      </div>

      {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      {pie}
    </Card>
  );
}
