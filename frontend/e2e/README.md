# Suite end-to-end (Playwright)

Prueba el sistema **real**: frontend en el navegador contra el backend y la base locales. Cubre los cuatro flujos principales:

| Archivo | Qué recorre |
|---|---|
| `publicacion.spec.ts` | Un Organizador crea un evento con el asistente (fecha, hora, lugar, tanda), lo publica y aparece en el catálogo público. |
| `compra.spec.ts` | Un comprador elige una tanda, completa sus datos y se abre el pago de MercadoPago. **No se paga de verdad**: el login de MercadoPago dispara reCAPTCHA y el pago como invitado falla. La pestaña de MercadoPago se intercepta. |
| `vendedor.spec.ts` | El Staff Vendedor inicia sesión y vende una entrada en el POS. |
| `escaneo.spec.ts` | El Staff QR inicia sesión, valida una entrada con su código (la cámara no se puede probar) y la segunda vez la rechaza. |

## Cómo correrla

1. **Backend sin mails reales.** El alta de staff y la venta manual mandan mails; con tu `.env` saldrían por Gmail a direcciones inexistentes. Arrancá el backend apuntando el SMTP a un puerto vacío (los errores de envío se loguean y no rompen nada):

   ```powershell
   cd backend
   $env:SMTP_HOST='localhost'; $env:SMTP_PORT='1025'; $env:SMTP_USERNAME=''; $env:SMTP_PASSWORD=''; $env:SMTP_AUTH='false'; $env:SMTP_STARTTLS='false'
   mvn spring-boot:run
   ```
   Agregá también `$env:MP_EXIGIR_CUENTA_VINCULADA='false'`: los Organizadores que crea la suite no tienen una cuenta real de Mercado Pago que vincular, y con la exigencia apagada se publica igual y se cobra con la cuenta de la plataforma (8.5).
   (`MP_ACCESS_TOKEN` tiene que estar cargado para que la compra pueda crear el pago; sale del `.env` o de las variables de entorno.)
2. **Frontend:** `cd frontend; npm run dev` (puerto 5173).
3. **Suite:** `cd frontend; npm run e2e`. La primera vez en una máquina nueva: `npx playwright install chromium`.

Variables opcionales: `E2E_FRONTEND_URL` (por defecto `http://localhost:5173`) y `E2E_BACKEND_URL` (`http://localhost:8080`).

## Cosas a saber

- **Límite de login: 5 por minuto por IP.** Una corrida usa 4 (3 por la interfaz y 1 por la API). Si la repetís de inmediato, el primer login falla: esperá un minuto entre corridas.
- **Los datos se siembran por la API real** (`api.ts`, `fixtures.ts`): un Organizador nuevo con sus créditos de bienvenida (5), un evento publicado con 3 entradas, y un Staff Vendedor y un Staff QR. Cada corrida crea cuentas nuevas (`e2e.*@asistiapp.test`), así que no dependen de datos previos.
- **Limpieza:** las cuentas con eventos no se pueden borrar desde el Admin, así que quedan en la base local. Para borrarlas: `psql -U postgres -d asistiapp_db -f e2e/limpiar.sql` (solo base local de desarrollo; borra todo lo que cuelga de `e2e.*@asistiapp.test`).
- Si un test falla, Playwright guarda captura y traza en `test-results/` (`npx playwright show-trace <traza>`).
