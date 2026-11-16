import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Megaphone, Package, Pencil, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyState, ErrorState, Field, IconButton, Input, PageHeader, Skeleton, Switch, Textarea } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { fmt } from "../../lib/format";
import type {
  AnuncioEnviadoResponseDTO,
  ConfiguracionSistemaResponseDTO,
  PaqueteCreditoRequestDTO,
  PaqueteCreditoResponseDTO,
} from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDialog } from "../../lib/dialogs";

const CLAVE_BIENVENIDA = "creditos_bienvenida";
const CLAVE_PUBLICACION = "creditos_por_publicacion";
const CLAVE_EMAIL_SOPORTE = "email_soporte";
const CLAVE_WHATSAPP_SOPORTE = "whatsapp_soporte";
const DEFAULT_BIENVENIDA = 5;
const DEFAULT_PUBLICACION = 1;

export function AdminConfigPage() {
  useDocumentTitle("Configuración · Admin");
  const { confirm } = useDialog();
  const [packs, setPacks] = useState<PaqueteCreditoResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editPackId, setEditPackId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editPriceError, setEditPriceError] = useState<string | null>(null);
  const [packBusy, setPackBusy] = useState<number | null>(null);

  const [newPackOpen, setNewPackOpen] = useState(false);
  const [newPack, setNewPack] = useState({ nombre: "", cantidadCreditos: "", precio: "" });
  const [creatingPack, setCreatingPack] = useState(false);

  const [welcomeCredits, setWelcomeCredits] = useState(String(DEFAULT_BIENVENIDA));
  const [publicacionCost, setPublicacionCost] = useState(String(DEFAULT_PUBLICACION));
  const [emailSoporte, setEmailSoporte] = useState("");
  const [whatsappSoporte, setWhatsappSoporte] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const [anuncioTitulo, setAnuncioTitulo] = useState("");
  const [anuncioMensaje, setAnuncioMensaje] = useState("");
  const [enviandoAnuncio, setEnviandoAnuncio] = useState(false);

  function load() {
    setError(null);
    Promise.all([api.get<PaqueteCreditoResponseDTO[]>("/admin/paquetes-credito"), api.get<ConfiguracionSistemaResponseDTO[]>("/admin/configuraciones")])
      .then(([packsData, configsData]) => {
        setPacks(packsData);
        const map: Record<string, ConfiguracionSistemaResponseDTO> = {};
        configsData.forEach((c) => (map[c.clave] = c));
        if (map[CLAVE_BIENVENIDA]) setWelcomeCredits(map[CLAVE_BIENVENIDA].valor);
        if (map[CLAVE_PUBLICACION]) setPublicacionCost(map[CLAVE_PUBLICACION].valor);
        if (map[CLAVE_EMAIL_SOPORTE]) setEmailSoporte(map[CLAVE_EMAIL_SOPORTE].valor);
        if (map[CLAVE_WHATSAPP_SOPORTE]) setWhatsappSoporte(map[CLAVE_WHATSAPP_SOPORTE].valor);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar la configuración."));
  }

  useEffect(load, []);

  async function togglePack(p: PaqueteCreditoResponseDTO) {
    setPackBusy(p.id);
    try {
      const path = p.estado === "Activo" ? `/admin/paquetes-credito/${p.id}/deshabilitar` : `/admin/paquetes-credito/${p.id}/habilitar`;
      const updated = await api.patch<PaqueteCreditoResponseDTO>(path);
      setPacks((ps) => ps!.map((x) => (x.id === p.id ? updated : x)));
      toast.success(updated.estado === "Activo" ? `Pack ${p.nombre} activado` : `Pack ${p.nombre} desactivado`);
    } catch (e: unknown) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos actualizar el paquete.");
    } finally {
      setPackBusy(null);
    }
  }

  function startEditPrice(p: PaqueteCreditoResponseDTO) {
    setEditPackId(p.id);
    setEditPrice(String(p.precio));
    setEditPriceError(null);
  }

  function cancelEditPrice() {
    setEditPackId(null);
    setEditPriceError(null);
  }

  async function savePrice(p: PaqueteCreditoResponseDTO) {
    const precio = parseFloat(editPrice);
    // Antes un precio inválido cerraba la edición sin avisar: ahora se explica y se queda abierta.
    if (!precio || precio <= 0) {
      setEditPriceError("Ingresá un precio mayor a 0.");
      return;
    }
    setPackBusy(p.id);
    try {
      const updated = await api.put<PaqueteCreditoResponseDTO>(`/admin/paquetes-credito/${p.id}`, {
        nombre: p.nombre,
        cantidadCreditos: p.cantidadCreditos,
        precio,
      } satisfies PaqueteCreditoRequestDTO);
      setPacks((ps) => ps!.map((x) => (x.id === p.id ? updated : x)));
      toast.success(`Precio de ${p.nombre} actualizado a ${fmt(precio)}`);
      setEditPackId(null);
    } catch (e: unknown) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos actualizar el precio.");
    } finally {
      setPackBusy(null);
    }
  }

  async function createPack(e: FormEvent) {
    e.preventDefault();
    const cantidadCreditos = parseInt(newPack.cantidadCreditos, 10);
    const precio = parseFloat(newPack.precio);
    if (!newPack.nombre.trim() || !cantidadCreditos || cantidadCreditos <= 0 || !precio || precio <= 0) return;
    setCreatingPack(true);
    try {
      const created = await api.post<PaqueteCreditoResponseDTO>("/admin/paquetes-credito", {
        nombre: newPack.nombre.trim(),
        cantidadCreditos,
        precio,
      } satisfies PaqueteCreditoRequestDTO);
      setPacks((ps) => [...(ps ?? []), created]);
      setNewPack({ nombre: "", cantidadCreditos: "", precio: "" });
      setNewPackOpen(false);
      toast.success(`Pack ${created.nombre} creado`);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "No pudimos crear el paquete.");
    } finally {
      setCreatingPack(false);
    }
  }

  async function handleSaveConfig(e: FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await api.put(`/admin/configuraciones/${CLAVE_BIENVENIDA}`, {
        valor: welcomeCredits,
        descripcion: "Créditos asignados automáticamente al crear una cuenta de Organizador nueva.",
      });
      await api.put(`/admin/configuraciones/${CLAVE_PUBLICACION}`, {
        valor: publicacionCost,
        descripcion: "Créditos que cuesta publicar un evento.",
      });
      if (emailSoporte.trim()) {
        await api.put(`/admin/configuraciones/${CLAVE_EMAIL_SOPORTE}`, {
          valor: emailSoporte.trim(),
          descripcion: "Mail de contacto de soporte, visible para cualquier usuario.",
        });
      }
      if (whatsappSoporte.trim()) {
        await api.put(`/admin/configuraciones/${CLAVE_WHATSAPP_SOPORTE}`, {
          valor: whatsappSoporte.trim(),
          descripcion: "WhatsApp de contacto de soporte (número completo, sin espacios ni signos).",
        });
      }
      toast.success("Configuración guardada");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "No pudimos guardar la configuración.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function enviarAnuncio(e: FormEvent) {
    e.preventDefault();
    if (!anuncioTitulo.trim() || !anuncioMensaje.trim()) return;
    // Llega a todos los usuarios activos y no se puede retirar: se confirma antes de enviar.
    const ok = await confirm({
      titulo: "Enviar anuncio",
      mensaje: `¿Enviar "${anuncioTitulo.trim()}" como notificación a todos los usuarios activos? Una vez enviado no se puede retirar.`,
      confirmarTexto: "Enviar",
      cancelarTexto: "No, volver",
    });
    if (!ok) return;
    setEnviandoAnuncio(true);
    try {
      const { enviadas } = await api.post<AnuncioEnviadoResponseDTO>("/admin/notificaciones", {
        titulo: anuncioTitulo.trim(),
        mensaje: anuncioMensaje.trim(),
      });
      toast.success(`Anuncio enviado a ${enviadas} usuarios`);
      setAnuncioTitulo("");
      setAnuncioMensaje("");
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "No pudimos enviar el anuncio.");
    } finally {
      setEnviandoAnuncio(false);
    }
  }

  function teclasPrecio(e: KeyboardEvent<HTMLInputElement>, p: PaqueteCreditoResponseDTO) {
    if (e.key === "Enter") {
      e.preventDefault();
      void savePrice(p);
    } else if (e.key === "Escape") {
      cancelEditPrice();
    }
  }

  if (error && packs === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <ErrorState title="No pudimos cargar la configuración" description={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader title="Configuración" description="Paquetes de créditos, parámetros del sistema y anuncios." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Paquetes de créditos */}
        <Card as="section" padding="none" aria-labelledby="packs-titulo" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4 md:p-5">
            <div>
              <h2 id="packs-titulo" className="text-base font-bold text-foreground">
                Paquetes de créditos
              </h2>
              <p className="text-xs text-muted-foreground">Precios y disponibilidad para los organizadores.</p>
            </div>
            {!newPackOpen && (
              <Button variant="secondary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setNewPackOpen(true)}>
                Nuevo paquete
              </Button>
            )}
          </div>

          {newPackOpen && (
            <form onSubmit={createPack} aria-label="Nuevo paquete" className="space-y-3 border-b border-border bg-surface-sunken p-4 md:p-5">
              <Field label="Nombre">
                <Input value={newPack.nombre} onChange={(e) => setNewPack((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Pro" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Créditos">
                  <Input
                    inputMode="numeric"
                    value={newPack.cantidadCreditos}
                    onChange={(e) => setNewPack((p) => ({ ...p, cantidadCreditos: e.target.value }))}
                    placeholder="100"
                  />
                </Field>
                <Field label="Precio ($)">
                  <Input inputMode="decimal" value={newPack.precio} onChange={(e) => setNewPack((p) => ({ ...p, precio: e.target.value }))} placeholder="25000" />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setNewPackOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" loading={creatingPack} loadingText="Creando…">
                  Crear paquete
                </Button>
              </div>
            </form>
          )}

          {packs === null ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : packs.length === 0 ? (
            <EmptyState variant="plain" icon={Package} title="Todavía no hay paquetes de crédito" description="Creá el primero para que los organizadores puedan comprar créditos." />
          ) : (
            <ul className="divide-y divide-border">
              {packs.map((pack) => {
                const activo = pack.estado === "Activo";
                const editando = editPackId === pack.id;
                return (
                  <li key={pack.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 md:px-5", packBusy === pack.id && "opacity-50")}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-10 flex-none items-center justify-center rounded-xl text-xs font-bold tabular-nums",
                          activo ? "bg-secondary/12 text-secondary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {pack.cantidadCreditos}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{pack.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {pack.cantidadCreditos} créditos{!activo && " · Inactivo"}
                        </p>
                      </div>
                    </div>

                    {!editando && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold tabular-nums text-foreground">{fmt(pack.precio)}</span>
                        <IconButton label={`Editar el precio de ${pack.nombre}`} icon={<Pencil size={15} />} size="sm" onClick={() => startEditPrice(pack)} />
                      </div>
                    )}

                    <Switch
                      checked={activo}
                      onCheckedChange={() => togglePack(pack)}
                      label={`Paquete ${pack.nombre} disponible`}
                      disabled={packBusy === pack.id}
                    />

                    {/* Edición del precio en su propia fila: Enter guarda, Escape cancela. */}
                    {editando && (
                      <div className="flex w-full flex-wrap items-start gap-2 sm:pl-13">
                        <Field label={`Precio de ${pack.nombre}`} labelHidden error={editPriceError} className="w-40">
                          <Input
                            size="sm"
                            surface="sunken"
                            inputMode="decimal"
                            value={editPrice}
                            onChange={(e) => {
                              setEditPrice(e.target.value);
                              setEditPriceError(null);
                            }}
                            onKeyDown={(e) => teclasPrecio(e, pack)}
                            leadingIcon={<span className="text-xs">$</span>}
                            autoFocus
                          />
                        </Field>
                        <Button size="sm" leftIcon={<Save size={15} />} onClick={() => savePrice(pack)} aria-label={`Guardar el precio de ${pack.nombre}`}>
                          Guardar
                        </Button>
                        <Button variant="ghost" size="sm" leftIcon={<X size={15} />} onClick={cancelEditPrice}>
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Configuración global */}
        <Card as="form" onSubmit={handleSaveConfig} aria-labelledby="config-titulo" className="space-y-5">
          <div>
            <h2 id="config-titulo" className="text-base font-bold text-foreground">
              Parámetros del sistema
            </h2>
            <p className="text-xs text-muted-foreground">Se aplican a todos los organizadores.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Créditos de bienvenida" hint="Al crear una cuenta de organizador.">
              <Input inputMode="numeric" value={welcomeCredits} onChange={(e) => setWelcomeCredits(e.target.value)} />
            </Field>
            <Field label="Costo de publicar un evento" hint="En créditos, al publicar.">
              <Input inputMode="numeric" value={publicacionCost} onChange={(e) => setPublicacionCost(e.target.value)} />
            </Field>
          </div>
          <Field label="Mail de soporte" hint="Visible para cualquier usuario, incluido el comprador.">
            <Input type="email" value={emailSoporte} onChange={(e) => setEmailSoporte(e.target.value)} placeholder="soporte@asistiapp.com" />
          </Field>
          <Field label="WhatsApp de soporte (opcional)" hint="Número completo con código de país, sin espacios ni signos.">
            <Input inputMode="tel" value={whatsappSoporte} onChange={(e) => setWhatsappSoporte(e.target.value)} placeholder="5493400000000" />
          </Field>
          <Button type="submit" block loading={savingConfig} loadingText="Guardando…">
            Guardar cambios
          </Button>
        </Card>

        {/* Anuncio global */}
        <Card as="form" onSubmit={enviarAnuncio} aria-labelledby="anuncio-titulo" className="space-y-4 lg:col-span-2">
          <div>
            <h2 id="anuncio-titulo" className="flex items-center gap-2 text-base font-bold text-foreground">
              <Megaphone size={16} aria-hidden="true" className="text-secondary" />
              Anuncio global
            </h2>
            <p className="text-xs text-muted-foreground">Llega como notificación in-app a todos los usuarios activos.</p>
          </div>
          <Field label="Título">
            <Input value={anuncioTitulo} onChange={(e) => setAnuncioTitulo(e.target.value)} placeholder="Título (ej. Mantenimiento programado)" maxLength={150} />
          </Field>
          <Field label="Mensaje" hint={`${anuncioMensaje.length} / 1000`}>
            <Textarea value={anuncioMensaje} onChange={(e) => setAnuncioMensaje(e.target.value)} placeholder="Mensaje" maxLength={1000} rows={3} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" leftIcon={<Megaphone size={16} />} disabled={!anuncioTitulo.trim() || !anuncioMensaje.trim()} loading={enviandoAnuncio} loadingText="Enviando…">
              Enviar anuncio
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
