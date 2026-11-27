# AsistíAPP — Planificado y construido

Compara lo diseñado (PP2 y especificación de casos de uso) con lo que hace el sistema hoy (`master`, commit `420f2e2`, 27/11/2026). La comparación surge de leer el código; no se ejecutó cada flujo para este documento. Los documentos entregados no se modifican.

## 1. Casos de uso

**Coincide:** el flujo principal está implementado y no se encontraron diferencias relevantes. **Con diferencias:** está implementado, pero algún paso es distinto o falta. **No implementado.**

Resumen: **17 coinciden, 10 tienen diferencias y 1 no está implementado.**

| CU | Nombre | Estado | Diferencia |
|---|---|---|---|
| 001 | Iniciar sesión | Coincide | |
| 002 | Registrar organizador | Coincide | Además exige aceptar los términos. |
| 003 | Recuperar contraseña | Con diferencias | Si falla el correo, no se informa al usuario; queda en el registro del servidor. |
| 004 | Cerrar sesión | Coincide | El token se borra en el navegador, como dice el caso. |
| 005 | Crear Staff QR | Con diferencias | Si falla el correo, no se avisa; el Organizador puede restablecer la contraseña y verla en pantalla. |
| 006 | Crear Staff Vendedor | Con diferencias | Igual que 005. Además el vendedor queda asignado a un evento y con tope de entradas. |
| 007 | Crear evento | Coincide | Suma ubicación en mapa. |
| 008 | Modificar evento | Coincide | No se edita un evento finalizado. |
| 009 | Tandas y cupos | Coincide | La venta puede cerrar hasta que el evento finaliza. Suma tandas de cortesía. |
| 010 | Publicar evento | Con diferencias | Los créditos de las entradas se descuentan al crear la tanda; publicar tiene un costo aparte, configurable. Los cupos se pueden editar después y se ajustan los créditos. Exige cuenta de Mercado Pago (configurable) y un contacto. |
| 011 | Cancelar evento | Con diferencias | Desde la hora de inicio el Organizador ya no puede cancelar. La página pública de un evento cancelado muestra un error genérico, no un aviso de cancelación. Suma aviso por correo y reembolsos. |
| 012 | Métricas en tiempo real | Con diferencias | Se actualiza cada 20 segundos; no hay indicador de desconexión ni de última actualización. |
| 013 | Historial de créditos | Con diferencias | No hay filtros por fecha ni por tipo. |
| 014 | Comprar créditos | Coincide | Usa webhook firmado (no IPN) y reconciliación. |
| 015 | Listado de eventos | Coincide | |
| 016 | Detalle de evento | Coincide | |
| 017 | Comprar entrada | Con diferencias | Solo Mercado Pago: no se elige método de pago. No se reserva cupo: se descuenta al confirmar el pago y, si ya no hay, se reembolsa. |
| 018 | Escanear y validar QR | Coincide | Suma ingreso manual del código y rechazo de entradas anuladas o de eventos cancelados. |
| 019 | Venta manual | Coincide | Hasta 20 entradas por venta; envía correo. |
| 020 | Suspender o activar usuario | Coincide | |
| 021 | Eliminar usuario | Coincide | Bloquea además si hay vendedores a cargo o compras de créditos. |
| 022 | Reasignar rol | **No implementado** | No hay pantalla ni endpoint. |
| 023 | Editar evento (Admin) | Coincide | |
| 024 | Cancelar evento (Admin) | Coincide | |
| 025 | Eliminar evento (Admin) | Coincide | Bloquea también si hay compras en curso. |
| 026 | Precios de créditos | Coincide | |
| 027 | Métricas globales | Con diferencias | No hay filtro por fechas ni exportación. |
| 028 | Configuraciones | Con diferencias | El servidor solo exige que el valor no esté vacío; un número mal escrito se ignora y se usa el valor por defecto. |

La numeración oficial es la de la especificación de casos de uso y el PP2. La planilla Scrum usa otra.

## 2. Funcionalidades que no estaban en los casos de uso

Cuenta de Mercado Pago propia del Organizador · anulación y reembolso (individual y masivo) · cargo por procesamiento opcional · cortesías y cobros por fuera · tope por vendedor y por comprador · notificaciones y anuncios · auditoría · exportación a Excel de las entradas de un evento · soporte configurable · botón de arrepentimiento · términos y privacidad · centro de ayuda · modo claro y oscuro.

## 3. Cambios respecto del diseño

| Diseño | Sistema | Estado del motivo |
|---|---|---|
| Elegir entre Mercado Pago, transferencia, tarjeta o WhatsApp | Solo Mercado Pago Checkout Pro (que ofrece sus propios medios) | A explicar por el equipo |
| "Carrito de compras" (planilla Scrum) | Compra directa: una tanda y una cantidad, sin carrito | A explicar por el equipo |
| Créditos descontados al publicar | Se descuentan al crear cada tanda, más el costo de publicar | Ver `DECISIONES.md` |
| Reservar el cupo durante el pago | Sin reserva; reembolso automático si se agotó | A explicar por el equipo |
| Aviso de pago por IPN | Webhook firmado, verificación contra la API y reconciliación | Ver `MERCADOPAGO_COBRO.md` |
| Sin comisión | AsistíAPP no cobra comisión; Mercado Pago sí, y el Organizador elige si la absorbe o la traslada | Ver `DECISIONES.md` |
| Historial de compras del comprador | No existe: el comprador no tiene cuenta | Ver `DECISIONES.md` (22/10) |

## 4. Cronología

| Período | Etapa | Respaldo |
|---|---|---|
| Marzo a julio 2026 | Relevamiento, casos de uso y documentación de diseño | Indicado por el equipo (la fecha 2025 que figura en la especificación de casos de uso es un error) |
| Agosto a noviembre 2026 | Desarrollo | Historial de Git: 13/08 a 26/11 |

El PP2 preveía 6 meses con sprints de 3 semanas; la planilla Scrum registra 5 sprints de una semana (24/09 a 28/10), una parte del desarrollo.

## 5. Roles

El PP2 asignó un área a cada integrante como organización inicial. Según el equipo, en el desarrollo cada uno tomó las tareas que fue eligiendo. La última columna resume mensajes de commit: **no mide todo el trabajo** y cada integrante tiene que confirmarla y completarla.

| Integrante | Área planificada (PP2) | Se ve en el historial de Git |
|---|---|---|
| Felipe Prono | Arquitectura y modelado de datos | Base del backend, flujos del frontend, cobro por Organizador, reembolsos, pruebas, despliegue, centro de ayuda |
| Facundo Riffel | APIs de terceros y pagos | Sistema de diseño y rediseño del frontend, auditoría |
| Emilio Serovich | Lógica de negocio, seguridad y QR | Correos, mapa y direcciones, mejoras de interfaz, exportación a Excel |
| Federico Villarroel | Interfaces y experiencia | Integración de Mercado Pago Checkout Pro en el backend |
