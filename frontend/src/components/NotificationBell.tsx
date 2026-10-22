import { useEffect, useRef, useState } from "react";
import { Bell, Megaphone } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { NotificacionResponseDTO } from "../lib/types";

const POLL_MS = 30_000;

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Campanita de notificaciones in-app — para cualquier rol logueado con chrome propio
 * (Organizador, Admin). El Comprador y el Staff (pantallas de una sola tarea) no la tienen.
 */
export function NotificationBell() {
  const [abierto, setAbierto] = useState(false);
  const [cantidadNoLeidas, setCantidadNoLeidas] = useState(0);
  const [notificaciones, setNotificaciones] = useState<NotificacionResponseDTO[] | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  function cargarCantidad() {
    api
      .get<{ cantidad: number }>("/notificaciones/no-leidas/cantidad")
      .then((r) => setCantidadNoLeidas(r.cantidad))
      .catch(() => {});
  }

  useEffect(() => {
    cargarCantidad();
    const interval = setInterval(cargarCantidad, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    if (abierto) document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [abierto]);

  function toggle() {
    const next = !abierto;
    setAbierto(next);
    if (next) {
      api
        .get<NotificacionResponseDTO[]>("/notificaciones")
        .then(setNotificaciones)
        .catch((e: unknown) => {
          if (!(e instanceof ApiError)) setNotificaciones([]);
        });
    }
  }

  async function marcarTodasLeidas() {
    try {
      await api.patch("/notificaciones/leer-todas");
      setCantidadNoLeidas(0);
      setNotificaciones((ns) => ns?.map((n) => ({ ...n, leida: true })) ?? null);
    } catch {
      // best-effort — si falla, el usuario puede reintentar
    }
  }

  async function marcarLeida(n: NotificacionResponseDTO) {
    if (n.leida) return;
    setNotificaciones((ns) => ns?.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) ?? null);
    setCantidadNoLeidas((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notificaciones/${n.id}/leer`);
    } catch {
      // best-effort
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        onClick={toggle}
        title="Notificaciones"
        aria-label="Notificaciones"
        className="relative h-9 w-9 rounded-full bg-card border border-border shadow-lg shadow-black/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <Bell size={15} />
        {cantidadNoLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
            {cantidadNoLeidas > 9 ? "9+" : cantidadNoLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute top-11 right-0 w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-xl shadow-black/20 z-50">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Notificaciones</p>
            {cantidadNoLeidas > 0 && (
              <button onClick={marcarTodasLeidas} className="text-[11px] font-semibold text-primary hover:underline">
                Marcar todas como leídas
              </button>
            )}
          </div>

          {notificaciones === null ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-background/60 animate-pulse" />
              ))}
            </div>
          ) : notificaciones.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">No tenés notificaciones todavía.</p>
          ) : (
            <div className="divide-y divide-border">
              {notificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => marcarLeida(n)}
                  className={`w-full text-left px-4 py-3 flex gap-2.5 transition-colors hover:bg-muted ${!n.leida ? "bg-primary/5" : ""}`}
                >
                  {n.origen === "Admin" && <Megaphone size={13} className="text-primary flex-none mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-tight ${!n.leida ? "font-bold text-foreground" : "font-semibold text-muted-foreground"}`}>
                      {n.titulo}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.mensaje}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{formatearFecha(n.fechaCreacion)}</p>
                  </div>
                  {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-none mt-1.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
