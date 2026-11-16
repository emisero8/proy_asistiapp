import { useState, type ReactNode } from "react";
import { Ban, CalendarDays, KeyRound, Pencil, Plus, Search, Sparkles, Ticket, Trash2, TrendingUp, Wallet } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Menu,
  PageHeader,
  QuantityStepper,
  RadioCardGroup,
  Select,
  Skeleton,
  StatCard,
  StatusBadge,
  StickyActionBar,
  Switch,
  Textarea,
  Tooltip,
} from "../../components/ui";
import { ThemeToggle } from "../../components/ThemeToggle";
import { ETIQUETA_ROL, TONO_ROL } from "../../lib/estados";
import type { RolUsuario } from "../../lib/types";

/**
 * Catálogo del sistema de diseño — solo existe en desarrollo (`/dev/ui`, ver App.tsx; en el
 * build de producción la ruta y este chunk no se generan). Sirve para revisar cada componente
 * en claro/oscuro y en mobile/desktop sin depender de datos del backend.
 */
export function UiCatalogPage() {
  const [tanda, setTanda] = useState<number | null>(2);
  const [cantidad, setCantidad] = useState(1);
  const [activo, setActivo] = useState(true);
  const [acepto, setAcepto] = useState(false);
  const [email, setEmail] = useState("no-es-un-mail");
  const [cargando, setCargando] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pt-6 pb-48 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Fase 13.2"
        title="Catálogo de componentes"
        description="Primitivas de components/ui con los tokens de theme.css."
        back={{ label: "Volver al inicio", to: "/" }}
        actions={
          <>
            <ThemeToggle variant="secondary" />
            <Button variant="secondary" leftIcon={<Pencil size={15} />}>
              Editar
            </Button>
            <Button leftIcon={<Plus size={15} />}>Crear evento</Button>
          </>
        }
      />

      <Seccion titulo="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Eliminar</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Deshabilitado</Button>
          <Button
            loading={cargando}
            loadingText="Guardando…"
            onClick={() => {
              setCargando(true);
              setTimeout(() => setCargando(false), 1500);
            }}
          >
            Guardar (probar loading)
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Chico</Button>
          <Button size="md">Mediano</Button>
          <Button size="lg">Grande</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Editar evento" icon={<Pencil size={15} />} />
          <IconButton label="Cancelar evento" icon={<Ban size={15} />} variant="danger" />
          <IconButton label="Cambiar contraseña" icon={<KeyRound size={15} />} variant="secondary" round />
          <IconButton label="Agregar" icon={<Plus size={15} />} variant="primary" round />
          <Tooltip content="Tooltip sobre un link">
            <a href="#form" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Pasá el mouse o tabulá
            </a>
          </Tooltip>
        </div>
      </Seccion>

      <Seccion titulo="Formularios" id="form">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" hint="Como figura en tu DNI." required>
            <Input placeholder="María García" autoComplete="name" />
          </Field>
          <Field label="Email" error={email.includes("@") ? undefined : "Ingresá un email válido."} required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Buscar" labelHidden>
            <Input leadingIcon={<Search size={15} />} placeholder="Buscar por nombre o lugar…" size="sm" />
          </Field>
          <Field label="Estado">
            <Select defaultValue="todos" size="sm">
              <option value="todos">Todos los estados</option>
              <option>Publicado</option>
              <option>Borrador</option>
            </Select>
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Textarea placeholder="Contá de qué se trata el evento…" />
          </Field>
          <Field label="Deshabilitado">
            <Input value="No editable" disabled readOnly />
          </Field>
        </div>
        <Card padding="sm" className="space-y-3">
          <Field label="Input dentro de una tarjeta (surface sunken)">
            <Input surface="sunken" placeholder="…" />
          </Field>
          <Checkbox
            checked={acepto}
            onChange={(e) => setAcepto(e.target.checked)}
            label="Acepto los Términos y Condiciones"
            description="Un checkbox nativo: Espacio lo tilda, el texto también."
          />
          <Switch
            checked={activo}
            onCheckedChange={setActivo}
            label="Pack activo"
            description="Visible para los organizadores."
            showLabel
          />
        </Card>
      </Seccion>

      <Seccion titulo="Selección en tarjeta + cantidad">
        <RadioCardGroup
          label="Elegí tu tanda"
          value={tanda}
          onChange={setTanda}
          options={[
            { value: 1, label: "Anticipada", description: "Agotada", aside: "$8.000", disabled: true },
            { value: 2, label: "General", description: "150 disponibles", aside: "$12.000" },
            { value: 3, label: "VIP", description: "20 disponibles", aside: "$25.000" },
          ]}
        />
        <Card padding="sm" className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Cantidad</span>
          <QuantityStepper value={cantidad} onChange={setCantidad} max={6} />
        </Card>
      </Seccion>

      <Seccion titulo="Badges y estados">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tipo="evento" estado="Publicado" />
          <StatusBadge tipo="evento" estado="Borrador" />
          <StatusBadge tipo="evento" estado="Cancelado" />
          <StatusBadge tipo="usuario" estado="Suspendido" dot />
          <StatusBadge tipo="entrada" estado="Pagada" />
          <StatusBadge tipo="entrada" estado="Usada" />
          <StatusBadge tipo="transaccion" estado="Pendiente" />
          <StatusBadge tipo="transaccion" estado="Reembolsada" />
          <StatusBadge tipo="transaccion" estado="Expirada" />
          <Badge tone="highlight">Próximo</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ETIQUETA_ROL) as RolUsuario[]).map((r) => (
            <Badge key={r} tone={TONO_ROL[r]}>
              {ETIQUETA_ROL[r]}
            </Badge>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Avisos">
        <Alert tone="danger">No pudimos cancelar el evento. Intentá de nuevo.</Alert>
        <Alert tone="warning" title="Te quedan pocos créditos" action={<Button size="sm" variant="secondary">Comprar créditos</Button>}>
          Con tu saldo podés vender hasta 40 entradas más.
        </Alert>
        <Alert tone="success">Evento publicado.</Alert>
        <Alert tone="info">Esta pantalla se actualiza sola cada 20 segundos.</Alert>
      </Seccion>

      <Seccion titulo="Métricas">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Entradas vendidas" value="1.240" icon={Ticket} hint="de 2.000 disponibles" />
          <StatCard label="Ingresos totales" value="$14.880.000" icon={TrendingUp} emphasis="primary" />
          <StatCard label="Créditos" value="35" icon={Wallet} />
          <StatCard label="Próximo evento" value="En 3 días" icon={CalendarDays} hint="Fiesta de fin de año" emphasis="highlight" />
        </div>
      </Seccion>

      <Seccion titulo="Tarjeta con encabezado y menú de acciones">
        <Card padding="none">
          <div className="border-b border-border p-4">
            <CardHeader title="Compradores" description="3 de 3 entradas" actions={<Button size="sm" variant="secondary">Excel</Button>} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {["Juan Pérez", "Ana Gómez", "Luis Díaz"].map((n) => (
                  <tr key={n} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{n}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tipo="usuario" estado="Activo" dot size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Menu
                        label={`Acciones de ${n}`}
                        items={[
                          { label: "Suspender", icon: Ban, onSelect: () => {} },
                          { label: "Cambiar contraseña", icon: KeyRound, onSelect: () => {} },
                          { label: "Eliminar", icon: Trash2, tone: "danger", separatorBefore: true, onSelect: () => {} },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground">
          El menú de la última fila no queda recortado por el <code className="font-mono">overflow-x-auto</code> de la tabla.
        </p>
      </Seccion>

      <Seccion titulo="Carga, vacío y error">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="space-y-3" aria-busy="true">
            <span className="sr-only">Cargando…</span>
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </Card>
          <EmptyState
            icon={Sparkles}
            title="Todavía no creaste ningún evento"
            description="Creá tu primer evento y publicalo en minutos."
            action={<Button leftIcon={<Plus size={15} />}>Crear evento</Button>}
          />
          <ErrorState description="El servidor no respondió." onRetry={() => {}} />
        </div>
      </Seccion>

      <StickyActionBar summary={`${cantidad} × General`} amount={`$${(12000 * cantidad).toLocaleString("es-AR")}`}>
        <Button block size="lg">
          Comprar entradas
        </Button>
      </StickyActionBar>
    </div>
  );
}

function Seccion({ titulo, id, children }: { titulo: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-4">
      <h2 className="border-b border-border pb-2 text-base font-bold text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}
