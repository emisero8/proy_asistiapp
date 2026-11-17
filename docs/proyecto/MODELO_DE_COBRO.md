# Modelo de cobro del Organizador — AsistíAPP

Estado: **decidido, sin implementar** (definido el 2026-11-17). Este documento es la especificación para construirlo por etapas.

## 1. El modelo

- **La plataforma cobra solo créditos.** El Organizador compra paquetes de créditos (cobro con la cuenta de Mercado Pago de la plataforma, como hoy).
  - 1 crédito = 1 entrada vendida.
  - Publicar un evento cuesta créditos (`creditos_por_publicacion`, configurable desde el Admin).
- **El dinero de las entradas no pasa por la plataforma.** Cada Organizador vincula su propia cuenta de Mercado Pago y el pago del comprador cae directo en esa cuenta. **Sin comisión** para la plataforma.
- Un Organizador **no puede publicar** un evento si no tiene cuenta vinculada.
- Mercado Pago es el único medio de pago online por ahora.

## 2. Vinculación de la cuenta (OAuth de Mercado Pago)

Según la [documentación para marketplaces](https://www.mercadopago.com.ar/developers/pt/docs/checkout-pro-preferences/how-tos/integrate-marketplace), cada vendedor autoriza la aplicación por OAuth y la plataforma recibe un `access_token` por vendedor, con el que crea la preferencia de Checkout Pro. Como no se cobra comisión, **no se usa `marketplace_fee`**.

Lo que hay que construir en el backend:
1. Endpoint que inicia la vinculación (redirige a Mercado Pago) y endpoint de retorno que cambia el código por tokens.
2. Guardar `access_token`, `refresh_token`, `user_id` de MP y vencimiento, **cifrados** en la base. Hoy no existe nada de esto.
3. Renovar el token antes de que venza y manejar "el Organizador revocó el acceso" (el estado vuelve a no vinculado y se le avisa por la campanita).
4. `MercadoPagoService`: crear preferencia, consultar pago y reembolsar con el token **del Organizador** (hoy usa uno solo de la plataforma). La compra de créditos sigue con el token de la plataforma.
5. Estado "cuenta vinculada" visible en el panel del Organizador; bloqueo de la publicación si no está vinculada.

> **Estado (17/11):** los puntos 1 a 4 y el estado visible en Mi perfil están implementados (8.4). La autorización real se probó con éxito; el bloqueo de la publicación queda para 8.5. Tokens: `access_token` de 180 días, `refresh_token` que rota en cada renovación (se guarda el nuevo).
6. Webhook y reconciliación: ya consultan cada pago por API; deben usar el token del vendedor correspondiente a la orden.

**A verificar antes de construir** (no se pudo confirmar en la documentación de Argentina): qué API aplica (`/checkout/preferences` u `/v1/orders`), cómo llegan las notificaciones de pagos de vendedores vinculados y el vencimiento de los tokens. Hace falta registrar la aplicación como marketplace en el panel de Mercado Pago y crear un vendedor y un comprador de prueba.

## 3. Entradas manuales y tope por vendedor

- **Organizador:** puede emitir entradas manuales marcadas como **cortesía** o **pago externo**, con un motivo opcional. Cada una **consume 1 crédito**, igual que una vendida.
- **Staff Vendedor:** sigue vendiendo en la puerta (POS), con control:
  - cada entrada guarda **quién la emitió**;
  - el Organizador fija un **tope de entradas por vendedor** (obligatorio de definir; el vendedor no puede emitir más que su tope);
  - el Organizador ve un resumen por vendedor (cantidad y total) y puede **anular** entradas.
- El dinero en efectivo del POS es asunto del Organizador y su staff; la plataforma solo da el registro para que las cuentas cierren.

## 4. Reembolsos y cancelaciones

Principio: **la plataforma no interviene en reembolsos**, salvo cuando es ella la que cancela un evento. Tampoco gestiona el arrepentimiento: ofrece un **botón de arrepentimiento que solo deriva al contacto del Organizador** (WhatsApp o mail, el que tenga cargado; la plataforma hace de intermediaria y no recibe ni aprueba nada). La solicitud, la decisión y el reembolso se resuelven **entre el comprador y el Organizador** (ver el punto de riesgo en [LEGAL_Y_FISCAL.md](LEGAL_Y_FISCAL.md)). Hace falta que el Organizador tenga al menos un contacto cargado para sus eventos.

Lo que sí se construye, para que el Organizador lo tenga fácil:
1. **Identificar y anular una entrada:** el Organizador busca una entrada (por comprador, mail o código) y la anula; deja de ser válida en el escáner. Opcionalmente, **reembolsar** esa compra desde el panel con su token (sale de su saldo de Mercado Pago), con aviso por mail al comprador y registro.
2. **Cancelar un evento (lo hace el Organizador o el Admin):** se avisa a los compradores por mail y el sistema ofrece "reembolsar todas las compras", mostrando cuáles se reembolsaron y cuáles fallaron (por ejemplo, saldo insuficiente), con reintento.
3. **Sin saldo en su cuenta de Mercado Pago,** el reembolso no se puede hacer: queda una lista de pendientes. Es un límite de Mercado Pago.
4. **Créditos:** los créditos de las entradas **no usadas** (sin vender, anuladas o reembolsadas) **vuelven al Organizador**. Esto ya ocurre con las entradas sin vender al cancelar un evento; hay que extenderlo a las anuladas y reembolsadas.

## 5. Etapas de construcción

| Etapa | Contenido | Depende de |
|---|---|---|
| A | Registrar la aplicación como marketplace; verificar API y notificaciones con vendedor de prueba | Felipe, en el panel de Mercado Pago |
| B | Vinculación OAuth, tokens cifrados, renovación, estado en el panel | A |
| C | Cobro de entradas con el token del Organizador (preferencia, consulta, webhook, reconciliación); bloqueo de publicar sin cuenta | B |
| D | Entradas manuales del Organizador (cortesía / pago externo) y trazabilidad de quién emitió cada entrada | — |
| E | Tope por vendedor y resumen por vendedor | D |
| F | Anular entrada y reembolsar desde el panel; reembolso masivo al cancelar; devolución de créditos de entradas anuladas | C |
| G | Botón de arrepentimiento que deriva al WhatsApp o mail del Organizador (contacto por cuenta; sin contacto no se publica) | ✅ hecho (8.8) |

## 6. Riesgos conocidos

- Los **contracargos** y los reembolsos corren por cuenta del Organizador, no de la plataforma.
- Si un Organizador revoca el acceso con eventos publicados y ventas en curso, las compras nuevas fallan: hay que desactivar la venta online de esos eventos y avisarle.
- Los tokens son datos sensibles: cifrado en la base, nunca en logs ni en respuestas de la API.
