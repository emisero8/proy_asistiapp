# Aspectos legales y fiscales (Argentina) — AsistíAPP

> **Esto no es asesoramiento legal ni contable.** Es una lista de temas para llevar a un abogado y a un contador antes de salir a producción. Lo que figura como "fuente" proviene de resúmenes de terceros y **debe contrastarse con el texto oficial**. Última revisión: 2026-11-17.

Contexto: la plataforma es **intermediaria**. Cobra solo créditos al Organizador; el dinero de las entradas va directo a la cuenta de Mercado Pago del Organizador (ver [MODELO_DE_COBRO.md](MODELO_DE_COBRO.md)).

## 1. Arrepentimiento y defensa del consumidor

- La [Disposición 954/2025](https://allende.com/administrativo/el-gobierno-refuerza-la-proteccion-al-consumidor-en-el-comercio-electronico-09-05-2025/) derogaría la Res. 424/2020 (según esa fuente). Exige un **botón de arrepentimiento** visible, sin registro previo; para entradas de espectáculos el plazo sería de **10 días corridos** desde la entrega de la entrada o del comprobante de pago ([resumen de iProUP](https://www.iproup.com/economia-digital/59712-boton-de-baja-y-arrepentimiento-que-cambia-para-las-compras-online)). Base: art. 34 de la Ley 24.240 y art. 1110 del Código Civil y Comercial.
- **Decisión del proyecto (2026-11-18):** el arrepentimiento **no se gestiona dentro de la plataforma**. Se ofrece un **botón de arrepentimiento que deriva al WhatsApp o al mail del Organizador**; la plataforma solo hace de intermediaria y el Organizador resuelve (puede identificar y anular la entrada, y reembolsar desde su panel).
- **A validar con un abogado:** la norma obliga al *proveedor* a poner el botón en su sitio. El botón derivador cubre la visibilidad, pero hay que confirmar (a) quién es el proveedor, (b) si hay excepciones para eventos de fecha determinada y (c) si alcanza con derivar al contacto del Organizador o si la plataforma debe además registrar la solicitud.
- Mostrar en el sitio el enlace de **defensa del consumidor** y los datos de contacto/soporte (ya hay contacto configurable desde el Admin).
- Texto oficial: [Boletín Oficial](https://www.boletinoficial.gob.ar/detalleAviso/primera/235729/20201005).

## 2. Protección de datos personales (Ley 25.326)

- Se guardan datos de compradores (nombre, mail), Organizadores y staff.
- Según [Marval](https://www.marval.com/publicacion/registro-nacional-de-bases-de-datos-5194), una base no inscripta en el Registro Nacional de Bases de Datos Personales se considera ilícita. Obligaciones del responsable: [AAIP](https://www.argentina.gob.ar/node/53779).
- A preparar: **inscripción de la base** ante la AAIP, **política de privacidad** publicada (qué datos, para qué, cuánto se guardan, derechos de acceso/rectificación/supresión, contacto) y **consentimiento** al comprar o registrarse.
- Si los datos se alojan fuera del país (por ejemplo, un proveedor en la nube del exterior o Cloudinary para imágenes), revisar las condiciones de transferencia internacional (art. 12).

## 3. Términos y condiciones

Deben cubrir, como mínimo:
- La plataforma es **intermediaria**: el contrato de venta de la entrada es entre comprador y Organizador; el Organizador es responsable del evento, de su cancelación y de los reembolsos.
- Qué cobra la plataforma (créditos) y a quién; política de créditos (vencimiento, devolución de los no usados).
- Responsabilidad por cancelaciones, reprogramaciones y reembolsos (a cargo del Organizador; la plataforma solo ofrece herramientas).
- Uso de la cuenta, suspensión de cuentas, soporte y contacto.
- Aviso de que **quien tiene el enlace o el QR de la entrada puede usarla**.
- Aceptación explícita al registrarse (Organizador) y al comprar (comprador).

## 4. Facturación e impuestos (ARCA, ex AFIP)

**No pude verificarlo; lo debe definir un contador.** Puntos a consultar:
- **La plataforma** factura al Organizador la venta de créditos (su ingreso). Definir el tipo de inscripción (monotributo o responsable inscripto), la actividad y, si hay escala de ventas, cuándo conviene cambiar. Los créditos son un servicio: tratamiento de IVA e Ingresos Brutos según jurisdicción.
- **El Organizador** es quien vende la entrada y quien debe facturar al comprador. Definir si la plataforma solo informa eso en los términos o si emite algún comprobante por su cuenta (esto cambiaría el rol de intermediaria y conviene evitarlo).
- Retenciones o percepciones que pueda aplicar Mercado Pago en las cuentas de los Organizadores: son asunto de cada cuenta.
- **Ingresos Brutos** de la plataforma y alta como prestador de servicios digitales.
- Si la cuenta de Mercado Pago de la plataforma es personal o de empresa, y su relación con la inscripción fiscal.

## 5. Mercado Pago como marketplace

- Aceptar los términos de Mercado Pago para marketplaces y revisar si exigen condiciones adicionales a los vendedores (por ejemplo, verificación de identidad de cada Organizador).
- Los reembolsos y contracargos corren por cuenta de cada Organizador; reflejarlo en los términos.

## 6. Técnico relacionado

- Dominio propio con SPF, DKIM y DMARC para que los mails no caigan en spam (ver [SECURITY.md](../tecnica/SECURITY.md)).
- Cifrar en la base los tokens de Mercado Pago de los Organizadores.
- Revisar cuánto tiempo se conservan los datos de compradores.

## 7. Checklist previo a salir a producción

- [ ] Reunión con un abogado: términos, privacidad, arrepentimiento y rol de la plataforma.
- [ ] Reunión con un contador: inscripción, facturación de créditos, Ingresos Brutos.
- [ ] Inscribir la base de datos en la AAIP.
- [ ] Revisar con el abogado los **borradores** ya publicados en `/terminos` y `/privacidad` y reemplazarlos (subir `TerminosLegales.VERSION` y `frontend/src/lib/terminos.ts` juntos). La aceptación explícita en el registro del Organizador y en el checkout **ya está hecha**.
- [ ] Definir el botón o aviso de arrepentimiento (punto 1).
- [ ] Registrar la aplicación como marketplace en Mercado Pago.
- [ ] Dominio propio y registros de mail.
