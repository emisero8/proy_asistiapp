import { useEffect, useState } from "react";
import { Check, CircleX, Search, Trash2, UserCheck } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { RolUsuario, UsuarioResponseDTO } from "../../lib/types";

const ROLE_COLORS: Record<RolUsuario, string> = {
  Administrador: "bg-sky-400/15 text-sky-400",
  Organizador: "bg-violet-400/15 text-violet-400",
  Staff_QR: "bg-amber-400/15 text-amber-400",
  Staff_Vendedor: "bg-amber-400/15 text-amber-400",
};

const ROLES: RolUsuario[] = ["Administrador", "Organizador", "Staff_QR", "Staff_Vendedor"];

export function AdminUsersPage() {
  const [users, setUsers] = useState<UsuarioResponseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | RolUsuario>("todos");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [roleMenuFor, setRoleMenuFor] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    api
      .get<UsuarioResponseDTO[]>("/admin/usuarios")
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "No pudimos cargar los usuarios."));
  }

  useEffect(load, []);

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === "todos" || u.rol === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function toggleStatus(u: UsuarioResponseDTO) {
    setBusyId(u.id);
    setOpenMenu(null);
    try {
      const path = u.estado === "Activo" ? `/admin/usuarios/${u.id}/suspender` : `/admin/usuarios/${u.id}/activar`;
      const updated = await api.patch<UsuarioResponseDTO>(path);
      setUsers((us) => us!.map((x) => (x.id === u.id ? updated : x)));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos actualizar el estado.");
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(u: UsuarioResponseDTO, nuevoRol: RolUsuario) {
    setBusyId(u.id);
    setRoleMenuFor(null);
    setOpenMenu(null);
    try {
      const updated = await api.patch<UsuarioResponseDTO>(`/admin/usuarios/${u.id}/rol`, { nuevoRol });
      setUsers((us) => us!.map((x) => (x.id === u.id ? updated : x)));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos reasignar el rol.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: UsuarioResponseDTO) {
    setOpenMenu(null);
    if (!window.confirm(`¿Eliminar a ${u.nombre} (${u.email}) definitivamente?`)) return;
    setBusyId(u.id);
    try {
      await api.delete(`/admin/usuarios/${u.id}`);
      setUsers((us) => us!.filter((x) => x.id !== u.id));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "No pudimos eliminar el usuario.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="min-h-screen bg-background"
      onClick={() => {
        setOpenMenu(null);
        setRoleMenuFor(null);
      }}
    >
      <div className="px-4 lg:px-8 pt-8 pb-5 border-b border-border">
        <h1 className="text-xl font-extrabold text-foreground">Gestión de Usuarios</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{users?.length ?? 0} usuarios en el sistema</p>
      </div>

      <div className="px-4 lg:px-8 py-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          >
            <option value="todos">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-4">{error}</div>}

        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                {["Usuario", "Email", "Rol", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={`${i < filtered.length - 1 ? "border-b border-border" : ""} hover:bg-muted/30 transition-colors ${busyId === u.id ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-none">
                        {u.nombre.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[u.rol]}`}>{u.rol}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.estado === "Activo" ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className={`text-xs font-semibold ${u.estado === "Activo" ? "text-emerald-400" : "text-red-400"}`}>{u.estado}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        disabled={busyId === u.id}
                        onClick={() => {
                          setOpenMenu(openMenu === u.id ? null : u.id);
                          setRoleMenuFor(null);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ···
                      </button>
                      {openMenu === u.id && (
                        <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[170px]">
                          <button
                            onClick={() => toggleStatus(u)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            {u.estado === "Activo" ? (
                              <>
                                <CircleX size={13} className="text-red-400" />
                                Suspender
                              </>
                            ) : (
                              <>
                                <Check size={13} className="text-emerald-400" />
                                Activar
                              </>
                            )}
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setRoleMenuFor(roleMenuFor === u.id ? null : u.id)}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                            >
                              <UserCheck size={13} className="text-primary" />
                              Cambiar Rol
                            </button>
                            {roleMenuFor === u.id && (
                              <div className="absolute right-full top-0 mr-1 bg-card border border-border rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[150px]">
                                {ROLES.filter((r) => r !== u.rol).map((r) => (
                                  <button
                                    key={r}
                                    onClick={() => changeRole(u, r)}
                                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="border-t border-border" />
                          <button
                            onClick={() => deleteUser(u)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={13} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users !== null && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No se encontraron usuarios.</p>
            </div>
          )}
          {users === null && !error && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">Cargando…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
