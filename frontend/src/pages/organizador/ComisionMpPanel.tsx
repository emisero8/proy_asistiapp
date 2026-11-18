import { useId, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Save } from "lucide-react";
import { Alert, Button, Field, RadioCardGroup, SelectMenu } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { PLAZOS_MP, ZONAS_MP, cargoEstimado, porcentajeMp, textoComision, textoPorcentaje } from "../../lib/comisionesMp";
import { fmt } from "../../lib/format";
import type { ComisionMpRequestDTO, PerfilResponseDTO, PlazoLiberacionMp, ZonaComisionMp } from "../../lib/types";

type QuienPaga = "organizador" | "comprador";

/** Precio de ejemplo para mostrar cuánto paga el comprador con la configuración elegida. */
const PRECIO_EJEMPLO = 10000;

interface Props {
  perfil: PerfilResponseDTO;
  onGuardado: (perfil: PerfilResponseDTO) => void;
}

/**
 * Quién paga la comisión de Mercado Pago de las entradas (Mi perfil → Cuenta de Mercado Pago). Por defecto la
 * absorbe el Organizador; si la traslada, el comprador paga un cargo por procesamiento que calcula el backend con
 * el plazo de liberación y la zona elegidos acá, y que el checkout muestra desglosado.
 */
export function ComisionMpPanel({ perfil, onGuardado }: Props) {
  const [quienPaga, setQuienPaga] = useState<QuienPaga>(perfil.trasladarCargoMp ? "comprador" : "organizador");
  const [plazo, setPlazo] = useState<PlazoLiberacionMp>(perfil.plazoLiberacionMp);
  const [zona, setZona] = useState<ZonaComisionMp>(perfil.zonaComisionMp);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trasladar = quienPaga === "comprador";
  const sinCambios =
    trasladar === perfil.trasladarCargoMp && plazo === perfil.plazoLiberacionMp && zona === perfil.zonaComisionMp;
  const cargoEjemplo = cargoEstimado(PRECIO_EJEMPLO, plazo, zona);

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      const dto: ComisionMpRequestDTO = { trasladarAlComprador: trasladar, plazoLiberacion: plazo, zona };
      const actualizado = await api.put<PerfilResponseDTO>("/organizador/perfil/comision-mp", dto);
      onGuardado(actualizado);
      toast.success(actualizado.trasladarCargoMp ? "El cargo de Mercado Pago lo paga el comprador" : "La comisión de Mercado Pago la absorbés vos");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar tu preferencia.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <RadioCardGroup<QuienPaga>
        label="¿Quién paga la comisión de Mercado Pago?"
        value={quienPaga}
        onChange={setQuienPaga}
        options={[
          {
            value: "organizador",
            label: "La absorbo yo",
            description: "El comprador paga el precio exacto de la entrada y Mercado Pago descuenta su comisión al acreditarte.",
          },
          {
            value: "comprador",
            label: "La paga el comprador",
            description: "Se suma un cargo por procesamiento de pago al precio de cada entrada, desglosado en el checkout.",
          },
        ]}
      />

      {trasladar && (
        <div className="space-y-4 rounded-xl border border-border-strong bg-surface-sunken p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plazo de liberación" labelVariant="mono" hint="El que tenés configurado en Mercado Pago.">
              <SelectMenu
                value={plazo}
                onChange={(v) => setPlazo(v as PlazoLiberacionMp)}
                options={PLAZOS_MP.map((p) => ({ value: p.valor, label: p.etiqueta }))}
              />
            </Field>
            <Field label="Zona" labelVariant="mono">
              <SelectMenu
                value={zona}
                onChange={(v) => setZona(v as ZonaComisionMp)}
                options={ZONAS_MP.map((z) => ({ value: z.valor, label: z.etiqueta }))}
              />
            </Field>
          </div>
          <dl className="space-y-1.5 border-t border-dashed border-border-strong pt-3 font-mono text-xs" aria-label="Ejemplo con una entrada de $10.000">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Entrada de ejemplo</dt>
              <dd className="tabular-nums text-foreground">{fmt(PRECIO_EJEMPLO)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Cargo por procesamiento ({textoPorcentaje((cargoEjemplo / PRECIO_EJEMPLO) * 100)})</dt>
              <dd className="tabular-nums text-foreground">+ {fmt(cargoEjemplo)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 font-semibold">
              <dt className="text-foreground">Paga el comprador</dt>
              <dd className="tabular-nums text-foreground">{fmt(PRECIO_EJEMPLO + cargoEjemplo)}</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Mercado Pago cobra su comisión ({textoComision(porcentajeMp(plazo, zona))}) sobre todo lo que paga el comprador, cargo incluido: con este
            cálculo a vos te queda el precio de la entrada.
          </p>
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      <Button
        block
        variant="secondary"
        tactil
        leftIcon={<Save size={16} />}
        loading={guardando}
        loadingText="Guardando…"
        disabled={sinCambios}
        onClick={guardar}
      >
        Guardar preferencia de comisión
      </Button>
      {sinCambios && <p className="text-center font-mono text-2xs text-muted-foreground">Sin cambios para guardar.</p>}
    </div>
  );
}

/**
 * Desplegable con las comisiones de Mercado Pago por plazo y el paso a paso para cambiar el plazo de liberación.
 * Es informativo: no recarga la tarjeta mientras está cerrado.
 */
export function InfoComisionesMp() {
  const [abierto, setAbierto] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-xl border border-border-strong">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors duration-(--duration-fast) hover:bg-muted"
      >
        Ver comisiones y plazos de Mercado Pago
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn("flex-none text-muted-foreground transition-transform duration-(--duration-base)", abierto && "rotate-180")}
        />
      </button>

      {abierto && (
        <div id={panelId} className="space-y-5 border-t border-border-strong px-4 pt-4 pb-5 animate-fade-in">
          <div>
            <p className="font-mono text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Checkout Pro · Online · Argentina
            </p>
            <div className="mt-2 overflow-hidden rounded-lg border border-border-strong">
              <table className="w-full font-mono text-xs">
                <caption className="sr-only">Comisión de Mercado Pago según el plazo de liberación del dinero</caption>
                <thead className="bg-surface-sunken text-2xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Plazo</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">General</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      <abbr title="Buenos Aires, Entre Ríos y Chubut" className="no-underline">BA · ER · Chubut</abbr>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PLAZOS_MP.map((p) => (
                    <tr key={p.valor}>
                      <th scope="row" className="px-3 py-2 text-left font-semibold text-foreground">{p.etiqueta}</th>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{textoComision(p.general)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{textoComision(p.zonaAlta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
              Valores de referencia al 17/11/2026. Mercado Pago puede cambiarlos: confirmá los tuyos en tu cuenta.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Cómo cambiar tu plazo de liberación en Mercado Pago</h3>
            <ol className="mt-3 space-y-2.5">
              {[
                <>Entrá a tu cuenta desde la <strong className="font-semibold text-foreground">app de Mercado Pago</strong> o desde <strong className="font-semibold text-foreground">mercadopago.com.ar</strong>.</>,
                <>Andá a <strong className="font-semibold text-foreground">Tu negocio → Costos</strong> (o <em>Configuración → Tasas y plazos</em>).</>,
                <>Seleccioná <strong className="font-semibold text-foreground">Checkout / Link de pago</strong>.</>,
                <>Elegí cuándo querés tener disponible tu dinero (<em>al instante, 10, 18 o 35 días</em>) y guardá los cambios.</>,
              ].map((paso, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="flex size-6 flex-none items-center justify-center rounded-md bg-primary font-mono text-2xs font-semibold text-primary-foreground"
                  >
                    {i + 1}
                  </span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Después, elegí el mismo plazo acá para que el cargo al comprador sea exacto.</p>
          </div>
        </div>
      )}
    </div>
  );
}
