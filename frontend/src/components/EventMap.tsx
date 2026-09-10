import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { Navigation, Search, Loader2 } from "lucide-react";

// Leaflet no resuelve bien las rutas de sus íconos con bundlers — se las damos a mano.
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

/** Centro por defecto: Obelisco, CABA. */
const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];

export interface Coords {
  lat: number;
  lng: number;
}

async function geocodificar(query: string): Promise<(Coords & { nombre: string }) | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), nombre: data[0].display_name };
}

function linkComoLlegar(c: Coords): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
}

// ─────────────────────────────────────────────────────────────
// MapPicker — para crear/editar un evento
// ─────────────────────────────────────────────────────────────

export function MapPicker({
  direccion,
  value,
  onChange,
}: {
  direccion: string;
  value: Coords | null;
  onChange: (c: Coords | null) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // init mapa una sola vez
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const start: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
    const map = L.map(mapEl.current).setView(start, value ? 15 : 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      ponerMarcador(e.latlng.lat, e.latlng.lng);
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    if (value) ponerMarcador(value.lat, value.lng);
    // fix de tamaño cuando el contenedor entra en layout
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
      const m = L.marker([lat, lng], { draggable: true }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = m;
    }
  }

  async function buscar() {
    const q = direccion.trim();
    if (!q) {
      setMsg("Escribí primero la dirección en el campo de arriba.");
      return;
    }
    setBuscando(true);
    setMsg(null);
    try {
      const r = await geocodificar(q);
      if (!r) {
        setMsg("No encontramos esa dirección. Ajustá el texto o marcá el punto en el mapa.");
        return;
      }
      mapRef.current?.setView([r.lat, r.lng], 16);
      ponerMarcador(r.lat, r.lng);
      onChange({ lat: r.lat, lng: r.lng });
      setMsg(r.nombre);
    } catch {
      setMsg("No se pudo buscar la dirección ahora. Marcá el punto en el mapa.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={buscar}
          disabled={buscando}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {buscando ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          Buscar dirección en el mapa
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              markerRef.current?.remove();
              markerRef.current = null;
              setMsg(null);
            }}
            className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors"
          >
            Quitar ubicación
          </button>
        )}
      </div>
      <div ref={mapEl} className="w-full h-56 rounded-xl overflow-hidden border border-border z-0" />
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {msg ?? "Buscá la dirección o tocá el mapa para marcar el lugar exacto. Podés arrastrar el pin para ajustarlo."}
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

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { scrollWheelZoom: false, zoomControl: true, dragging: true }).setView(
      [coords.lat, coords.lng],
      15,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    L.marker([coords.lat, coords.lng]).addTo(map).bindPopup(lugar ?? "Lugar del evento");
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
      <div ref={mapEl} className={`w-full ${alto} rounded-xl overflow-hidden border border-border z-0`} />
      <a
        href={linkComoLlegar(coords)}
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
