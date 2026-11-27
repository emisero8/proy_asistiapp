# AsistíAPP — Machete

**40 min** = diapositivas 18 (17:20 + margen) · demo 12 · preguntas 10

## En una frase
Web para vender entradas con código QR y controlar el ingreso: el comprador paga sin crear cuenta, recibe un QR y cada entrada sirve **una sola vez**.

## Números
| | |
|---|---|
| Casos de uso | 28: **17** coinciden · **10** con diferencias · **1** no está (CU-022, reasignar rol) |
| Roles | 4 con cuenta + comprador sin cuenta |
| Datos / API | 17 tablas · 5 claves foráneas · 92 endpoints |
| Pruebas | **610** backend · **449** frontend · **4** punta a punta |
| Tiempos | Token 24 h · login 5 por minuto · panel cada 20 s · evento finaliza 12 h después del inicio |

## Stack
React + TypeScript + Vite + Tailwind → API REST Java 17 + Spring Boot (JWT) → PostgreSQL.
Mercado Pago Checkout Pro · correo SMTP · Cloudinary · mapas OpenStreetMap.
Demo: Vercel + Render + Neon + Brevo, **pagos de prueba**.

## Capas
Filtros (límite y token) → Controlador (datos y rol) → Servicio (reglas y transacciones) → Repositorio → Base.

## Los cuatro mecanismos
| Tema | Cómo |
|---|---|
| No sobrevender | Fila de la tanda bloqueada; descuenta solo si alcanza; sin reserva: si no hay, reembolsa |
| No entrar dos veces | "Marcar Usada solo si está Pagada", en una sola orden |
| Pago confiable | Firma → consultar el pago a MP → comparar monto y moneda → bloquear orden (idempotencia) |
| Permisos | Rol (`@PreAuthorize`) **y** dueño del recurso (anti IDOR) |

## Decisiones: motivo / costo
| Decisión | Motivo | Costo |
|---|---|---|
| Monolito en capas | Todo cambia en una transacción; equipo de 4 | No escala por partes |
| Web + API separadas | Pantallas interactivas, trabajo en paralelo | Posicionamiento |
| PostgreSQL | Relacional, ACID, bloqueos | Esquema menos flexible |
| Spring Boot | Transacciones y seguridad listas | Memoria |
| Web responsive | Sin instalar | Sin modo sin conexión |
| JWT en `localStorage` | Sin sesiones; sin CSRF | Expuesto a XSS |
| Checkout Pro | No tocamos tarjetas | Sale del sitio |
| Cuenta del organizador | No custodiamos plata | Manejar OAuth |
| Créditos | Costo conocido, sin comisión | Paga antes |
| Consulta cada 20 s | Simple | Demora |

## IA
- **Herramientas:** Claude Code (VS Code), Google Antigravity; prototipo en Figma Make.
- **"Agentes":** documentos de contexto por especialidad, **no** programas autónomos: `CLAUDE.md`, `DESIGN.md`, `API.md`, `MERCADOPAGO_COBRO.md`, `SECURITY.md`.
- **Pedidos:** contexto → plan → aprobación → implementación → prueba.
- **Nosotros:** decidir, aprobar, probar (pago real incluido), responder por todo.
- **Errores:** MP dentro de una transacción · "27 de 28" mirando solo que existieran.
- **Límite:** muchas pruebas también son de la IA; en verde no significa correcto.

## Tres problemas para contar
1. **Doble escaneo:** 8 a la vez, las 8 válidas → una sola orden.
2. **QR roto en Gmail:** imagen adjunta.
3. **Límite de intentos salteable:** IP real.

## Lo que falta (decirlo primero)
Sin modo sin conexión ni reserva de cupo · carreras en edición de tandas, créditos y anular mientras se escanea · reembolso desde el panel de MP no anula entradas · dinero en `Double`, migraciones manuales · firma obligatoria sin confirmar con pago real · cobro OAuth no probado en sandbox · alojamiento gratuito, sin monitoreo · legal: inscribir base, conservación, fiscal.

## No decir
- Que usamos Jira o cumplimos Scrum completo.
- Que los "agentes" trabajan solos.
- Cifras de la encuesta.
- Porcentaje de código hecho con IA.
- "27 de 28" sin agregar las diferencias.
- Que la demo cobra con la cuenta del organizador.
- "Está listo para producción".

## Demo (11 min)
| Min | Paso | Clave |
|---|---|---|
| 0–3 | Organizador publica | Contacto y créditos |
| 3–6 | Compra | Incógnito → "Ingresar con mi cuenta" → Dinero disponible; esperar máx. 60 s |
| 6–7:30 | Escáner | Apartar el celular, volver a escanear → rojo |
| 7:30–9 | Venta en puerta | Mostrar el tope |
| 9–10 | Métricas | Evento preparado |
| 10–11 | Auditoría | Recargar y filtrar |

**Plan B:** entrada de reserva ya paga · código manual · video grabado. **No depurar en vivo.**

## Respuesta segura
**Directo → motivo → costo.** Si no saben: "No lo verificamos y preferimos no inventar."
