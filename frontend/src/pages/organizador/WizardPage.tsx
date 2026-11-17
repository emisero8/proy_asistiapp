import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronLeft, ChevronRight, PartyPopper, Plus } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { formatFecha, hoyLocal } from "../../lib/format";
import type { Coords } from "../../components/EventMap";
import { Alert, Button, Card, IconButton, PageHeader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { comportamientoScroll } from "../../lib/motion";
import { DatosEventoCampos, TandaCard } from "./EventoFormCampos";
import type { CreditosResumenResponseDTO, EventoRequestDTO, EventoResponseDTO, MovimientoCreditoResponseDTO, TandaRequestDTO, TandaResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

interface WizardTanda {
  id: number;
  nombre: string;
  precio: string;
  cupoMaximo: string;
  desde: string;
  hasta: string;
}

/**
 * Valida una tanda contra la fecha del evento. Devuelve el primer problema
 * encontrado o null si está bien. Refleja las reglas del backend
 * (TandaService.validarVentana) para avisar antes de mandar el request.
 */
export function validarTandaContraEvento(
  t: { precio: string; cupoMaximo: string; desde: string; hasta: string },
  fechaEvento: string,
): string | null {
  const precio = Number(t.precio);
  if (t.precio !== "" && (!Number.isFinite(precio) || precio < 0)) return "El precio no puede ser negativo.";
  const cupo = Number(t.cupoMaximo);
  if (t.cupoMaximo !== "" && (!Number.isInteger(cupo) || cupo < 1)) return "El cupo debe ser un número entero de 1 o más.";
  if (t.desde && t.hasta && t.desde > t.hasta) return "El inicio de la venta debe ser anterior al cierre.";
  if (fechaEvento && t.hasta && t.hasta > fechaEvento) return "La venta no puede cerrar después de la fecha del evento.";
  if (fechaEvento && t.desde && t.desde > fechaEvento) return "La venta no puede empezar después de la fecha del evento.";
  return null;
}

export function OrganizadorWizardPage() {
  useDocumentTitle("Crear evento");
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const [published, setPublished] = useState(false);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movimiento, setMovimiento] = useState<MovimientoCreditoResponseDTO | null>(null);
  const [resumen, setResumen] = useState<CreditosResumenResponseDTO | null>(null);
  /** Tandas ya creadas en el borrador (id local → id del backend + lo que se mandó), para que un reintento no las duplique. */
  const tandasCreadasRef = useRef(new Map<number, { tandaId: number; firma: string }>());
  const saldo = resumen?.saldo ?? null;

  useEffect(() => {
    api
      .get<CreditosResumenResponseDTO>("/creditos/resumen")
      .then(setResumen)
      .catch(() => setResumen({ saldo: 0, costoPublicacion: 1, disponibleParaEntradas: 0 }));
  }, []);

  // Scroll al top al cambiar de paso
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: comportamientoScroll(), block: "start" });
  }, [step]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [img, setImg] = useState("");
  const [tandas, setTandas] = useState<WizardTanda[]>([{ id: 1, nombre: "Anticipada", precio: "", cupoMaximo: "", desde: "", hasta: "" }]);

  const addTanda = () => setTandas((t) => [...t, { id: Date.now(), nombre: "", precio: "", cupoMaximo: "", desde: "", hasta: "" }]);
  const removeTanda = (id: number) => setTandas((t) => t.filter((x) => x.id !== id));
  const updateTanda = (id: number, field: keyof WizardTanda, val: string) =>
    setTandas((t) => t.map((x) => (x.id === id ? { ...x, [field]: val } : x)));

  const hoyStr = hoyLocal();
  const fechaEnPasado = date !== "" && date < hoyStr;
  const step1Valid = title.trim() && date && time && venue.trim() && !fechaEnPasado;

  const tandaErrors = tandas.map((t) => validarTandaContraEvento(t, date));
  // Publicar cuesta créditos: sin saldo para ese costo no se puede publicar (ni armar tandas)
  const sinCreditos = resumen !== null && resumen.saldo < resumen.costoPublicacion;
  // Cada entrada consume 1 crédito del disponible para entradas (saldo menos el costo reservado de publicar)
  const disponibleEntradas = resumen?.disponibleParaEntradas ?? null;
  const totalEntradas = tandas.reduce((suma, t) => suma + (Number(t.cupoMaximo) || 0), 0);
  const excedeCreditos = disponibleEntradas !== null && totalEntradas > disponibleEntradas;
  const step2Valid =
    tandas.every((t) => t.nombre && t.precio && t.cupoMaximo) &&
    tandaErrors.every((e) => e === null) &&
    !sinCreditos &&
    !excedeCreditos;

  async function handleNext() {
    setLoading(true);
    setError(null);
    try {
      const dto: EventoRequestDTO = {
        nombre: title,
        descripcion: desc || undefined,
        fechaEvento: date,
        horaEvento: `${time}:00`,
        lugar: venue,
        latitud: coords?.lat ?? null,
        longitud: coords?.lng ?? null,
        imagenPortadaUrl: img || undefined,
      };
      const evento = eventoId
        ? await api.put<EventoResponseDTO>(`/eventos/${eventoId}`, dto)
        : await api.post<EventoResponseDTO>("/eventos", dto);
      setEventoId(evento.id);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar el evento.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublicar() {
    if (!eventoId) return;
    setLoading(true);
    setError(null);
    const creadas = tandasCreadasRef.current;
    try {
      // Reintento después de un fallo: las tandas que se sacaron de la lista pero ya
      // estaban creadas en el borrador se borran del backend.
      const idsLocales = new Set(tandas.map((t) => t.id));
      for (const [idLocal, creada] of [...creadas]) {
        if (idsLocales.has(idLocal)) continue;
        await api.delete(`/eventos/${eventoId}/tandas/${creada.tandaId}`);
        creadas.delete(idLocal);
      }
      for (const t of tandas) {
        // Si el "hasta" cae el mismo día del evento, la venta cierra cuando
        // empieza el evento (no a las 23:59) para no chocar con la validación.
        const finHora = t.hasta === date ? `${time}:00` : "23:59:59";
        const dto: TandaRequestDTO = {
          nombre: t.nombre,
          precio: Number(t.precio),
          cupoMaximo: Number(t.cupoMaximo),
          fechaInicioVigencia: t.desde ? `${t.desde}T00:00:00` : undefined,
          fechaFinVigencia: t.hasta ? `${t.hasta}T${finHora}` : undefined,
        };
        const firma = JSON.stringify(dto);
        const yaCreada = creadas.get(t.id);
        // Ya creada en un intento anterior: no se vuelve a crear (antes se duplicaba);
        // solo se actualiza si el organizador la cambió antes de reintentar.
        if (yaCreada) {
          if (yaCreada.firma !== firma) {
            await api.put(`/eventos/${eventoId}/tandas/${yaCreada.tandaId}`, dto);
            creadas.set(t.id, { tandaId: yaCreada.tandaId, firma });
          }
          continue;
        }
        const nueva = await api.post<TandaResponseDTO>(`/eventos/${eventoId}/tandas`, dto);
        creadas.set(t.id, { tandaId: nueva.id, firma });
      }
      await api.patch(`/eventos/${eventoId}/publicar`);
      const historial = await api.get<MovimientoCreditoResponseDTO[]>("/creditos/historial");
      setMovimiento(historial[0] ?? null);
      setPublished(true);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos publicar el evento.");
    } finally {
      setLoading(false);
    }
  }

  if (published) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-success/12 text-success animate-scale-in">
          <PartyPopper size={30} aria-hidden="true" />
        </div>
        <p role="status" className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-success">
          ¡Evento publicado!
        </p>
        <h1 className="mb-2 font-display text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{venue}</p>
        <p className="mb-6 text-sm text-muted-foreground">
          {formatFecha(date)} {time && `· ${time} hs`}
        </p>
        {movimiento && (
          <Card className="mb-6 w-full space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Créditos consumidos</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{movimiento.monto} créditos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo restante</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{movimiento.saldoResultante} créditos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tandas creadas</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{tandas.length}</span>
            </div>
          </Card>
        )}
        <Button block size="lg" onClick={() => navigate("/organizador/dashboard")}>
          Volver al panel
        </Button>
      </div>
    );
  }

  const pasos = [
    { n: 1, label: "Datos del evento" },
    { n: 2, label: "Entradas" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 lg:px-8 lg:pt-8">
      <div ref={topRef} className="scroll-mt-20">
        <PageHeader back={{ label: "Volver al panel", to: "/organizador/dashboard" }} title="Crear evento" />

        {/* Pasos: lista ordenada con el actual marcado (aria-current), no solo por color. */}
        <ol className="mt-5 flex items-center gap-3" aria-label="Pasos">
          {pasos.map(({ n, label }, i) => {
            const completo = step > n;
            const actual = step === n;
            return (
              <li key={n} className="flex items-center gap-3" aria-current={actual ? "step" : undefined}>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-7 flex-none items-center justify-center rounded-full text-xs font-bold transition-colors duration-(--duration-base)",
                      completo || actual ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {completo ? <Check size={14} strokeWidth={3} aria-label="Completo" /> : n}
                  </span>
                  <span className={cn("text-sm font-semibold", actual ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                </span>
                {i < pasos.length - 1 && (
                  <span aria-hidden="true" className="relative h-0.5 w-8 overflow-hidden rounded-full bg-muted sm:w-14">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-(--duration-slow) ease-standard"
                      style={{ width: step > n ? "100%" : "0%" }}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-5 py-6">
        {step === 1 && (
          <Card padding="none" className="p-4 md:p-6">
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
          </Card>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="font-display text-base font-bold tracking-tight text-foreground">Tandas de entradas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cada tanda tiene su precio y su cupo. Si dejás las fechas de venta vacías, se vende desde que publicás hasta que empieza el evento.
              </p>
            </div>

            {resumen && disponibleEntradas !== null && (
              <ContadorCreditos usadas={totalEntradas} disponibles={disponibleEntradas} reservados={resumen.costoPublicacion} excede={excedeCreditos} />
            )}

            {tandas.map((t, i) => (
              <TandaCard
                key={t.id}
                titulo={`Tanda ${i + 1}`}
                valores={t}
                onCambio={(campo, valor) => updateTanda(t.id, campo, valor)}
                fechaEvento={date}
                error={tandaErrors[i]}
                onEliminar={tandas.length > 1 ? () => removeTanda(t.id) : undefined}
                etiquetaEliminar={`Eliminar la tanda ${t.nombre || i + 1}`}
              />
            ))}

            <button
              type="button"
              onClick={addTanda}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong text-sm font-semibold text-muted-foreground transition-colors duration-(--duration-fast) hover:border-primary/50 hover:bg-card hover:text-foreground"
            >
              <Plus size={16} aria-hidden="true" />
              Agregar tanda
            </button>

            {sinCreditos ? (
              <Alert
                tone="danger"
                title="No te alcanzan los créditos para publicar."
                action={
                  <Button variant="secondary" size="sm" onClick={() => navigate("/organizador/creditos")}>
                    Comprar créditos
                  </Button>
                }
              >
                Publicar consume {resumen?.costoPublicacion ?? 1} crédito(s) y tu saldo es {saldo}.
              </Alert>
            ) : (
              <Alert tone="info">
                Publicar consume {resumen?.costoPublicacion ?? 1} crédito(s).{saldo !== null && ` Tenés ${saldo} disponible${saldo === 1 ? "" : "s"}.`}
              </Alert>
            )}
          </>
        )}

        {error && <Alert tone="danger">{error}</Alert>}
      </div>

      {/* Acciones: pegadas abajo mientras se scrollea el formulario (arriba de la barra de
          pestañas en mobile). Es sticky dentro del flujo: no depende del ancho del sidebar. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:bottom-0 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        {step === 1 ? (
          <Button block size="lg" disabled={!step1Valid} loading={loading} loadingText="Guardando…" onClick={handleNext} rightIcon={<ChevronRight size={18} />}>
            Siguiente: configurar tandas
          </Button>
        ) : (
          <div className="flex gap-3">
            <IconButton label="Volver al paso anterior" icon={<ChevronLeft size={18} />} variant="secondary" size="lg" onClick={() => setStep(1)} />
            <Button block size="lg" disabled={!step2Valid} loading={loading} loadingText="Publicando…" onClick={handlePublicar}>
              Publicar evento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ContadorCreditosProps {
  usadas: number;
  disponibles: number;
  reservados: number;
  excede: boolean;
}

/** Créditos para entradas en vivo: cada entrada de cupo consume uno. */
function ContadorCreditos({ usadas, disponibles, reservados, excede }: ContadorCreditosProps) {
  const pct = disponibles > 0 ? Math.min((usadas / disponibles) * 100, 100) : 100;
  const restantes = disponibles - usadas;
  const cerca = !excede && pct >= 80;
  const tono = excede ? "text-destructive" : cerca ? "text-warning" : "text-primary";
  const barra = excede ? "bg-destructive" : cerca ? "bg-warning" : "bg-primary";

  let estado: string;
  if (excede) estado = `Excedés el límite en ${Math.abs(restantes)} entrada${Math.abs(restantes) !== 1 ? "s" : ""}`;
  else if (restantes === 0) estado = "Usaste todos los créditos disponibles";
  else estado = `Te quedan ${restantes} crédito${restantes !== 1 ? "s" : ""} sin asignar`;

  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Créditos para entradas</span>
        <span className={cn("text-base font-extrabold tabular-nums", tono)}>
          {usadas}
          <span className="text-xs font-normal text-muted-foreground"> / {disponibles}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Créditos para entradas usados"
        aria-valuemin={0}
        aria-valuemax={disponibles}
        aria-valuenow={Math.min(usadas, disponibles)}
        className="relative h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-(--duration-base) ease-standard", barra)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className={cn(excede ? "font-semibold text-destructive" : "text-muted-foreground")} aria-live="polite">
          {estado}
        </span>
        <span className="text-muted-foreground">
          {reservados} reservado{reservados !== 1 ? "s" : ""} para publicar
        </span>
      </div>
    </Card>
  );
}
