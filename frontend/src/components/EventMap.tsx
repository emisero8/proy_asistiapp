import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, MapPin, Loader2, X } from "lucide-react";

// ── Pin SVG personalizado (evita los problemas de rutas de PNG con bundlers) ──
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
  <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="#6366f1"/>
  <circle cx="12" cy="12" r="5" fill="white"/>
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

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
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
        <label className="text-xs text-muted-foreground block mb-1.5">
          Lugar / dirección *
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
            className="w-full pl-9 pr-9 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpiar dirección"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Dropdown de sugerencias */}
        {abierto && sugerencias.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
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
                <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
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

      <p className="text-[11px] text-muted-foreground">
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
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lng]);

  return (
    <div>
      {/* El mapa completo es clickeable y abre Google Maps */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ver en Google Maps y obtener indicaciones"
        className="group block relative"
      >
        <div
          ref={mapEl}
          className={`w-full ${alto} rounded-xl overflow-hidden border border-border z-0 cursor-pointer`}
        />
        {/* Overlay tooltip al hacer hover */}
        <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[400]">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white text-xs font-semibold shadow-lg">
            <Navigation size={12} />
            Abrir en Google Maps
          </span>
        </div>
      </a>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <Navigation size={13} />
        Cómo llegar
      </a>
    </div>
  );
}
