# Migraciones a mano

`ddl-auto: update` crea las tablas y columnas nuevas al arrancar, pero **no cambia constraints de tablas que ya existen** (por ejemplo el CHECK de una columna enum cuando se agrega un valor). Estos scripts cubren ese hueco y además dejan las columnas nuevas para bases donde se aplican los cambios a mano.

- **Base vacía:** no hace falta correr ninguno.
- **Base existente (la tuya de antes, o un entorno compartido):** aplicá **todos, en orden de nombre**. Son **idempotentes**: se pueden volver a correr sin romper nada.
- Si algo devuelve 500 al anular una entrada, marcar una orden como vencida/reembolsada o publicar un anuncio global, casi seguro falta alguno.

## Cómo aplicarlos

Con `psql` en el PATH (si no, el ejecutable está en `C:\Program Files\PostgreSQL\<versión>\bin\psql.exe`):

```powershell
# Windows (PowerShell), desde la carpeta backend
./db/aplicar-migraciones.ps1                       # base asistiapp_db en localhost, usuario postgres
./db/aplicar-migraciones.ps1 -Password 1234 -Db otra_base -DbHost localhost
```

```bash
# macOS / Linux / Git Bash, desde la carpeta backend
for f in db/migraciones/*.sql; do psql -h localhost -U postgres -d asistiapp_db -f "$f"; done
```

## Qué hace cada una

| Archivo | Para qué |
|---|---|
| `2026-10-06-tipos-movimiento-tanda.sql` | Nuevos tipos de movimiento de créditos de las tandas (CHECK) |
| `2026-10-15-mercadopago-ordenes.sql` | Estados `Expirada` y `Reembolsada` de las órdenes (CHECK) |
| `2026-10-22-log-auditoria-entidad-nullable.sql` | El log de auditoría admite acciones sin entidad (anuncio global) |
| `2026-11-12-limpiar-contrasenas-del-log-auditoria.sql` | Borra contraseñas en texto plano que dejó el log viejo |
| `2026-11-18-entradas-emision-organizador.sql` | 8.2: entradas que emite el Organizador (cortesía / pago externo) |
| `2026-11-19-staff-vendedor-tope-entradas.sql` | 8.3: tope de entradas por Staff Vendedor |
| `2026-11-20-organizador-tope-por-comprador.sql` | 8.9: tope por comprador de cada Organizador |
| `2026-11-21-tandas-solo-emision.sql` | 8.10: tanda de cortesía |
| `2026-11-22-organizador-contacto-arrepentimiento.sql` | 8.8: contacto del botón de arrepentimiento |
| `2026-11-23-entradas-anulacion-reembolso.sql` | 8.6: estado `Anulada` (CHECK) y columnas de anulación y reembolso |
| `2026-11-24-organizador-terminos.sql` | 8.7: fecha y versión de los términos aceptados al registrarse |
| `2026-11-25-cargo-servicio-mercadopago.sql` | Mi perfil: quién paga la comisión de Mercado Pago (plazo y zona) y el cargo por entrada de cada orden |

Al agregar un valor a un enum o cambiar una restricción, **creá un script nuevo acá** (nombre `AAAA-MM-DD-tema.sql`, idempotente, con un comentario que diga qué ítem lo pide) y agregalo a esta tabla.
