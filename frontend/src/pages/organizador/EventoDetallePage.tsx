import { useEffect, useMemo, useState } from "react";
import { EventoImagen } from "../../components/EventoImagen";
import { Link, useNavigate, useParams } from "react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Ban, CreditCard, Download, ExternalLink, FilePen, Pencil, Search, ShieldCheck, Store, Ticket, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton, StatCard, StatusBadge, claseBoton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { fmt, formatFecha, formatHora } from "../../lib/format";
import { MapView } from "../../components/EventMap";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDialog } from "../../lib/dialogs";
import type { EntradaResponseDTO, EventoMetricasResponseDTO, EventoResponseDTO } from "../../lib/types";

/** Barras del gráfico por tanda: tokens de gráficos (se adaptan al tema), nunca hex. */
const COLORES_TANDA = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function OrganizadorEventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [evento, setEvento] = useState<EventoResponseDTO | null>(null);
  const [metricas, setMetricas] = useState<EventoMetricasResponseDTO | null>(null);
  const [entradas, setEntradas] = useState<EntradaResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  useDocumentTitle(evento?.nombre);
  const { confirm } = useDialog();

  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "Pagada" | "Usada" | "Online" | "Manual">("todas");
  // Generar el Excel tarda (se descarga ExcelJS la primera vez): el botón muestra que está trabajando.
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      await exportarExcel();
    } finally {
      setExportando(false);
    }
  }

  function cargar() {
    if (!id) return;
    api
      .get<EventoResponseDTO>(`/eventos/${id}`)
      .then(async (ev) => {
        setEvento(ev);
        if (ev.estado !== "Borrador") {
          const [m, ent] = await Promise.all([
            api.get<EventoMetricasResponseDTO>(`/eventos/${id}/metricas`),
            api.get<EntradaResponseDTO[]>(`/tickets/evento/${id}`),
          ]);
          setMetricas(m);
          setEntradas([...ent].sort((a, b) => b.fechaCompra.localeCompare(a.fechaCompra)));
        } else {
          setEntradas([]);
        }
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar el evento."));
  }

  useEffect(cargar, [id]);

  async function cancelarEvento() {
    if (!evento) return;
    const ok = await confirm({
      titulo: "Cancelar evento",
      mensaje: `¿Cancelar "${evento.nombre}"? Se avisa por email a los compradores y no se devuelven créditos.`,
      confirmarTexto: "Cancelar evento",
      cancelarTexto: "No, volver",
      variante: "destructiva",
    });
    if (!ok) return;
    setCancelando(true);
    try {
      await api.patch(`/eventos/${evento.id}/cancelar`);
      toast.success("Evento cancelado");
      cargar();
    } catch (e: unknown) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos cancelar el evento.");
    } finally {
      setCancelando(false);
    }
  }

  async function exportarExcel() {
    if (!entradasFiltradas || entradasFiltradas.length === 0) return;

    try {
      // Carga ExcelJS de forma lazy para no inflar el bundle inicial
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "AsistíAPP";
      wb.created = new Date();

      const nombreEvento = evento?.nombre ?? "evento";
      // Excel prohíbe \ / * ? : [ ] en el nombre de la hoja (y no puede quedar vacío ni pasar los 31 caracteres)
      const nombreHoja = nombreEvento.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || "evento";
      const ws = wb.addWorksheet(nombreHoja);
      // Encabezado fijo: con muchas entradas, la fila 1 sigue visible al scrollear
      ws.views = [{ state: "frozen", ySplit: 1 }];

      // Definición de columnas con ancho fijo. precio/fechas llevan numFmt para que Excel
      // los trate como número/fecha de verdad (ordenables, filtrables, sumables) y no como texto.
      ws.columns = [
        { header: "ID",           key: "id",          width: 8  },
        { header: "Comprador",    key: "comprador",   width: 30 },
        { header: "Email",        key: "email",       width: 34 },
        { header: "Tanda",        key: "tanda",       width: 22 },
        { header: "Precio",       key: "precio",      width: 14, style: { numFmt: '"$"#,##0' } },
        { header: "Canal",        key: "canal",       width: 12 },
        { header: "Estado",       key: "estado",      width: 13 },
        { header: "Fecha Compra", key: "fechaCompra", width: 20, style: { numFmt: "dd/mm/yyyy hh:mm" } },
        { header: "Fecha Uso",    key: "fechaUso",    width: 20, style: { numFmt: "dd/mm/yyyy hh:mm" } },
      ];

      // ── Cabecera ─────────────────────────────────────────────
      const headerRow = ws.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D3A5C" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = { bottom: { style: "medium", color: { argb: "FF9CADD3" } } };
      });

      // ── Filas de datos ───────────────────────────────────────
      entradasFiltradas.forEach((e) => {
        const row = ws.addRow({
          id:          e.id,
          comprador:   e.nombreComprador,
          email:       e.emailComprador,
          tanda:       e.nombreTanda,
          precio:      e.precioTanda ?? 0,
          canal:       e.canalVenta,
          estado:      e.estado,
          fechaCompra: new Date(e.fechaCompra),
          fechaUso:    e.fechaUso ? new Date(e.fechaUso) : "",
        });
        row.height = 22;
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: "middle" };
          cell.font = { name: "Calibri", size: 10 };
        });
      });

      // Autofiltro sobre encabezado + datos, sin la fila de TOTAL (si se incluyera, Excel
      // la trataría como una fila más para filtrar/ordenar, rompiendo el resumen).
      ws.autoFilter = { from: "A1", to: `I${1 + entradasFiltradas.length}` };

      // ── Fila de totales ──────────────────────────────────────
      const totalIngresos = entradasFiltradas.reduce((sum, e) => sum + (e.precioTanda ?? 0), 0);
      const totalRow = ws.addRow({
        id:          "TOTAL",
        comprador:   `${entradasFiltradas.length} entr.`,
        email:       "",
        tanda:       "",
        precio:      totalIngresos,
        canal:       "",
        estado:      "",
        fechaCompra: "",
        fechaUso:    "",
      });
      totalRow.height = 28;
      totalRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A52" } };
        cell.alignment = { vertical: "middle" };
        cell.border    = { top: { style: "medium", color: { argb: "FF9CADD3" } } };
      });
      // Precio total levemente más grande
      const precioCell = totalRow.getCell("precio");
      precioCell.font = { bold: true, color: { argb: "FFFFD700" }, size: 12, name: "Calibri" };

      // ── Hoja de resumen: por tanda y por canal ────────────────
      // Agrupado sobre entradasFiltradas (lo mismo que se exportó arriba), no sobre `metricas`
      // del evento completo: si hay un filtro de búsqueda/estado activo, el resumen tiene que
      // coincidir con lo que realmente se exportó, no con el total del evento.
      function agrupar<T extends string>(clave: (e: (typeof entradasFiltradas)[number]) => T) {
        const mapa = new Map<T, { cantidad: number; ingresos: number }>();
        for (const e of entradasFiltradas) {
          const k = clave(e);
          const actual = mapa.get(k) ?? { cantidad: 0, ingresos: 0 };
          actual.cantidad += 1;
          actual.ingresos += e.precioTanda ?? 0;
          mapa.set(k, actual);
        }
        return [...mapa.entries()].map(([nombre, v]) => ({ nombre, ...v }));
      }

      const porTanda = agrupar((e) => e.nombreTanda);
      const porCanal = agrupar((e) => e.canalVenta);

      const wsResumen = wb.addWorksheet("Resumen");
      wsResumen.columns = [
        { header: "", key: "nombre", width: 24 },
        { header: "", key: "cantidad", width: 14 },
        { header: "", key: "ingresos", width: 16, style: { numFmt: '"$"#,##0' } },
      ];

      function bloqueResumen(titulo: string, filas: { nombre: string; cantidad: number; ingresos: number }[]) {
        const tituloRow = wsResumen.addRow([titulo]);
        wsResumen.mergeCells(tituloRow.number, 1, tituloRow.number, 3);
        tituloRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FF2D3A5C" } };
        tituloRow.height = 24;

        const headerRow = wsResumen.addRow(["", "Entradas", "Ingresos"]);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10, name: "Calibri" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D3A5C" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        for (const f of filas) {
          wsResumen.addRow({ nombre: f.nombre, cantidad: f.cantidad, ingresos: f.ingresos });
        }

        const totalFila = wsResumen.addRow({
          nombre: "Total",
          cantidad: filas.reduce((s, f) => s + f.cantidad, 0),
          ingresos: filas.reduce((s, f) => s + f.ingresos, 0),
        });
        totalFila.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { bold: true };
          cell.border = { top: { style: "thin", color: { argb: "FF9CADD3" } } };
        });

        wsResumen.addRow([]);
      }

      bloqueResumen("Por tanda", porTanda);
      bloqueResumen("Por canal de venta", porCanal);

      // ── Generar y descargar ───────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `entradas_${nombreEvento.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No pudimos generar el Excel. Intentá de nuevo.");
    }
  }

  const entradasFiltradas = useMemo(() => {
    const term = q.toLowerCase();
    return (entradas ?? []).filter((e) => {
      const matchQ = !term || e.nombreComprador.toLowerCase().includes(term) || e.emailComprador.toLowerCase().includes(term);
      const matchF =
        filtro === "todas" ||
        (filtro === "Pagada" && e.estado === "Pagada") ||
        (filtro === "Usada" && e.estado === "Usada") ||
        (filtro === "Online" && e.canalVenta === "Online") ||
        (filtro === "Manual" && e.canalVenta === "Manual");
      return matchQ && matchF;
    });
  }, [entradas, q, filtro]);

  if (error && !evento) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <ErrorState
          title="No pudimos cargar el evento"
          description={error}
          onRetry={() => {
            setError(null);
            cargar();
          }}
          secondaryAction={
            <Link to="/organizador/dashboard" className={claseBoton("secondary")}>
              Volver al panel
            </Link>
          }
        />
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8" aria-busy="true">
        <span className="sr-only">Cargando el evento…</span>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-2/3" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const hayVentas = (metricas?.entradasVendidas ?? 0) > 0;
  const tieneMapa = evento.latitud != null && evento.longitud != null;
  const tieneLateral = tieneMapa || Boolean(evento.imagenPortadaUrl);
  const puedeExportar = (entradas?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 lg:space-y-8 lg:px-8 lg:py-8">
      <PageHeader
        back={{ label: "Volver al panel", to: "/organizador/dashboard" }}
        eyebrow={<StatusBadge tipo="evento" estado={evento.estado} />}
        title={evento.nombre}
        description={`${formatFecha(evento.fechaEvento)} · ${formatHora(evento.horaEvento)} · ${evento.lugar}`}
        actions={
          evento.estado !== "Cancelado" && (
            <div className="flex flex-wrap items-center gap-2">
              {evento.estado === "Publicado" && (
                <Link to={`/eventos/${evento.urlPublica}`} className={claseBoton("secondary", "sm")}>
                  <ExternalLink size={15} aria-hidden="true" />
                  Ver página pública
                </Link>
              )}
              <Button size="sm" leftIcon={<Pencil size={15} />} onClick={() => navigate(`/organizador/eventos/${evento.id}/editar`)}>
                Editar
              </Button>
              <Button variant="secondary" size="sm" leftIcon={<Ban size={15} />} loading={cancelando} onClick={cancelarEvento}>
                Cancelar evento
              </Button>
            </div>
          )
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {evento.estado === "Borrador" && (
        <EmptyState
          icon={FilePen}
          title="Este evento todavía está en borrador"
          description="Publicalo para empezar a vender entradas y ver las métricas acá."
        />
      )}

      {metricas && (
        <section aria-label="Métricas del evento" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Ingresos totales"
            value={fmt(metricas.ingresosTotales)}
            icon={TrendingUp}
            emphasis="primary"
            className="col-span-2 lg:col-span-1"
          />
          <StatCard label="Entradas vendidas" value={metricas.entradasVendidas.toLocaleString("es-AR")} icon={Ticket} />
          <StatCard label="Validados en puerta" value={metricas.entradasValidadas.toLocaleString("es-AR")} icon={ShieldCheck} />
          <StatCard
            label="Aforo disponible"
            value={`${metricas.cupoDisponible} / ${metricas.cupoTotal}`}
            icon={Users}
            className="col-span-2 lg:col-span-1"
          />
        </section>
      )}

      {(metricas || tieneLateral) && (
        <div className={cn("grid gap-6", metricas && tieneLateral && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
          {metricas && (
            <Card as="section" padding="none" aria-labelledby="tandas-titulo" className="overflow-hidden">
              <h2 id="tandas-titulo" className="px-4 pt-4 text-base font-bold text-foreground md:px-5 md:pt-5">
                Ventas e ingresos por tanda
              </h2>
              {hayVentas && metricas.tandas.length >= 2 && (
                <div className="px-4 pt-3 md:px-5" aria-hidden="true">
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={metricas.tandas} barCategoryGap="35%">
                      <XAxis dataKey="nombre" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--foreground)",
                        }}
                        cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                        formatter={(v: number) => [`${v} entradas`, ""]}
                      />
                      <Bar dataKey="vendidas" radius={[6, 6, 0, 0]}>
                        {metricas.tandas.map((_, i) => (
                          <Cell key={i} fill={COLORES_TANDA[i % COLORES_TANDA.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-surface-sunken text-2xs uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="px-4 py-2 text-left font-semibold md:px-5">
                        Tanda
                      </th>
                      <th scope="col" className="hidden px-4 py-2 text-right font-semibold sm:table-cell">
                        Precio
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">
                        Vendidas
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold md:px-5">
                        Ingresos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.tandas.map((t) => (
                      <tr key={t.idTanda} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground md:px-5">{t.nombre}</td>
                        <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">{t.vendidas > 0 ? fmt(t.ingresos / t.vendidas) : "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground">
                          {t.vendidas} <span className="text-muted-foreground">/ {t.cupoMaximo}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground md:px-5">{fmt(t.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-surface-sunken">
                      <td className="px-4 py-3 font-bold text-foreground md:px-5">
                        Total
                      </td>
                      <td className="hidden sm:table-cell" />
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">{metricas.entradasVendidas}</td>
                      <td className="px-4 py-3 text-right font-extrabold tabular-nums text-primary md:px-5">{fmt(metricas.ingresosTotales)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {tieneLateral && (
            <Card as="section" padding="none" aria-label="Portada y ubicación" className="self-start overflow-hidden">
              {evento.imagenPortadaUrl && (
                <EventoImagen src={evento.imagenPortadaUrl} alt={`Portada de ${evento.nombre}`} nombre={evento.nombre} className="aspect-[16/9] w-full object-cover" />
              )}
              {tieneMapa && (
                <div className="p-3">
                  <MapView coords={{ lat: evento.latitud!, lng: evento.longitud! }} lugar={evento.lugar} alto="h-44" />
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {metricas && (
        <Card as="section" padding="none" aria-labelledby="compradores-titulo" className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:p-5">
            <div className="flex-1">
              <h2 id="compradores-titulo" className="text-base font-bold text-foreground">
                Compradores
              </h2>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {entradasFiltradas.length} de {entradas?.length ?? 0} entradas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="search"
                size="sm"
                surface="sunken"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre o email"
                aria-label="Buscar compradores por nombre o email"
                leadingIcon={<Search size={15} />}
                className="min-w-0 flex-1 md:w-60 md:flex-none"
              />
              {puedeExportar && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download size={15} />}
                  loading={exportando}
                  loadingText="Generando…"
                  onClick={exportar}
                  aria-label="Exportar entradas a Excel"
                >
                  Excel
                </Button>
              )}
            </div>
          </div>

          {puedeExportar && (
            <div role="group" aria-label="Filtrar entradas" className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 hide-scrollbar md:px-5">
              {(["todas", "Pagada", "Usada", "Online", "Manual"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filtro === f}
                  onClick={() => setFiltro(f)}
                  className={cn(
                    "h-8 flex-none rounded-full px-3 text-xs font-semibold transition-colors duration-(--duration-fast)",
                    filtro === f
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {f === "todas" ? "Todas" : f}
                </button>
              ))}
            </div>
          )}

          <ListaCompradores entradas={entradas} filtradas={entradasFiltradas} />
        </Card>
      )}
    </div>
  );
}

function ListaCompradores({ entradas, filtradas }: { entradas: EntradaResponseDTO[] | null; filtradas: EntradaResponseDTO[] }) {
  if (entradas === null) {
    return (
      <div className="space-y-2 p-4" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  if (entradas.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-muted-foreground">Todavía no se vendieron entradas para este evento.</p>;
  }
  if (filtradas.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-muted-foreground">Ninguna entrada coincide con la búsqueda.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {filtradas.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 md:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{e.nombreComprador}</p>
            <p className="truncate text-xs text-muted-foreground">{e.emailComprador}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{e.nombreTanda}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                {e.canalVenta === "Online" ? <CreditCard size={12} aria-hidden="true" /> : <Store size={12} aria-hidden="true" />}
                {e.canalVenta}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatFechaHora(e.fechaCompra)}</span>
            </p>
          </div>
          <div className="flex flex-none flex-col items-end gap-1">
            <p className="text-sm font-bold tabular-nums text-foreground">{fmt(e.precioTanda)}</p>
            <StatusBadge tipo="entrada" estado={e.estado} size="sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}
