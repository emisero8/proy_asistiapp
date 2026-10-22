# Decisiones y deuda técnica

Registro vivo de tres cosas que no tienen un lugar natural en `CLAUDE.md` ni en los planes de fase: decisiones que ya se tomaron (con fecha, para no volver a discutirlas de cero), preguntas abiertas que hay que responder antes de implementar algo sobre ellas, y deuda técnica conocida que no es una fase nueva.

> Se actualiza junto con el código, en el mismo commit/PR que cierra una fase o toma una decisión — no es un archivo aparte que se arregla después. Si una fila de acá queda vieja, corregirla ahí mismo en vez de solo agregar una nueva abajo.

## Decisiones cerradas

| Fecha | Decisión | Por qué |
|---|---|---|
| 2026-10-15 | `MP_VALIDAR_FIRMA=false` solo en sandbox local, nunca en producción | Los avisos de pagos de prueba reales llegan firmados con una clave que no coincide con la del panel de MercadoPago. El pago igual se re-verifica contra la API de MP antes de darlo por aprobado, así que no es un agujero de seguridad para desarrollo — pero en producción tiene que estar en `true`. |
| 2026-10-15 | `MercadoPagoService.crearPreferencia()` usa `sandbox_init_point` cuando viene presente, y recién si no, `init_point` | Con credenciales de un usuario de prueba, MercadoPago solo completa el pago en `sandbox_init_point` — `init_point` devuelve un error de acceso. Con credenciales reales de producción, `sandbox_init_point` viene vacío y se usa `init_point` como siempre. |
| 2026-10-15 | Sin botón "Volver al sitio" ni auto-redirect al pagar en local — no se arregla, es esperado | MercadoPago solo activa `auto_return` (y en la práctica también el botón manual) si `FRONTEND_BASE_URL` es HTTPS pública. En producción, con el dominio real, funciona solo. En local hay que navegar a mano a `/pago/resultado?ref=<externalReference>&tipo=entradas\|creditos`. |
| 2026-10-15 | No se tuneló también el frontend con ngrok para tener HTTPS real en local | El plan free de ngrok no soporta 2 túneles simultáneos con la misma cuenta — se probó y ambos terminan compitiendo por el mismo dominio público. No vale la pena perseguirlo sin pasar a un plan pago. |
| 2026-10-15 | El comprador de prueba de MercadoPago paga logueándose ("Ingresar con mi cuenta"), nunca tipeando una tarjeta como invitado | Con credenciales de vendedor de usuario de prueba, MercadoPago rechaza el pago como invitado con un error genérico (`/fatal/`) — probado tanto en automatización (Playwright) como en un Chrome real, no es un bug de bot-detection. |
| 2026-10-15 | Las entregas para sprint review (código + DB + guía) van a una carpeta fuera del repo (`Desktop/REVIEW_AsistiAPP_<fecha>/`), nunca se commitean | Contienen un dump de la base con datos reales de prueba y credenciales de sandbox de MercadoPago — no deben quedar en el historial de git aunque sean credenciales de prueba. |

## Decisiones abiertas (preguntar antes de implementar)

| Desde | Pregunta | Contexto |
|---|---|---|
| Fase 21.6 (backend) | ¿Reconciliación activa contra la API de MP al consultar una orden `Pendiente`? | Hoy la confirmación depende solo del webhook. Si el aviso se pierde (ej. el backend estuvo caído, o un 401 como pasó en las pruebas), la orden queda `Pendiente` para siempre a menos que se busque el pago por `external_reference` al consultar su estado. |
| Fase 21.6 (backend) | ¿Job que marca `Expirada` las órdenes `Pendiente` con `fecha_vencimiento` pasada? | Sin esto, una orden abandonada (el comprador cerró la pestaña de MercadoPago) queda `Pendiente` indefinidamente. |
| Fase 21.6 (backend) | ¿Mail al comprador cuando se le reembolsa un pago? | Hoy solo le llega el aviso de MercadoPago; el sistema no manda nada propio. |

## Deuda técnica conocida

| Detectada | Qué | Estado |
|---|---|---|
| 2026-10-15 | 14 tests de `WizardPage.test.tsx`/`EditEventPage.test.tsx` rotos por el commit del mapa/stepper (`scrollIntoView` no existe en jsdom, el mock de `EventMap` no tenía el input real de dirección, un mensaje de validación de créditos cambió de texto) | ✅ Arreglado (commit `3220d57`, `feature-mercadopago`) |
| — | Carga de imágenes a Cloudinary necesita credenciales propias (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) que no vienen por defecto en ningún entorno nuevo | Sin ellas, "Cargar imagen" falla — el resto del sistema funciona igual. Documentado en las guías de entrega para sprint review. |
| 2026-10-15 | `frontend_implementation_plan.md` (Fase 12) y `backend_implementation_plan.md` (Fase 21.6, parcial) estaban marcados ⏳ aunque el trabajo ya se hizo y se verificó end-to-end | ✅ Arreglado — ambos planes actualizados con el resumen de qué se hizo. |
| — | `POST /tickets/confirmar-compra` y `VentaService.enviarConfirmacionCompraAgrupada` quedaron como código muerto: el frontend ya no los llama desde que se cerró la Fase 12 (el mail de confirmación sale del webhook), pero el endpoint nunca se borró del backend | Borrarlo junto con su DTO (`ConfirmarCompraGrupalRequestDTO`) y sus tests, en un commit chico aparte. |
