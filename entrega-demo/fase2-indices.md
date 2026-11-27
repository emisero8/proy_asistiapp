# AsistíAPP — Fase 2: índices

## 1. Reparto de los 40 minutos

| Bloque | Duración |
|---|---|
| Diapositivas (17:20 + 0:40 de margen) | 18:00 |
| Demo en vivo (11:00 + 1:00 de margen) | 12:00 |
| Preguntas | 10:00 |
| **Total** | **40:00** |

## 2. Índice de la guía de estudio (`guia-estudio.md`)

Para los cuatro, sin dividir temas. Se entrega en cuatro partes. **★** = prioridad alta según las preguntas que esperan.

Cada sección: palabras simples, analogía si ayuda, cómo se aplica en AsistíAPP con código corto, "Lo que tenés que saber" y 3 a 5 preguntas con respuestas.

| Parte | Sección | Contenido |
|---|---|---|
| A | 0. Cómo estudiar esta guía | Orden de lectura y ruta corta de repaso |
| A | 1. Resumen | Problema, solución, usuarios, alcance, tipo de sistema de información |
| A | 2. Origen y planificación | Idea, requisitos, actores, 28 casos de uso por módulo con su estado, metodología, cronología, roles |
| A ★ | 3. Arquitectura | Componentes, capas, comunicación, diagramas, mapa de carpetas |
| A ★ | 4. Tecnologías | Qué es cada una, para qué y dónde |
| B ★ | 5. Decisiones de diseño | Las 20 de la lista de abajo |
| B ★ | 6. Uso de inteligencia artificial | Herramientas, documentos de contexto por especialidad, planes por fases, cómo dieron instrucciones, errores de la IA y correcciones, verificación, reparto, límites y ética |
| C | 7. Base de datos | Modelo, entidades, relaciones, restricciones, identificadores |
| C | 8. Backend | Estructura, endpoints, lógica, validaciones, errores |
| C | 9. Frontend | Estructura, pantallas, navegación, conexión con la API, diseño |
| C | 10. Flujos completos | Registro y login, creación y publicación, compra, pago, QR, ingreso, venta en puerta, cancelación y reembolso, créditos, recuperar contraseña; con secuencias y errores |
| D ★ | 11. Seguridad | JWT, roles, pagos, QR, reutilizar o falsificar una entrada |
| D | 12. Integraciones | Mercado Pago, correo, Cloudinary, mapas |
| D | 13. Pruebas, despliegue y entorno | Solo lo que existe |
| D | 14. Ética y legales | Datos personales, consumidor, forma jurídica, términos, pendientes |
| D | 15. Problemas y soluciones | Casos documentados |
| D | 16. Estado final, limitaciones y mejoras | |
| D | 17. Glosario | |

### Decisiones de la sección 5

1. Arquitectura monolítica en capas
2. SPA separada de la API
3. Java y Spring Boot
4. PostgreSQL
5. React, TypeScript, Vite y Tailwind
6. Web responsive en lugar de aplicación móvil
7. API REST
8. JWT sin estado (y token en `localStorage`)
9. Identificadores: `Long` interno, código QR y referencia externa no adivinables
10. QR de un solo uso validado contra el servidor
11. Mercado Pago Checkout Pro
12. Cuenta de cobro propia de cada Organizador
13. Créditos en lugar de comisión
14. Compra sin cuenta y sin carrito
15. Sin reserva de cupo: bloqueo al confirmar y reembolso
16. Métricas por consulta periódica en lugar de WebSockets
17. Esquema con `ddl-auto` y scripts manuales
18. Monorepo, pruebas e integración continua
19. Contenedores y despliegue en servicios gratuitos
20. Metodología: Scrum planificado y trabajo por fases

## 3. Índice de la presentación (`presentacion.pptx`)

Quién habla: lo reparten ustedes más adelante.

| # | Diapositiva | Idea única | Tiempo | Acumulado |
|---|---|---|---|---|
| 1 | AsistíAPP | Qué es, en una frase | 0:20 | 0:20 |
| 2 | El problema | Vender a mano trae fraude y descontrol | 1:00 | 1:20 |
| 3 | La solución | Venta, QR y control en una web | 0:50 | 2:10 |
| 4 | Usuarios | Cinco perfiles y qué hace cada uno | 0:50 | 3:00 |
| 5 | Un sistema de información | Qué decisiones permite tomar | 0:50 | 3:50 |
| 6 | Planificación | De marzo a noviembre | 1:00 | 4:50 |
| 7 | Planificado y construido | 27 de 28 casos de uso, con ajustes | 1:00 | 5:50 |
| 8 | Arquitectura | Cómo se conectan las piezas | 1:20 | 7:10 |
| 9 | Backend en capas | Cómo está formado el proyecto | 0:50 | 8:00 |
| 10 | Modelo de datos | Evento, tanda, entrada y orden | 1:00 | 9:00 |
| 11 | Decisiones: la base | Por qué esta arquitectura y estas tecnologías | 1:20 | 10:20 |
| 12 | Decisiones: el negocio | Sesión, QR, pagos y créditos | 1:20 | 11:40 |
| 13 | IA: cómo trabajamos | Herramientas y contexto por especialidad | 1:20 | 13:00 |
| 14 | IA: cómo controlamos | Instrucciones precisas, revisión y pruebas | 1:00 | 14:00 |
| — | **Demo en vivo** | | 12:00 | |
| 15 | Seguridad | Por qué una entrada no se usa dos veces | 1:00 | 15:00 |
| 16 | Desafíos | Problemas reales y cómo se resolvieron | 1:00 | 16:00 |
| 17 | Estado y mejoras | Qué está, qué falta, qué sigue | 1:00 | 17:00 |
| 18 | Cierre | Lo aprendido | 0:20 | 17:20 |

El acumulado cuenta solo diapositivas.

La diapositiva 7 dice "27 de 28" y aclara los ajustes: 17 coinciden, 10 tienen diferencias y 1 no está.

## 4. Guion de la demo (adelanto)

| Paso | Qué se muestra | Tiempo |
|---|---|---|
| 1 | Organizador: crear un evento con tandas y publicarlo | 3:00 |
| 2 | Comprador: compra, pago de prueba y entrada con QR | 3:00 |
| 3 | Staff QR: ingreso válido y segundo intento rechazado | 1:30 |
| 4 | Staff Vendedor: venta en puerta | 1:30 |
| 5 | Organizador: métricas | 1:00 |
| 6 | Administrador: auditoría | 1:00 |

Riesgo principal: el pago de prueba y el arranque en frío del servidor. El plan B incluye una entrada ya paga y despertar el servidor antes de empezar.

## 5. Lo que tienen que confirmar antes de que entre en la presentación

- Los **motivos** de las decisiones que no estén documentados (los voy a marcar en la guía para que los validen).
- Para las diapositivas 13 y 14: dos o tres ejemplos reales de instrucciones que dieron y de errores de la IA que corrigieron.
