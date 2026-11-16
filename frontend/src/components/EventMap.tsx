import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, MapPin, Loader2, X } from "lucide-react";
import { useDismiss } from "../lib/useDismiss";

// ── Pin SVG personalizado (evita los problemas de rutas de PNG con bundlers) ──
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
  <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" style="fill: var(--accent)"/>
  <circle cx="12" cy="12" r="5" style="fill: var(--accent-foreground)"/>
</svg>`;

const PIN_ICON = L.divIcon({
  html: PIN_SVG,
  className: "",
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
});

/** Centro por defecto: Obelisco, CABA. */
const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];

export interface Coords {
  lat: number;
  lng: number;
}

interface Sugerencia {
  placeId: string;
  nombre: string;
  lat: number;
  lng: number;
}

function linkComoLlegar(c: Coords): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
}

/**
 * Arma una etiqueta corta: "Nombre / Calle 123, Ciudad, Provincia"
 * Si la dirección tiene un nombre de lugar (boliche, club, etc.) lo incluye primero.
 */
function formatearDireccion(
  address: NominatimAddress,
  fallback: string,
  nombreLugar?: string,
): string {
  const calle = address.road ?? address.pedestrian ?? address.footway ?? address.neighbourhood ?? address.suburb ?? "";
  const numero = address.house_number ? ` ${address.house_number}` : "";
  const ciudad = address.city ?? address.town ?? address.village ?? address.municipality ?? "";
  const provincia = address.state ?? "";

  const lineaCalle = calle ? `${calle}${numero}` : "";
  // Si hay nombre de lugar (amenity/shop/etc.) y es distinto a la calle, lo ponemos delante
  const prefijo = nombreLugar && nombreLugar !== lineaCalle ? nombreLugar : "";

  const partes = [prefijo, lineaCalle, ciudad, provincia].filter(Boolean);
  return partes.length >= 2 ? partes.join(", ") : fallback;
}

// ─────────────────────────────────────────────────────────────
// MapPicker — para crear/editar un evento
// ─────────────────────────────────────────────────────────────

export function MapPicker({
  venueValue,
  onVenueChange,
  value,
  onChange,
}: {
  venueValue: string;
  onVenueChange: (v: string) => void;
  value: Coords | null;
  onChange: (c: Coords | null) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [inputText, setInputText] = useState(venueValue);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizar inputText si el padre cambia venueValue (e.g. carga inicial en edición)
  useEffect(() => {
    setInputText(venueValue);
  }, [venueValue]);

  // Cerrar las sugerencias de dirección al tocar afuera o con Escape
  useDismiss(abierto, () => setAbierto(false), [containerRef]);

  // init mapa una sola vez
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const start: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
    const map = L.map(mapEl.current).setView(start, value ? 15 : 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    if (value) ponerMarcador(value.lat, value.lng);
    // Recalcula el tamaño cuando el contenedor ya tiene su layout. Se cancela al desmontar:
    // si el mapa se removía antes de los 100 ms, Leaflet fallaba ("_leaflet_pos" de undefined).
    const timer = setTimeout(() => map.invalidateSize({ animate: false }), 100);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ponerMarcador(lat: number, lng: number) {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const m = L.marker([lat, lng], { icon: PIN_ICON, draggable: true }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = m;
    }
  }

  const buscarSugerencias = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }
    setBuscando(true);
    try {
      // countrycodes → Sudamérica | namedetails=1 → captura nombres de lugares/negocios
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&namedetails=1&countrycodes=ar,bo,br,cl,co,ec,gy,pe,py,sr,uy,ve&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "es", "User-Agent": "AsistiApp/1.0" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as Array<{
        place_id: string;
        lat: string;
        lon: string;
        display_name: string;
        address: NominatimAddress;
        namedetails?: { name?: string; "name:es"?: string };
      }>;
      const sugs: Sugerencia[] = data.map((d) => ({
        placeId: String(d.place_id),
        nombre: formatearDireccion(
          d.address,
          d.display_name,
          d.namedetails?.["name:es"] ?? d.namedetails?.name,
        ),
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
      }));
      setSugerencias(sugs);
      setAbierto(sugs.length > 0);
    } catch {
      setSugerencias([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  function handleInputChange(val: string) {
    setInputText(val);
    onVenueChange(val);
    // Debounce la búsqueda 350ms para no spamear Nominatim
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarSugerencias(val), 350);
  }

  function seleccionarSugerencia(s: Sugerencia) {
    setInputText(s.nombre);
    onVenueChange(s.nombre);
    setSugerencias([]);
    setAbierto(false);
    mapRef.current?.setView([s.lat, s.lng], 16);
    ponerMarcador(s.lat, s.lng);
    onChange({ lat: s.lat, lng: s.lng });
  }

  function quitarUbicacion() {
    onChange(null);
    markerRef.current?.remove();
    markerRef.current = null;
    setInputText("");
    onVenueChange("");
    setSugerencias([]);
    setAbierto(false);
  }

  return (
    <div className="space-y-2">
      {/* ── Input con autocompletado ── */}
      <div ref={containerRef} className="relative">
        <label htmlFor="venue-autocomplete" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Lugar / dirección
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        </label>
        <div className="relative flex items-center">
          <MapPin
            size={15}
            className="absolute left-3 text-muted-foreground pointer-events-none"
          />
          <input
            id="venue-autocomplete"
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => sugerencias.length > 0 && setAbierto(true)}
            placeholder="Ej: Pavón 123, Santa Fe"
            autoComplete="off"
            required
            aria-describedby="venue-ayuda"
            className="h-11 w-full rounded-xl border border-border-strong bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-(--duration-fast) ease-standard focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
          {buscando && (
            <Loader2
              size={15}
              className="absolute right-3 text-muted-foreground animate-spin pointer-events-none"
            />
          )}
          {!buscando && inputText && (
            <button
              type="button"
              onClick={quitarUbicacion}
              className="absolute right-1.5 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Limpiar dirección"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Dropdown de sugerencias */}
        {abierto && sugerencias.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-[9999] mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-overlay"
          >
            {sugerencias.map((s) => (
              <li
                key={s.placeId}
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault(); // evita que el input pierda focus antes del click
                  seleccionarSugerencia(s);
                }}
                className="flex items-start gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0"
              >
                <MapPin size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2 text-foreground leading-snug">{s.nombre}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Mapa ── */}
      <div className="relative">
        <div
          ref={mapEl}
          className="w-full h-56 rounded-xl overflow-hidden border border-border z-0"
        />
        {value && (
          <button
            type="button"
            onClick={quitarUbicacion}
            className="absolute top-2 right-2 z-[400] px-2.5 py-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border text-xs text-muted-foreground hover:text-foreground font-medium transition-colors shadow-sm"
          >
            Quitar pin
          </button>
        )}
      </div>

      <p id="venue-ayuda" className="text-xs text-muted-foreground">
        {value
          ? "✓ Ubicación marcada. Podés arrastrar el pin para ajustar el punto exacto."
          : "Escribí la dirección para ver sugerencias o tocá el mapa para marcar el lugar."}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MapView — solo lectura, para el comprador y el organizador
// ─────────────────────────────────────────────────────────────

export function MapView({ coords, lugar, alto = "h-52" }: { coords: Coords; lugar?: string; alto?: string }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapsUrl = linkComoLlegar(coords);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    // Interacción deshabilitada: el mapa entero es un link a Google Maps
    const map = L.map(mapEl.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    }).setView([coords.lat, coords.lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    L.marker([coords.lat, coords.lng], { icon: PIN_ICON }).addTo(map);
    mapRef.current = map;
    // Recalcula el tamaño cuando el contenedor ya tiene su layout. Se cancela al desmontar:
    // si el mapa se removía antes de los 100 ms, Leaflet fallaba ("_leaflet_pos" de undefined).
    const timer = setTimeout(() => map.invalidateSize({ animate: false }), 100);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lng]);

  return (
    <div>
      {/* El mapa completo es clickeable con el mouse. Para teclado y lectores de pantalla es
          decorativo: el mismo destino lo ofrece "Cómo llegar" (antes había dos links iguales). */}
      <div className="group relative">
        <div ref={mapEl} className={`w-full ${alto} z-0 overflow-hidden rounded-xl border border-border`} />
        {/* Capa clickeable encima del mapa (solo mouse: para teclado y lectores está "Cómo llegar").
            Va por debajo de los controles de Leaflet (z 800), así la atribución sigue accesible. */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 z-[450] flex items-center justify-center rounded-xl"
        >
          <span className="flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-overlay backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <Navigation size={12} />
            Abrir en Google Maps
          </span>
        </a>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <Navigation size={13} aria-hidden="true" />
        Cómo llegar
        <span className="sr-only">{lugar ? ` a ${lugar}` : ""} (abre Google Maps)</span>
      </a>
    </div>
  );
}
