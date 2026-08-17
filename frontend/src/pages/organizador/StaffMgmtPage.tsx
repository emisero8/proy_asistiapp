import { useEffect, useState } from "react";
import { UserPlus, QrCode, Store, BadgeCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import type { CrearStaffQRRequestDTO, CrearStaffVendedorRequestDTO, EventoResponseDTO, RolUsuario, StaffResponseDTO } from "../../lib/types";

const ROLE_META: Record<"Staff_QR" | "Staff_Vendedor", { label: string; desc: string; icon: typeof QrCode; color: string; bg: string }> = {
  Staff_QR: { label: "Staff QR", desc: "Escanea entradas en la puerta", icon: QrCode, color: "text-violet-400", bg: "bg-violet-400/10" },
  Staff_Vendedor: { label: "Staff Vendedor", desc: "Vende y genera entradas en el evento", icon: Store, color: "text-amber-400", bg: "bg-amber-400/10" },
};

export function OrganizadorStaffMgmtPage() {
  const [staff, setStaff] = useState<StaffResponseDTO[] | null>(null);
  const [eventos, setEventos] = useState<EventoResponseDTO[]>([]);
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

  useEffect(() => {
    cargarStaff();
    api.get<EventoResponseDTO[]>("/eventos").then(setEventos).catch(() => {});
  }, []);

  async function addStaff() {
    if (!form.nombre.trim() || !form.email.trim()) return;
    if (form.role === "Staff_QR" && !form.idEvento) return;

    setSaving(true);
    setError(null);
    try {
      if (form.role === "Staff_QR") {
        const dto: CrearStaffQRRequestDTO = { nombre: form.nombre, email: form.email, idEvento: Number(form.idEvento) };
        await api.post("/organizador/staff/qr", dto);
      } else {
        const dto: CrearStaffVendedorRequestDTO = { nombre: form.nombre, email: form.email };
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

  return (
    <div className="max-w-md lg:max-w-4xl mx-auto">
      <div className="px-4 lg:px-8 pt-6 pb-4 border-b border-border bg-background">
        <h2 className="text-lg lg:text-xl font-extrabold text-foreground">Gestión de Staff</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Staff QR y Vendedor de tus eventos</p>
      </div>

      <div className="px-4 lg:px-8 py-4 lg:py-6 space-y-4 pb-8">
        <div className="grid grid-cols-2 lg:w-2/3 gap-3">
          {(Object.entries(ROLE_META) as [RolUsuario, (typeof ROLE_META)["Staff_QR"]][]).map(([key, m]) => (
            <div key={key} className="bg-card border border-border rounded-2xl p-3.5">
              <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center mb-2`}>
                <m.icon size={15} className={m.color} />
              </div>
              <p className="text-xs font-bold text-foreground">{m.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{m.desc}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4 flex gap-2">
            <AlertCircle size={15} className="flex-none mt-0.5" />
            {error}
          </div>
        )}

        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Staff asignado {staff !== null && `(${staff.length})`}</p>
          {staff === null ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no agregaste a nadie.</p>
          ) : (
            <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
              {staff.map((member) => {
                const meta = ROLE_META[member.rol as "Staff_QR" | "Staff_Vendedor"];
                const inactivo = member.estado === "Inactivo";
                return (
                  <div key={member.id} className={`bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center justify-between gap-2 ${inactivo ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-none">
                        {member.nombre.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{member.nombre}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inactivo ? "bg-muted text-muted-foreground" : `${meta?.bg} ${meta?.color}`}`}>
                        {inactivo ? "Inactivo" : (meta?.label ?? member.rol)}
                      </span>
                      <button
                        disabled={busyId === member.id}
                        onClick={() => toggleEstado(member)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                          inactivo ? "text-primary hover:bg-primary/10" : "text-red-400 hover:bg-red-400/10"
                        }`}
                      >
                        {inactivo ? "Reactivar" : "Dar de baja"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showForm ? (
          <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3 lg:max-w-md">
            <p className="text-xs font-bold text-foreground">Nuevo miembro de staff</p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nombre completo</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Martín Gómez"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="martin@mail.com"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rol</label>
              <div className="grid grid-cols-2 gap-2">
                {(["Staff_QR", "Staff_Vendedor"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      form.role === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {ROLE_META[r].label}
                  </button>
                ))}
              </div>
            </div>
            {form.role === "Staff_QR" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Evento asignado</label>
                <select
                  value={form.idEvento}
                  onChange={(e) => setForm((f) => ({ ...f, idEvento: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option value="">Elegí un evento...</option>
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-muted/70 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                onClick={addStaff}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Agregando..." : "Agregar"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full lg:w-auto lg:px-8 py-3.5 rounded-2xl border border-dashed border-border text-muted-foreground text-sm flex items-center justify-center gap-2 hover:border-primary/50 hover:text-foreground transition-all"
          >
            <UserPlus size={15} />
            Agregar miembro de staff
          </button>
        )}

        <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3 flex gap-3 lg:max-w-lg">
          <BadgeCheck size={16} className="text-primary flex-none mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            El staff recibe sus credenciales por email y accede desde la pantalla de <strong className="text-foreground">Staff</strong> en la app.
          </p>
        </div>
      </div>
    </div>
  );
}
