import { useEffect, useState } from "react";
import { KeyRound, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, RadioCardGroup, SelectMenu, Skeleton } from "../../components/ui";
import { cn } from "../../lib/cn";
import { ETIQUETA_ROL, TONO_ROL } from "../../lib/estados";
import type { CrearStaffQRRequestDTO, CrearStaffVendedorRequestDTO, EventoResponseDTO, StaffResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDialog } from "../../lib/dialogs";

const ROLE_META: Record<"Staff_QR" | "Staff_Vendedor", { label: string; desc: string }> = {
  Staff_QR: { label: "Staff QR", desc: "Escanea las entradas en la puerta" },
  Staff_Vendedor: { label: "Staff Vendedor", desc: "Vende y genera entradas en el evento" },
};

/**
 * Solo tiene sentido asignar staff nuevo a un evento Publicado que todavía no terminó —
 * uno Cancelado o ya finalizado no tiene nada para validar/vender, y uno en Borrador
 * todavía no tiene tandas en venta. El selector "Evento asignado" no debe ofrecerlos,
 * aunque sigan en la lista general (que también alimenta el nombre de staff ya asignado
 * a eventos viejos, y a esa sí hay que mostrarle todo).
 */
export function eventoDisponibleParaStaff(ev: EventoResponseDTO): boolean {
  if (ev.estado !== "Publicado") return false;
  // Sin "Z": se interpreta en hora local, igual que fechaEvento/horaEvento (LocalDate/LocalTime del backend).
  return new Date(`${ev.fechaEvento}T${ev.horaEvento}`) > new Date();
}

export function OrganizadorStaffMgmtPage() {
  useDocumentTitle("Staff");
  const { confirm, alert } = useDialog();
  const [staff, setStaff] = useState<StaffResponseDTO[] | null>(null);
  const [eventos, setEventos] = useState<EventoResponseDTO[]>([]);
  const [errorEventos, setErrorEventos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState<{ nombre: string; email: string; role: "Staff_QR" | "Staff_Vendedor"; idEvento: string }>({
    nombre: "",
    email: "",
    role: "Staff_QR",
    idEvento: "",
  });

  function cargarStaff() {
    api
      .get<StaffResponseDTO[]>("/organizador/staff")
      .then(setStaff)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar tu staff."));
  }

  // Los eventos alimentan el selector "Evento asignado" (obligatorio para ambos roles) y el nombre del evento en cada
  // tarjeta: si falla, hay que avisarlo en vez de dejar el selector vacío sin explicación.
  function cargarEventos() {
    setErrorEventos(false);
    api
      .get<EventoResponseDTO[]>("/eventos")
      .then(setEventos)
      .catch(() => setErrorEventos(true));
  }

  useEffect(() => {
    cargarStaff();
    cargarEventos();
  }, []);

  async function addStaff() {
    if (!form.nombre.trim() || !form.email.trim() || !form.idEvento) return;

    setSaving(true);
    setError(null);
    try {
      if (form.role === "Staff_QR") {
        const dto: CrearStaffQRRequestDTO = { nombre: form.nombre, email: form.email, idEvento: Number(form.idEvento) };
        await api.post("/organizador/staff/qr", dto);
      } else {
        const dto: CrearStaffVendedorRequestDTO = { nombre: form.nombre, email: form.email, idEvento: Number(form.idEvento) };
        await api.post("/organizador/staff/vendedor", dto);
      }
      toast.success(`${form.nombre} se agregó como ${ROLE_META[form.role].label}`);
      setForm({ nombre: "", email: "", role: "Staff_QR", idEvento: "" });
      setShowForm(false);
      cargarStaff();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos agregar el miembro de staff.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(member: StaffResponseDTO) {
    const ok = await confirm({
      titulo: "Generar contraseña nueva",
      mensaje: `¿Generar una contraseña nueva para ${member.nombre}? La anterior deja de funcionar.`,
      confirmarTexto: "Generar",
    });
    if (!ok) return;
    setBusyId(member.id);
    setError(null);
    try {
      const { passwordTemporal } = await api.post<{ passwordTemporal: string }>(
        `/organizador/staff/${member.id}/resetear-password`,
      );
      toast.success(`Contraseña nueva de ${member.nombre}: ${passwordTemporal}`, { duration: 30000 });
      await alert({
        titulo: "Contraseña temporal",
        mensaje: `Contraseña temporal de ${member.nombre} (${member.email}). Pasásela al staff; también se le envió por email.`,
        copiable: passwordTemporal,
      });
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos resetear la contraseña.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleEstado(member: StaffResponseDTO) {
    setBusyId(member.id);
    setError(null);
    try {
      const accion = member.estado === "Inactivo" ? "reactivar" : "desactivar";
      const updated = await api.patch<StaffResponseDTO>(`/organizador/staff/${member.id}/${accion}`);
      setStaff((s) => s!.map((m) => (m.id === member.id ? updated : m)));
      toast.success(accion === "reactivar" ? `${member.nombre} fue reactivado` : `${member.nombre} fue dado de baja`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos actualizar el estado.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  const eventosDisponibles = eventos.filter(eventoDisponibleParaStaff);
  const formularioValido = form.nombre.trim() !== "" && form.email.trim() !== "" && form.idEvento !== "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Staff"
        description="Las personas que validan entradas en la puerta (Staff QR) o venden en el evento (Staff Vendedor)."
        actions={
          !showForm && (
            <Button leftIcon={<UserPlus size={16} />} onClick={() => setShowForm(true)}>
              Agregar miembro de staff
            </Button>
          )
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <div className={cn("grid gap-6", showForm && "lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start")}>
        {/* Staff asignado */}
        <Card as="section" padding="none" aria-labelledby="staff-titulo" className="overflow-hidden">
          <h2 id="staff-titulo" className="border-b border-border px-4 py-4 font-display text-base font-bold tracking-tight text-foreground md:px-5">
            Staff asignado {staff !== null && `(${staff.length})`}
          </h2>
          {staff === null ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={Users}
              title="Todavía no agregaste a nadie"
              description="Sumá a quien va a escanear entradas en la puerta o vender en el evento. Recibe sus credenciales por email."
            />
          ) : (
            <ul className="divide-y divide-border">
              {staff.map((member) => {
                const inactivo = member.estado === "Inactivo";
                const eventoAsignado = eventos.find((e) => e.id === member.idEvento)?.nombre;
                const ocupado = busyId === member.id;
                return (
                  <li key={member.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center md:px-5">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-10 flex-none items-center justify-center rounded-full bg-secondary/12 text-sm font-bold text-secondary"
                      >
                        {member.nombre.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-semibold text-foreground">{member.nombre}</span>
                          <Badge tone={TONO_ROL[member.rol]} size="sm">
                            {ETIQUETA_ROL[member.rol]}
                          </Badge>
                          {inactivo && (
                            <Badge tone="neutral" size="sm">
                              Inactivo
                            </Badge>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        {eventoAsignado && <p className="truncate text-xs text-muted-foreground">Evento: {eventoAsignado}</p>}
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-2 pl-13 sm:pl-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<KeyRound size={15} />}
                        disabled={ocupado}
                        onClick={() => resetPassword(member)}
                        aria-label={`Resetear contraseña de ${member.nombre}`}
                      >
                        Contraseña
                      </Button>
                      <Button variant={inactivo ? "link" : "danger-subtle"} size="sm" disabled={ocupado} onClick={() => toggleEstado(member)}>
                        {inactivo ? "Reactivar" : "Dar de baja"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Alta */}
        {showForm && (
          <Card as="section" aria-labelledby="nuevo-staff-titulo" className="space-y-4 lg:sticky lg:top-6">
            <h2 id="nuevo-staff-titulo" className="font-display text-base font-bold tracking-tight text-foreground">
              Nuevo miembro de staff
            </h2>
            <Field label="Nombre completo" required>
              <Input
                surface="sunken"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Martín Gómez"
                autoComplete="off"
              />
            </Field>
            <Field label="Email" required hint="Le enviamos sus credenciales a este email.">
              <Input
                surface="sunken"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="martin@mail.com"
                autoComplete="off"
              />
            </Field>
            <RadioCardGroup<"Staff_QR" | "Staff_Vendedor">
              label="Rol"
              value={form.role}
              onChange={(r) => setForm((f) => ({ ...f, role: r }))}
              options={(["Staff_QR", "Staff_Vendedor"] as const).map((r) => ({
                value: r,
                label: ROLE_META[r].label,
                description: ROLE_META[r].desc,
              }))}
            />
            <Field
              label="Evento asignado"
              required
              hint={
                !errorEventos && eventos.length > 0 && eventosDisponibles.length === 0
                  ? "No tenés eventos publicados todavía vigentes — publicá uno para poder asignarle staff."
                  : form.role === "Staff_QR"
                    ? "Solo va a poder validar entradas de este evento."
                    : "Solo va a poder vender entradas de este evento."
              }
            >
              <SelectMenu
                surface="sunken"
                value={form.idEvento}
                onChange={(idEvento) => setForm((f) => ({ ...f, idEvento }))}
                disabled={errorEventos}
                placeholder="Elegí un evento…"
                options={eventosDisponibles.map((ev) => ({ value: String(ev.id), label: ev.nombre }))}
              />
            </Field>
            {errorEventos && (
              <p role="alert" className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-destructive">
                No pudimos cargar tus eventos, y sin elegir uno no se puede agregar staff.
                <Button variant="link" size="sm" onClick={cargarEventos}>
                  Reintentar
                </Button>
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" block onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button block disabled={!formularioValido} loading={saving} loadingText="Agregando…" onClick={addStaff}>
                Agregar
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Alert tone="info">
        El staff recibe sus credenciales por email y entra desde la pantalla de <strong className="font-semibold">Staff</strong> en la app.
      </Alert>
    </div>
  );
}
