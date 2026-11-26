import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Plus, Save } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { estadoVisibleEvento, eventoCerrado } from "../../lib/estados";
import { fmt, hoyLocal } from "../../lib/format";
import type { Coords } from "../../components/EventMap";
import { Alert, Button, Card, ErrorState, PageHeader, Skeleton, StatusBadge } from "../../components/ui";
import { DatosEventoCampos, TandaCard } from "./EventoFormCampos";
import { validarTandaContraEvento } from "./WizardPage";
import type { CreditosResumenResponseDTO, EventoRequestDTO, EventoResponseDTO, TandaRequestDTO, TandaResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDialog } from "../../lib/dialogs";

interface EditTanda {
  id: number | null; // null = tanda nueva sin guardar
  nombre: string;
  precio: string;
  cupoMaximo: string;
  cupoDisponible: number | null;
  desde: string;
  hasta: string;
  /** Tanda de cortesía (8.10): no se vende, solo la emite el Organizador; precio 0. */
  soloEmision: boolean;
}

function toTandaFecha(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function tandaFromResponse(t: TandaResponseDTO): EditTanda {
  return {
    id: t.id,
    nombre: t.nombre,
    precio: String(t.precio),
    cupoMaximo: String(t.cupoMaximo),
    cupoDisponible: t.cupoDisponible,
    desde: toTandaFecha(t.fechaInicioVigencia),
    hasta: toTandaFecha(t.fechaFinVigencia),
    soloEmision: t.soloEmision,
  };
}

export function OrganizadorEditEventPage() {
  useDocumentTitle("Editar evento");
  const { confirm } = useDialog();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  // La misma pantalla la usan el Organizador y el Admin. El Admin pega contra
  // /admin/eventos/* (sin chequeo de propiedad); el Organizador contra /eventos/*.
  const esAdmin = session?.rol === "Administrador";
  const base = esAdmin ? `/admin/eventos/${id}` : `/eventos/${id}`;
  const volverA = esAdmin ? "/admin/eventos" : "/organizador/dashboard";

  const [evento, setEvento] = useState<EventoResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [img, setImg] = useState("");
  const [savingData, setSavingData] = useState(false);

  const [tandas, setTandas] = useState<EditTanda[]>([]);
  const [busyTanda, setBusyTanda] = useState<number | "nueva" | null>(null);
  const [resumen, setResumen] = useState<CreditosResumenResponseDTO | null>(null);

  const hoyStr = hoyLocal();

  function hidratar(ev: EventoResponseDTO) {
    setEvento(ev);
    setTitle(ev.nombre);
    setDesc(ev.descripcion ?? "");
    setDate(ev.fechaEvento);
    setTime(ev.horaEvento.slice(0, 5));
    setVenue(ev.lugar);
    setCoords(ev.latitud != null && ev.longitud != null ? { lat: ev.latitud, lng: ev.longitud } : null);
    setImg(ev.imagenPortadaUrl ?? "");
    setTandas(ev.tandas.map(tandaFromResponse));
  }

  useEffect(() => {
    api
      .get<CreditosResumenResponseDTO>("/creditos/resumen")
      .then(setResumen)
      .catch(() => setResumen(null));
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .get<EventoResponseDTO>(base)
      .then(hidratar)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar el evento."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, base]);

  const cerrado = evento != null && eventoCerrado(evento);
  const bloqueado = evento?.estado === "Cancelado" || cerrado;
  const publicado = evento?.estado === "Publicado";
  const fechaEnPasado = date !== "" && date < hoyStr;
  const datosValidos = title.trim() && date && time && venue.trim() && !fechaEnPasado;

  function updateTanda(idx: number, field: Exclude<keyof EditTanda, "soloEmision" | "id" | "cupoDisponible">, val: string) {
    setTandas((ts) => ts.map((t, i) => (i === idx ? { ...t, [field]: val } : t)));
  }

  // Una tanda de cortesía no tiene precio: queda en 0 y se vuelve a pedir si se desmarca.
  function toggleCortesia(idx: number, marcada: boolean) {
    setTandas((ts) => ts.map((t, i) => (i === idx ? { ...t, soloEmision: marcada, precio: marcada ? "0" : "" } : t)));
  }

  /**
   * Créditos que consume guardar esta tanda: una tanda nueva consume todo su cupo; una existente,
   * solo la diferencia si sube el cupo (si baja, devuelve créditos y no consume nada).
   */
  function entradasNuevasDe(t: EditTanda): number {
    const cupo = Number(t.cupoMaximo) || 0;
    if (t.id === null) return cupo;
    const original = evento?.tandas.find((x) => x.id === t.id);
    return Math.max(0, cupo - (original?.cupoMaximo ?? 0));
  }

  function excedeCreditos(t: EditTanda): boolean {
    return resumen !== null && entradasNuevasDe(t) > resumen.disponibleParaEntradas;
  }

  function vendidasDe(t: EditTanda): number {
    const original = evento?.tandas.find((x) => x.id === t.id);
    if (!original) return 0;
    return original.cupoMaximo - original.cupoDisponible;
  }

  const tandaErrors = useMemo(
    () =>
      tandas.map((t) => {
        const err = validarTandaContraEvento(t, date);
        if (err) return err;
        if (t.id !== null && t.cupoMaximo !== "" && Number(t.cupoMaximo) < vendidasDe(t)) {
          return `El cupo no puede bajar de las ${vendidasDe(t)} entradas ya vendidas.`;
        }
        return null;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tandas, date, evento],
  );

  async function guardarDatos() {
    if (!id || !datosValidos) return;
    setSavingData(true);
    setError(null);
    setOkMsg(null);
    try {
      const dto: EventoRequestDTO = {
        nombre: title.trim(),
        descripcion: desc.trim() || undefined,
        fechaEvento: date,
        horaEvento: `${time}:00`,
        lugar: venue.trim(),
        latitud: coords?.lat ?? null,
        longitud: coords?.lng ?? null,
        imagenPortadaUrl: img.trim() || undefined,
      };
      const actualizado = await api.put<EventoResponseDTO>(base, dto);
      hidratar(actualizado);
      setOkMsg("Datos del evento guardados.");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar los cambios.");
    } finally {
      setSavingData(false);
    }
  }

  function tandaDto(t: EditTanda): TandaRequestDTO {
    const finHora = t.hasta === date ? `${time}:00` : "23:59:59";
    return {
      nombre: t.nombre.trim(),
      precio: t.soloEmision ? 0 : Number(t.precio),
      cupoMaximo: Number(t.cupoMaximo),
      ...(t.soloEmision ? { soloEmision: true } : {}),
      fechaInicioVigencia: t.desde ? `${t.desde}T00:00:00` : undefined,
      fechaFinVigencia: t.hasta ? `${t.hasta}T${finHora}` : undefined,
    };
  }

  async function guardarTanda(idx: number) {
    if (!id) return;
    const t = tandas[idx];
    if (!t.nombre || !t.precio || !t.cupoMaximo || tandaErrors[idx]) return;
    if (t.id !== null && Number(t.cupoMaximo) < vendidasDe(t)) {
      setError(`No podés bajar el cupo de "${t.nombre}" por debajo de las ${vendidasDe(t)} entradas ya vendidas.`);
      return;
    }
    if (resumen && excedeCreditos(t)) {
      setError(`Esta tanda necesita ${entradasNuevasDe(t)} crédito(s) y tenés ${resumen.disponibleParaEntradas} disponible(s) para entradas.`);
      return;
    }
    setBusyTanda(t.id ?? "nueva");
    setError(null);
    setOkMsg(null);
    try {
      if (t.id === null) {
        await api.post<TandaResponseDTO>(`${base}/tandas`, tandaDto(t));
      } else {
        await api.put<TandaResponseDTO>(`${base}/tandas/${t.id}`, tandaDto(t));
      }
      const refrescado = await api.get<EventoResponseDTO>(base);
      hidratar(refrescado);
      setOkMsg("Tanda guardada.");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar la tanda.");
    } finally {
      setBusyTanda(null);
    }
  }

  async function eliminarTanda(idx: number) {
    const t = tandas[idx];
    if (t.id === null) {
      setTandas((ts) => ts.filter((_, i) => i !== idx));
      return;
    }
    if (!id) return;
    const ok = await confirm({
      titulo: "Eliminar tanda",
      mensaje: `¿Eliminar la tanda "${t.nombre}"?`,
      confirmarTexto: "Eliminar",
      variante: "destructiva",
    });
    if (!ok) return;
    setBusyTanda(t.id);
    setError(null);
    try {
      await api.delete(`${base}/tandas/${t.id}`);
      const refrescado = await api.get<EventoResponseDTO>(base);
      hidratar(refrescado);
      setOkMsg("Tanda eliminada.");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos eliminar la tanda.");
    } finally {
      setBusyTanda(null);
    }
  }

  function addTanda() {
    setTandas((ts) => [
      ...ts,
      { id: null, nombre: "", precio: "", cupoMaximo: "", cupoDisponible: null, desde: "", hasta: "", soloEmision: false },
    ]);
  }

  const volverLabel = esAdmin ? "Volver a eventos" : "Volver al panel";

  if (error && !evento) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <ErrorState
          title="No pudimos cargar el evento"
          description={error}
          secondaryAction={
            <Button variant="secondary" onClick={() => navigate(volverA)}>
              {volverLabel}
            </Button>
          }
        />
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 lg:px-8 lg:py-8" aria-busy="true">
        <span className="sr-only">Cargando el evento…</span>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader
        back={{ label: volverLabel, onClick: () => navigate(volverA) }}
        eyebrow={<StatusBadge tipo="evento" estado={estadoVisibleEvento(evento)} />}
        title="Editar evento"
        description={evento.nombre}
      />

      {bloqueado && (
        <Alert tone="info">{cerrado ? "Este evento finalizó. No se puede editar." : "Este evento está cancelado. No se puede editar."}</Alert>
      )}

      {publicado && !bloqueado && (
        <Alert tone="warning" title="Este evento está publicado y en venta.">
          Los cambios impactan de inmediato a los compradores. No podés reducir el cupo de una tanda por debajo de lo ya vendido ni dejar el
          evento sin tandas.
        </Alert>
      )}

      {/* Resultado de la última acción: anunciado (role="status"/"alert" dentro de Alert). */}
      {error && <Alert tone="danger">{error}</Alert>}
      {okMsg && <Alert tone="success">{okMsg}</Alert>}

      {!bloqueado && (
        <>
          <Card as="section" padding="none" aria-labelledby="datos-titulo" className="space-y-5 p-4 md:p-6">
            <h2 id="datos-titulo" className="font-display text-base font-bold tracking-tight text-foreground">
              Datos del evento
            </h2>
            <DatosEventoCampos
              nombre={title}
              onNombre={setTitle}
              descripcion={desc}
              onDescripcion={setDesc}
              fecha={date}
              onFecha={setDate}
              hora={time}
              onHora={setTime}
              lugar={venue}
              onLugar={setVenue}
              coords={coords}
              onCoords={setCoords}
              imagen={img}
              onImagen={setImg}
              hoy={hoyStr}
              fechaEnPasado={fechaEnPasado}
            />
            <div className="flex justify-end border-t border-border pt-4">
              <Button leftIcon={<Save size={16} />} disabled={!datosValidos} loading={savingData} loadingText="Guardando…" onClick={guardarDatos}>
                Guardar datos
              </Button>
            </div>
          </Card>

          <section aria-labelledby="tandas-titulo" className="space-y-4">
            <div>
              <h2 id="tandas-titulo" className="font-display text-base font-bold tracking-tight text-foreground">
                Tandas
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Cada tanda se guarda por separado.</p>
            </div>

            {tandas.map((t, i) => {
              const vendidas = t.id !== null ? vendidasDe(t) : 0;
              const ocupada = busyTanda !== null;
              const incompleta = !t.nombre || !t.precio || !t.cupoMaximo;
              const sinCreditos = excedeCreditos(t) && resumen;
              return (
                <TandaCard
                  key={t.id ?? `nueva-${i}`}
                  titulo={t.id === null ? "Nueva tanda" : t.nombre || `Tanda ${i + 1}`}
                  valores={t}
                  onCambio={(campo, valor) => updateTanda(i, campo, valor)}
                  fechaEvento={date}
                  error={tandaErrors[i] ?? (sinCreditos ? `Necesitás ${entradasNuevasDe(t)} crédito(s) y tenés ${resumen.disponibleParaEntradas} disponible(s) para entradas.` : null)}
                  onEliminar={() => eliminarTanda(i)}
                  etiquetaEliminar={`Eliminar la tanda ${t.nombre || i + 1}`}
                  eliminarDeshabilitado={ocupada}
                  cortesia={{ marcada: t.soloEmision, onCambio: (v) => toggleCortesia(i, v), bloqueada: vendidas > 0 }}
                  detalle={t.id !== null ? `${vendidas} vendidas · ${t.cupoDisponible} disponibles · el cupo no puede bajar de ${vendidas}` : undefined}
                  pie={
                    <div className="flex justify-end">
                      <Button
                        variant={t.id === null ? "primary" : "secondary"}
                        size="sm"
                        leftIcon={<Save size={15} />}
                        disabled={(ocupada && busyTanda !== (t.id ?? "nueva")) || incompleta || Boolean(tandaErrors[i]) || excedeCreditos(t)}
                        loading={busyTanda === (t.id ?? "nueva")}
                        onClick={() => guardarTanda(i)}
                      >
                        {t.id === null ? "Crear tanda" : "Guardar tanda"}
                      </Button>
                    </div>
                  }
                />
              );
            })}

            <button
              type="button"
              onClick={addTanda}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong text-sm font-semibold text-muted-foreground transition-colors duration-(--duration-fast) hover:border-primary/50 hover:bg-card hover:text-foreground"
            >
              <Plus size={16} aria-hidden="true" />
              Agregar tanda
            </button>
          </section>

          {evento.estado === "Borrador" && !esAdmin && (
            <p className="text-xs text-muted-foreground">
              Este evento todavía está en borrador. El organizador lo publica desde su panel (consume créditos según la configuración).
            </p>
          )}
        </>
      )}

      {/* Resumen de precios: visible siempre (también en un evento cancelado). */}
      {evento.tandas.length > 0 && (
        <Card as="section" padding="sm" aria-labelledby="precios-titulo">
          <h2 id="precios-titulo" className="mb-2 text-sm font-bold text-foreground">
            Precios actuales
          </h2>
          <dl className="divide-y divide-border">
            {evento.tandas.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-muted-foreground">{t.nombre}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{fmt(t.precio)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
