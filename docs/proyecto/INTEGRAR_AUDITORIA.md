# Integrar la rama de auditoría (`feature-auditoria`) — instrucciones para el agente

> **Para quién:** el asistente de código (Claude u otra IA) de quien traiga estos cambios a su máquina, o los junte con otra rama. También sirve para una persona: son pasos concretos.
> **Cuándo aplica:** si en tu rama aparece el archivo `backend/db/migraciones/2026-11-25-log-auditoria-legible.sql` y tu base de datos local (o la de un entorno compartido) se creó **antes** de traerlo.
> **No contiene credenciales.** Si un paso pide una contraseña de base que no está en las variables de entorno, preguntásela a la persona; no la inventes ni la escribas en ningún archivo.

## Qué cambió (en 4 líneas)

- La auditoría (`log_auditoria`) ahora registra lo que hacen el **Admin, el Organizador y su Staff**, con nombre, rol e id de quien lo hizo y de lo afectado, y un detalle legible.
- La columna `id_admin` **se renombró** a `id_emisor`, y hay columnas nuevas: `emisor_nombre`, `emisor_rol` y `entidad_nombre`.
- `ddl-auto: update` **no renombra columnas**: sin el script, el backend nuevo falla al guardar auditoría (o crea `id_emisor` vacía al lado de `id_admin`).
- `GET /admin/auditoria` devuelve una página (`PaginaAuditoriaResponseDTO`) con filtros, no una lista.

Detalle completo: `docs/tecnica/backend_implementation_plan.md` (Fase 23 y 23.2), `docs/tecnica/frontend_implementation_plan.md` (Fase 16 y 16.2) y `docs/proyecto/DECISIONES.md` (filas del 2026-11-25).

## Pasos (en este orden)

### 1. Traer los cambios

Si hay conflictos al mergear, mirá la sección **"Conflictos probables"** más abajo antes de resolverlos.

### 2. Frenar el backend si está corriendo

El script conviene correrlo **antes** de arrancar el backend nuevo. Si ya lo arrancaste, no pasa nada: el script lo contempla. Igual frenalo mientras corre la migración.

### 3. Aplicar la migración sobre la base existente

Desde la carpeta `backend`, en PowerShell (aplica todos los scripts de `db/migraciones` en orden; son idempotentes, se pueden repetir):

```powershell
./db/aplicar-migraciones.ps1                      # base asistiapp_db en localhost, usuario postgres
./db/aplicar-migraciones.ps1 -Password <la de su Postgres> -Db <otra_base>   # si es distinta
```

O solo este script, con `psql`:

```bash
psql -h localhost -U postgres -d asistiapp_db -v ON_ERROR_STOP=1 -f db/migraciones/2026-11-25-log-auditoria-legible.sql
```

Si `psql` no está en el PATH, en Windows está en `C:\Program Files\PostgreSQL\<versión>\bin\psql.exe`.

- **Base vacía (recién creada):** no hace falta; Hibernate crea la tabla ya con las columnas nuevas.
- **Otra base (entorno compartido, deploy):** también hay que correrlo ahí, con la conexión de ese entorno.

### 4. Verificar que quedó bien

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'log_auditoria' ORDER BY 1;
```

Tiene que haber `id_emisor`, `emisor_nombre`, `emisor_rol` y `entidad_nombre`, y **no** tiene que haber `id_admin` ni `admin_nombre`. Además:

```sql
SELECT count(*) FROM log_auditoria WHERE emisor_rol IS NULL;   -- tiene que dar 0
```

### 5. Arrancar y probar

1. `cd backend && mvn clean test`: tiene que dar 0 fallos. Si aparecen errores raros de compilación, el `clean` es justamente para eso.
2. Arrancar el backend y el frontend como siempre.
3. Entrar como Administrador a `/admin/login` → **Auditoría**. Tienen que verse las acciones viejas con el nombre del admin, los chips de rol (Todos · Administradores · Organizadores · Staff Vendedor · Staff QR) y "Filas por página" abajo.

No hace falta regenerar el contrato del frontend (`npm run types:api`): `frontend/openapi.json` y `src/lib/api-schema.d.ts` ya vienen actualizados en la rama. Hay que regenerarlo solo si, después de mergear, `OpenApiContratoTest` falla (ver abajo).

## Conflictos probables al juntar con otra rama

| Archivo | Qué hacer |
|---|---|
| `frontend/openapi.json`, `frontend/src/lib/api-schema.d.ts` | No resolver a mano. Quedarse con cualquiera de las dos versiones, levantar el backend ya mergeado y correr `cd frontend && npm run types:api`, después `npx tsc -b`. |
| `frontend/src/lib/types.ts` | Conservar los dos lados. `LogAuditoriaResponseDTO` usa `idEmisor`, `emisorNombre` y `emisorRol` (ya no `idAdmin`), y existe `PaginaAuditoriaResponseDTO`. |
| Servicios del backend (`EventoService`, `TandaService`, `GestionStaffService`, `PerfilService`, `VentaService`, `StaffQRService`, `ReembolsoEntradaService`, `VinculacionMercadoPagoService`, `services/admin/*`) | Mantener la lógica de negocio de la otra rama **y** las líneas `@Auditable(...)` y `AuditoriaContexto.*` de esta. Las de auditoría solo describen; no cambian el comportamiento. |
| `docs/...` (planes, `DECISIONES.md`, `API.md`) | Conservar las entradas de las dos ramas. |
| `backend/db/migraciones/README.md` | Conservar todas las filas de la tabla, en orden de nombre de archivo. |

## Si la otra rama agrega métodos que cambian datos

La auditoría no es automática para código nuevo. Para que una acción nueva quede registrada:

1. Anotar el método del servicio con `@Auditable(accion = "CODIGO_NUEVO", entidad = "Tipo")`.
2. Dentro del método, describir qué pasó con `AuditoriaContexto.objetivo(id, nombre)`, `AuditoriaContexto.detalle("...")` y `AuditoriaContexto.cambio("Campo", antes, despues)`. Ver ejemplos en `TandaService` o `GestionStaffService`.
3. Agregar `CODIGO_NUEVO` al mapa `ACCIONES` de `frontend/src/lib/auditoria.ts`, con su grupo, etiqueta, verbo, tono e ícono. **Si se olvida, `AccionesAuditadasEnElFrontendTest` falla**: es a propósito.
4. Nunca escribir contraseñas, tokens ni secretos en el detalle.

## Si algo sale mal

- **El backend arrancó antes de la migración y la auditoría da error 500:** correr el script igual (paso 3). Si encuentra `id_admin` e `id_emisor` juntas, copia los valores y borra la vieja.
- **La suite e2e deja filas de auditoría:** `psql -U postgres -d asistiapp_db -f frontend/e2e/limpiar.sql` ya las borra junto con las cuentas `e2e.*`.
