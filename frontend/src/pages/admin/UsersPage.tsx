import { useEffect, useState } from "react";
import { Check, CircleX, KeyRound, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import type { RolUsuario, UsuarioResponseDTO } from "../../lib/types";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useDialog } from "../../lib/dialogs";
import { Badge, Card, EmptyState, ErrorState, Input, Menu, PageHeader, SelectMenu, Skeleton, StatusBadge } from "../../components/ui";
import { cn } from "../../lib/cn";
import { ETIQUETA_ROL, TONO_ROL } from "../../lib/estados";

const ROLES: RolUsuario[] = ["Administrador", "Organizador", "Staff_QR", "Staff_Vendedor"];

export function AdminUsersPage() {
  useDocumentTitle("Usuarios · Admin");
  const { confirm, prompt } = useDialog();
  const [users, setUsers] = useState<UsuarioResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | RolUsuario>("todos");
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    api
      .get<UsuarioResponseDTO[]>("/admin/usuarios")
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los usuarios."));
  }

  useEffect(load, []);

  function reintentar() {
    setError(null);
    load();
  }

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === "todos" || u.rol === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function toggleStatus(u: UsuarioResponseDTO) {
    setBusyId(u.id);
    try {
      const path = u.estado === "Activo" ? `/admin/usuarios/${u.id}/suspender` : `/admin/usuarios/${u.id}/activar`;
      const updated = await api.patch<UsuarioResponseDTO>(path);
      setUsers((us) => us!.map((x) => (x.id === u.id ? updated : x)));
      toast.success(updated.estado === "Activo" ? `${u.nombre} reactivado` : `${u.nombre} suspendido`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos actualizar el estado.";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(u: UsuarioResponseDTO) {
    const nueva = await prompt({
      titulo: "Cambiar contraseña",
      mensaje: `Nueva contraseña para ${u.nombre} (${u.email}).`,
      etiqueta: "Nueva contraseña",
      placeholder: "Mínimo 8 caracteres",
      tipo: "password",
      confirmarTexto: "Guardar",
      validar: (v) => (v.trim().length >= 8 ? null : "La contraseña debe tener al menos 8 caracteres."),
    });
    if (nueva === null) return;
    setBusyId(u.id);
    try {
      await api.patch(`/admin/usuarios/${u.id}/password`, { nuevaPassword: nueva });
      toast.success(`Contraseña de ${u.nombre} actualizada`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos cambiar la contraseña.";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: UsuarioResponseDTO) {
    const ok = await confirm({
      titulo: "Eliminar usuario",
      mensaje: `¿Eliminar a ${u.nombre} (${u.email}) definitivamente? Esta acción no se puede deshacer.`,
      confirmarTexto: "Eliminar",
      variante: "destructiva",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await api.delete(`/admin/usuarios/${u.id}`);
      setUsers((us) => us!.filter((x) => x.id !== u.id));
      toast.success(`${u.nombre} eliminado`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "No pudimos eliminar el usuario.";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  const hayFiltros = search.trim() !== "" || roleFilter !== "todos";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Usuarios"
        description={users === null ? "Todas las cuentas del sistema." : `${users.length} ${users.length === 1 ? "usuario" : "usuarios"} en el sistema.`}
      />

      {error && users === null && <ErrorState title="No pudimos cargar los usuarios" description={error} onRetry={reintentar} />}

      {!error && users === null && (
        <div className="space-y-2" aria-busy="true">
          <span className="sr-only">Cargando usuarios…</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {users !== null && (
        <Card as="section" padding="none" aria-label="Lista de usuarios" className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row md:p-5">
            <Input
              type="search"
              size="sm"
              surface="sunken"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              aria-label="Buscar usuarios por nombre o email"
              leadingIcon={<Search size={15} />}
              className="min-w-0 sm:flex-1"
            />
            <SelectMenu
              size="sm"
              surface="sunken"
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as typeof roleFilter)}
              aria-label="Filtrar por rol"
              className="sm:w-48"
              options={[{ value: "todos", label: "Todos los roles" }, ...ROLES.map((r) => ({ value: r, label: ETIQUETA_ROL[r] }))]}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={Users}
              title={hayFiltros ? "Ningún usuario coincide con la búsqueda" : "Todavía no hay usuarios"}
            />
          ) : (
            // Una sola tabla: desde lg se ve como tabla; en mobile/tablet cada fila es una tarjeta
            // (flex). Así no se duplica el contenido para lectores de pantalla.
            <table className="w-full text-sm">
              <thead className="sr-only lg:not-sr-only">
                <tr className="border-b border-border bg-surface-sunken text-2xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Usuario</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Email</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Rol</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Estado</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className={cn(
                      "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-surface-sunken lg:table-row lg:p-0",
                      busyId === u.id && "opacity-50",
                    )}
                  >
                    <td className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] lg:px-5 lg:py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-9 flex-none items-center justify-center rounded-full bg-secondary/12 text-xs font-bold text-secondary"
                        >
                          {u.nombre.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{u.nombre}</p>
                          <p className="truncate text-xs text-muted-foreground lg:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden max-w-64 truncate px-4 py-3 text-muted-foreground lg:table-cell">{u.email}</td>
                    <td className="order-3 basis-auto pl-12 lg:order-none lg:table-cell lg:px-4 lg:py-3">
                      <Badge tone={TONO_ROL[u.rol]} size="sm">
                        {ETIQUETA_ROL[u.rol]}
                      </Badge>
                    </td>
                    <td className="order-4 lg:order-none lg:table-cell lg:px-4 lg:py-3">
                      <StatusBadge tipo="usuario" estado={u.estado} size="sm" dot />
                    </td>
                    <td className="order-2 flex-none lg:order-none lg:table-cell lg:px-5 lg:py-3 lg:text-right">
                      {/* Menú en portal: no lo recorta ningún overflow. */}
                      <Menu
                        label={`Acciones de ${u.nombre}`}
                        disabled={busyId === u.id}
                        placement="bottom-end"
                        items={[
                          u.estado === "Activo"
                            ? { label: "Suspender", icon: CircleX, onSelect: () => toggleStatus(u) }
                            : { label: "Activar", icon: Check, onSelect: () => toggleStatus(u) },
                          { label: "Cambiar contraseña", icon: KeyRound, onSelect: () => resetPassword(u) },
                          { label: "Eliminar", icon: Trash2, tone: "danger", separatorBefore: true, onSelect: () => deleteUser(u) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
