import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, Megaphone } from "lucide-react";
import { cn } from "../lib/cn";
import { useDismiss } from "../lib/useDismiss";
import { useFloatingPosition } from "../lib/useFloatingPosition";
import { api } from "../lib/api";
import type { NotificacionResponseDTO } from "../lib/types";
import { Button, ErrorState, Skeleton, Tooltip } from "./ui";

const POLL_MS = 30_000;

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

type EstadoLista = { tipo: "cargando" } | { tipo: "error" } | { tipo: "ok"; items: NotificacionResponseDTO[] };

interface NotificationBellProps {
  /**
   * Hacia dónde abre el panel: `bottom-start` desde el sidebar de desktop (abre hacia la
   * derecha), `bottom-end` desde la barra superior de mobile (abre hacia la izquierda).
   * El panel vive en un portal y nunca se sale del viewport.
   */
  placement?: "bottom-start" | "bottom-end";
}

/**
 * Campanita de notificaciones in-app — para los roles con shell propio (Organizador, Admin).
 * El Comprador y el Staff (pantallas de una sola tarea) no la tienen.
 */
export function NotificationBell({ placement = "bottom-end" }: NotificationBellProps) {
  const [abierto, setAbierto] = useState(false);
  const [cantidadNoLeidas, setCantidadNoLeidas] = useState(0);
  const [lista, setLista] = useState<EstadoLista>({ tipo: "cargando" });
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const tituloId = useId();
  const estilo = useFloatingPosition(botonRef, panelRef, abierto, placement, 8);

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

  // Click afuera cierra; Escape cierra y devuelve el foco a la campanita.
  useDismiss(abierto, () => setAbierto(false), [botonRef, panelRef], { escape: false });
  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setAbierto(false);
      botonRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [abierto]);

  function cargarLista() {
    setLista({ tipo: "cargando" });
    api
      .get<NotificacionResponseDTO[]>("/notificaciones")
      .then((items) => setLista({ tipo: "ok", items }))
      // Antes un error dejaba el skeleton para siempre (o mostraba "no tenés notificaciones",
      // que no era cierto): ahora se dice que falló y se puede reintentar.
      .catch(() => setLista({ tipo: "error" }));
  }

  function toggle() {
    const next = !abierto;
    setAbierto(next);
    if (next) cargarLista();
  }

  function actualizarItems(f: (items: NotificacionResponseDTO[]) => NotificacionResponseDTO[]) {
    setLista((l) => (l.tipo === "ok" ? { tipo: "ok", items: f(l.items) } : l));
  }

  async function marcarTodasLeidas() {
    try {
      await api.patch("/notificaciones/leer-todas");
      setCantidadNoLeidas(0);
      actualizarItems((items) => items.map((n) => ({ ...n, leida: true })));
    } catch {
      // best-effort — si falla, el usuario puede reintentar
    }
  }

  async function marcarLeida(n: NotificacionResponseDTO) {
    if (n.leida) return;
    actualizarItems((items) => items.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    setCantidadNoLeidas((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notificaciones/${n.id}/leer`);
    } catch {
      // best-effort
    }
  }

  const etiqueta = cantidadNoLeidas > 0 ? `Notificaciones (${cantidadNoLeidas} sin leer)` : "Notificaciones";

  return (
    <>
      <Tooltip content="Notificaciones">
        <button
          ref={botonRef}
          type="button"
          onClick={toggle}
          aria-label={etiqueta}
          aria-expanded={abierto}
          aria-controls={abierto ? panelId : undefined}
          className={cn(
            "relative inline-flex size-9 flex-none items-center justify-center rounded-full text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-foreground",
            abierto && "bg-muted text-foreground",
          )}
        >
          <Bell size={16} aria-hidden="true" />
          {cantidadNoLeidas > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-bold leading-none text-destructive-foreground ring-2 ring-background"
            >
              {cantidadNoLeidas > 9 ? "9+" : cantidadNoLeidas}
            </span>
          )}
        </button>
      </Tooltip>

      {abierto &&
        createPortal(
          <section
            ref={panelRef}
            id={panelId}
            aria-labelledby={tituloId}
            style={estilo}
            className="z-[90] flex max-h-[min(70vh,32rem)] w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-overlay animate-scale-in"
          >
            <div className="flex flex-none items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 id={tituloId} className="text-sm font-bold text-foreground">
                Notificaciones
              </h2>
              {cantidadNoLeidas > 0 && (
                <Button variant="link" size="sm" onClick={marcarTodasLeidas}>
                  Marcar todas como leídas
                </Button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {lista.tipo === "cargando" && (
                <div className="space-y-2 p-4" aria-busy="true">
                  <span className="sr-only">Cargando notificaciones…</span>
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 rounded-xl" />
                  ))}
                </div>
              )}

              {lista.tipo === "error" && (
                <ErrorState variant="plain" title="No pudimos cargar tus notificaciones" onRetry={cargarLista} />
              )}

              {lista.tipo === "ok" && lista.items.length === 0 && (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <BellOff size={20} aria-hidden="true" className="mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No tenés notificaciones</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Acá vas a ver los avisos del sistema y del administrador.</p>
                </div>
              )}

              {lista.tipo === "ok" && lista.items.length > 0 && (
                <ul className="divide-y divide-border">
                  {lista.items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => marcarLeida(n)}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3 text-left transition-colors duration-(--duration-fast) hover:bg-muted",
                          !n.leida && "bg-primary/[0.06]",
                        )}
                      >
                        <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {n.origen === "Admin" ? <Megaphone size={13} aria-hidden="true" /> : <Bell size={13} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm leading-snug", n.leida ? "font-medium text-muted-foreground" : "font-semibold text-foreground")}>
                            {n.titulo}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground line-clamp-2">{n.mensaje}</span>
                          <span className="mt-1 block text-2xs text-muted-foreground">{formatearFecha(n.fechaCreacion)}</span>
                        </span>
                        {!n.leida && (
                          <>
                            <span aria-hidden="true" className="mt-1.5 size-2 flex-none rounded-full bg-primary" />
                            <span className="sr-only">(sin leer)</span>
                          </>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>,
          document.body,
        )}
    </>
  );
}
