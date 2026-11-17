import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Ban, CalendarDays, CircleDollarSign, ExternalLink, Pencil, Plus, Search, ShieldCheck, Sparkles, Ticket, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { EventoImagen } from "../../components/EventoImagen";
import { Button, Card, EmptyState, ErrorState, Input, Menu, PageHeader, SelectMenu, Skeleton, StatCard, StatusBadge } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { fmt, formatFecha } from "../../lib/format";
import type { EventoResponseDTO, EstadoEvento, ResumenOrganizadorResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDialog } from "../../lib/dialogs";

/** Días que faltan para una fecha (YYYY-MM-DD), en texto corto. */
function diasHasta(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const dias = Math.round((new Date(y, m - 1, d).getTime() - inicioHoy) / 86400000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

function vendidasDe(ev: EventoResponseDTO): number {
  return ev.tandas.reduce((acc, t) => acc + (t.cupoMaximo - t.cupoDisponible), 0);
}

function capacidadDe(ev: EventoResponseDTO): number {
  return ev.tandas.reduce((acc, t) => acc + t.cupoMaximo, 0);
}

export function OrganizadorDashboardPage() {
  useDocumentTitle("Panel del organizador");
  const { confirm } = useDialog();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [eventos, setEventos] = useState<EventoResponseDTO[] | null>(null);
  const [resumenGeneral, setResumenGeneral] = useState<ResumenOrganizadorResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | EstadoEvento>("todos");

  // Si el panel ya cargó una vez, un fallo del refresco de fondo no lo tapa con el error:
  // se siguen mostrando los últimos datos y el próximo refresco vuelve a intentar.
  const yaCargoRef = useRef(false);

  function cargar() {
    // Dos llamadas en paralelo: la lista (para "Mis eventos") y el resumen calculado en el backend
    Promise.all([
      api.get<EventoResponseDTO[]>("/eventos"),
      api.get<ResumenOrganizadorResponseDTO>("/eventos/resumen").catch(() => null),
    ])
      .then(([lista, resumenApi]) => {
        yaCargoRef.current = true;
        setError(null);
        setEventos(lista);
        setResumenGeneral(resumenApi);
      })
      .catch((e: unknown) => {
        if (yaCargoRef.current) return;
        setError(e instanceof ApiError ? e.message : "No pudimos cargar tu panel.");
      });
  }

  function reintentar() {
    setError(null);
    setEventos(null);
    cargar();
  }

  useEffect(cargar, []);

  // "Tiempo real" liviano: refresca solo mientras la pestaña está visible, para no pegarle
  // al backend de fondo sin que nadie esté mirando el dashboard.
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (!document.hidden) cargar();
    }, 20000);
    return () => clearInterval(intervalo);
  }, []);

  async function cancelarEvento(ev: EventoResponseDTO) {
    const ok = await confirm({
      titulo: "Cancelar evento",
      mensaje: `¿Cancelar "${ev.nombre}"? Se avisa por email a los compradores y no se devuelven créditos.`,
      confirmarTexto: "Cancelar evento",
      cancelarTexto: "No, volver",
      variante: "destructiva",
    });
    if (!ok) return;
    setCancelandoId(ev.id);
    try {
      await api.patch(`/eventos/${ev.id}/cancelar`);
      toast.success(`"${ev.nombre}" cancelado`);
      cargar();
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "No pudimos cancelar el evento.");
    } finally {
      setCancelandoId(null);
    }
  }

  // El backend ya devuelve "Mis eventos" del más nuevo al más antiguo (por fecha de creación):
  // no se reordena acá, solo se filtra manteniendo ese orden.
  const termino = busqueda.trim().toLowerCase();
  const eventosFiltrados = (eventos ?? []).filter((ev) => {
    if (estadoFiltro !== "todos" && ev.estado !== estadoFiltro) return false;
    if (!termino) return true;
    return ev.nombre.toLowerCase().includes(termino) || ev.lugar.toLowerCase().includes(termino);
  });

  const hayEventos = !error && eventos !== null && eventos.length > 0;
  const conVentas = resumenGeneral !== null && resumenGeneral.eventosPublicados > 0;
  const proximo = resumenGeneral?.proximoEvento ?? null;
  const nombre = session?.nombre.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 lg:space-y-8 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Panel del organizador"
        title={nombre ? `Hola, ${nombre}` : "Tu panel"}
        actions={
          hayEventos ? (
            <Button leftIcon={<Plus size={16} />} onClick={() => navigate("/organizador/crear")}>
              Crear evento
            </Button>
          ) : undefined
        }
      />

      {error && <ErrorState title="No pudimos cargar tu panel" description={error} onRetry={reintentar} />}

      {!error && eventos === null && (
        <div className="space-y-6" aria-busy="true">
          <span className="sr-only">Cargando tu panel…</span>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Skeleton className="col-span-2 h-24 rounded-2xl lg:col-span-1" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {!error && eventos !== null && eventos.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="Todavía no creaste ningún evento"
          description="Creá tu primer evento y publicalo en minutos: cargás los datos, armás las tandas y compartís el link."
          action={
            <Button leftIcon={<Plus size={16} />} onClick={() => navigate("/organizador/crear")}>
              Crear evento
            </Button>
          }
        />
      )}

      {/* Resumen: ventas (si hay algo publicado) y créditos. La métrica protagonista va primero
          y en mobile ocupa todo el ancho; el resto, de a dos. */}
      {!error && resumenGeneral && (
        <div className="space-y-3">
          {conVentas && (
            <section aria-label="Ventas" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard
                label="Ingresos totales"
                value={fmt(resumenGeneral.ingresosTotales)}
                icon={TrendingUp}
                emphasis="primary"
                className="col-span-2 lg:col-span-1"
              />
              <StatCard label="Entradas vendidas" value={resumenGeneral.entradasVendidas.toLocaleString("es-AR")} icon={Ticket} />
              <StatCard label="Validadas en puerta" value={resumenGeneral.entradasValidadas.toLocaleString("es-AR")} icon={ShieldCheck} />
            </section>
          )}
          <section aria-label="Créditos y próximo evento" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              label="Próximo evento"
              value={proximo ? diasHasta(proximo.fechaEvento) : "—"}
              hint={proximo?.nombre ?? "Sin eventos próximos"}
              icon={CalendarDays}
              emphasis={proximo ? "highlight" : "none"}
              className="col-span-2 lg:col-span-1"
            />
            <StatCard
              label="Créditos disponibles"
              value={String(resumenGeneral.saldoCreditos)}
              icon={Wallet}
              hint={
                <Link to="/organizador/creditos" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Comprar créditos
                </Link>
              }
            />
            <StatCard label="Créditos usados" value={String(resumenGeneral.creditosConsumidos)} icon={CircleDollarSign} />
          </section>
        </div>
      )}

      {/* Mis eventos */}
      {hayEventos && (
        <Card as="section" padding="none" aria-labelledby="mis-eventos-titulo">
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <h2 id="mis-eventos-titulo" className="flex-none whitespace-nowrap font-display text-base font-bold tracking-tight text-foreground">
              {`Mis eventos (${eventosFiltrados.length}${eventosFiltrados.length !== eventos.length ? ` de ${eventos.length}` : ""})`}
            </h2>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Input
                type="search"
                size="sm"
                surface="sunken"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o lugar…"
                aria-label="Buscar eventos por nombre o lugar"
                leadingIcon={<Search size={15} />}
                className="min-w-0 sm:flex-1 lg:w-64 lg:flex-none"
              />
              <SelectMenu
                size="sm"
                surface="sunken"
                value={estadoFiltro}
                onChange={(v) => setEstadoFiltro(v as typeof estadoFiltro)}
                aria-label="Filtrar por estado"
                className="sm:w-44"
                options={[
                  { value: "todos", label: "Todos los estados" },
                  { value: "Publicado", label: "Publicados" },
                  { value: "Borrador", label: "Borradores" },
                  { value: "Cancelado", label: "Cancelados" },
                ]}
              />
            </div>
          </div>

          {eventosFiltrados.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Ningún evento coincide con la búsqueda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {eventosFiltrados.map((ev) => (
                <FilaEvento
                  key={ev.id}
                  evento={ev}
                  cancelando={cancelandoId === ev.id}
                  onEditar={() => navigate(`/organizador/eventos/${ev.id}/editar`)}
                  onVerPublica={() => navigate(`/eventos/${ev.urlPublica}`)}
                  onCancelar={() => cancelarEvento(ev)}
                />
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

interface FilaEventoProps {
  evento: EventoResponseDTO;
  cancelando: boolean;
  onEditar: () => void;
  onVerPublica: () => void;
  onCancelar: () => void;
}

/**
 * Fila de "Mis eventos". El link al detalle cubre toda la fila ("enlace extendido" con
 * ::after) y el menú de acciones queda por encima (z-10): no hay un control dentro de otro.
 */
function FilaEvento({ evento: ev, cancelando, onEditar, onVerPublica, onCancelar }: FilaEventoProps) {
  const vendidas = vendidasDe(ev);
  const capacidad = capacidadDe(ev);
  const publicado = ev.estado === "Publicado";
  const porcentaje = capacidad > 0 ? Math.min(100, Math.round((vendidas / capacidad) * 100)) : 0;

  const acciones = [
    ...(publicado ? [{ label: "Ver página pública", icon: ExternalLink, onSelect: onVerPublica }] : []),
    ...(ev.estado !== "Cancelado"
      ? [
          { label: "Editar", icon: Pencil, onSelect: onEditar },
          { label: "Cancelar evento", icon: Ban, onSelect: onCancelar, tone: "danger" as const, separatorBefore: true },
        ]
      : []),
  ];

  return (
    <li
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-surface-sunken md:px-5",
        cancelando && "opacity-50",
      )}
    >
      <EventoImagen src={ev.imagenPortadaUrl} alt="" nombre={ev.nombre} className="size-12 flex-none rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={`/organizador/eventos/${ev.id}`}
            className="truncate rounded-sm text-sm font-semibold text-foreground after:absolute after:inset-0 after:content-['']"
          >
            {ev.nombre}
          </Link>
          <StatusBadge tipo="evento" estado={ev.estado} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatFecha(ev.fechaEvento)} · {ev.tandas.length} tanda{ev.tandas.length !== 1 ? "s" : ""}
          {publicado && <span className="md:hidden">{` · ${vendidas} vendidas`}</span>}
        </p>
      </div>

      {/* Ventas del evento: barra de progreso desde tablet. */}
      {publicado && capacidad > 0 && (
        <div className="hidden w-40 flex-none md:block">
          <p className="mb-1 text-right text-xs tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{vendidas}</span> / {capacidad} vendidas
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
      )}

      {acciones.length > 0 && (
        <div className="relative z-10 flex-none">
          <Menu label={`Acciones de ${ev.nombre}`} items={acciones} disabled={cancelando} placement="bottom-end" />
        </div>
      )}
    </li>
  );
}
