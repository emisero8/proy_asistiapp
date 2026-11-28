# AsistíAPP — Preguntas de defensa

44 preguntas con respuesta corta (unos 30 segundos) y la repregunta incómoda que suele venir después. El detalle está en `guia-estudio.md`.

**Cómo contestar:** respuesta directa → un motivo → qué se sacrifica. Si algo no está hecho, díganlo antes de que se lo marquen. Si no saben: *"No lo verificamos; lo que sí podemos mostrar es…"*.

★ = muy probable según lo que esperan.

---

## A. Arquitectura y tecnologías

### 1. ★ ¿Qué arquitectura usaron?
Cliente-servidor: una aplicación React en el navegador y una API REST en Spring Boot, organizada en capas (controladores, servicios, repositorios) sobre PostgreSQL.
- **¿Eso no es MVC?** El backend sigue esa separación, pero sin vistas en el servidor: devuelve JSON y la vista es React. Por eso hablamos de capas.

### 2. ★ ¿Por qué un monolito y no microservicios?
Vender una entrada requiere que cupo, orden y entrada cambien juntos. En un programa con una base es una transacción; repartido en servicios es mucho más difícil, y somos cuatro.
- **¿Y si hay un evento con miles de personas comprando?** Habría que escalar el programa entero y no probamos carga. Antes de partirlo mediríamos dónde está el cuello de botella; la venta bloquea la fila de la tanda y ahí se forma la fila.

### 3. ¿Por qué separar frontend y backend?
El escáner y el punto de venta son muy interactivos, se trabaja en paralelo y la API serviría para una app móvil.
- **¿Qué perdieron?** Posicionamiento en buscadores y vistas previas al compartir un evento. Además hay que mantener el contrato entre ambos; una prueba falla si la API cambia y no se actualiza la copia del frontend.

### 4. ¿Por qué Java y Spring Boot?
El PP2 lo fijó por tipado fuerte y manejo de peticiones concurrentes. Nos dio transacciones y seguridad listas.
- **¿No era más simple Node, con un solo lenguaje?** Un lenguaje sí, pero seguridad y transacciones se arman con más piezas. El costo de nuestra elección es la memoria: se nota en el alojamiento gratuito.

### 5. ★ ¿Por qué PostgreSQL y no MongoDB?
Los datos son relacionales (evento, tanda, entrada, orden) y necesitamos transacciones y bloqueo de filas para no sobrevender.
- **MongoDB también tiene transacciones.** Sí. No era imposible: no nos daba ninguna ventaja y el modelo es claramente relacional.

### 6. ¿Por qué web y no aplicación móvil?
Cero fricción: se entra por un enlace y el personal escanea desde el navegador, con un solo código.
- **¿Y si en el lugar no hay señal?** No se puede validar. Es la limitación más importante; haría falta un modo sin conexión que sincronice las entradas entre puertas.

### 7. ¿Su API es REST?
Usa recursos, métodos HTTP y JSON, sin estado de sesión, documentada con OpenAPI.
- **`/tickets/validate` tiene un verbo.** Correcto, igual que publicar un evento. Son acciones de negocio; un REST estricto las modelaría como cambios de estado.

### 8. ¿Cómo se comunican las métricas "en tiempo real"?
El panel vuelve a consultar cada 20 segundos.
- **Eso no es tiempo real.** Estricto, no. Para decidir sobre ventas, 20 segundos no cambian nada y WebSockets agregaba complejidad. Falta el indicador de desconexión que pedía el caso de uso.

## B. Datos y backend

### 9. Expliquen el modelo de datos.
Un organizador crea eventos; cada evento tiene tandas con precio y cupo; cada compra online es una orden de pago; al aprobarse nacen las entradas, cada una con su código QR. Son 17 tablas.
- **¿Por qué la orden está separada de la entrada?** Se puede empezar a pagar y no pagar nunca. La entrada existe solo si el pago se aprueba.

### 10. ★ ¿Cómo evitan vender más entradas que el cupo?
Al confirmar el pago bloqueamos la fila de la tanda y descontamos solo si alcanza (`cupo_disponible >= cantidad`). Hay una prueba de concurrencia.
- **¿Probada contra PostgreSQL?** La prueba usa H2, que no se comporta idéntico. Es una limitación de nuestras pruebas.

### 11. ★ ¿Reservan el cupo mientras la persona paga?
No. Se descuenta al confirmar; si ya no hay lugar, se reembolsa automáticamente y se avisa.
- **Entonces alguien paga y se queda sin entrada.** Puede pasar en las últimas. Nunca sobrevendemos, pero la experiencia es mala; con eventos de alta demanda conviene reservar unos minutos. Es una mejora planteada.

### 12. ¿La integridad la garantiza la base?
En parte. Hay claves primarias y valores únicos, pero solo cinco claves foráneas; el resto de las relaciones las controla el código.
- **¿Por qué?** Es una deuda: la base no impide una referencia a algo inexistente. La mejora es agregarlas junto con migraciones versionadas.

### 13. ¿Cómo guardan el dinero?
Como número de punto flotante (`Double`).
- **Eso está mal para dinero.** Sí. Corresponde decimal exacto (`BigDecimal` y `numeric`). Los cálculos de Mercado Pago se hacen en `BigDecimal`, pero se guardan como `Double`. Está entre las mejoras.

### 14. ¿Cómo cambian el esquema de la base?
Hibernate crea tablas y columnas; las restricciones van en 14 scripts SQL.
- **¿Cómo saben cuáles se aplicaron en producción?** No hay registro automático. De hecho una restricción de unicidad declarada en el código no está en la base local. El siguiente paso es Flyway.

### 15. ¿Por qué usan DTOs?
Para no exponer campos internos, como el hash de la contraseña, ni atar la API a las tablas.
- **¿No es código repetido?** Algo sí; es el costo de poder cambiar la base sin romper el contrato.

### 16. ¿Tienen otros problemas de concurrencia?
Venta, pago e ingreso están protegidos. Quedan sin proteger: editar una tanda mientras se vende, el saldo de créditos y anular una entrada mientras se escanea.
- **¿Por qué no los arreglaron?** Son casos poco probables que leímos en el código sin reproducir. La solución es la misma que ya usamos: bloquear la fila o actualizar con condición.

## C. Seguridad

### 17. ★ ¿Se puede usar dos veces la misma entrada?
No. Marcarla como usada es una sola orden condicionada a que siga pagada: la primera cambia una fila y las demás, ninguna.
- **¿Siempre fue así?** No. Hasta el 27/11 se leía y después se guardaba. Con una prueba de 8 validaciones simultáneas, las 8 daban válida. Lo corregimos y la prueba quedó.

### 18. ★ ¿Se puede falsificar una entrada?
El QR es un código al azar que solo vale si está en la base; la imagen no importa.
- **¿Y si copio el QR de otra persona?** Entra quien llega primero. Garantizamos un solo ingreso, no la identidad. Se podría pedir documento o usar un QR que cambie.

### 19. ¿Cómo manejan la sesión?
JWT firmado, válido 24 horas, en el almacenamiento del navegador. En cada pedido se vuelve a leer el usuario: una cuenta suspendida deja de entrar en el acto.
- **`localStorage` es vulnerable.** A un XSS, sí; evita CSRF. Con dominio propio pasaríamos a una cookie HttpOnly. Y cambiar la contraseña hoy no cierra las sesiones abiertas.
- **Entonces no es "sin estado".** No del todo: hay una consulta por pedido a cambio de poder cortar el acceso.

### 20. ¿Cómo guardan las contraseñas?
Con hash BCrypt: no se puede revertir, es lento a propósito y distinto para cada usuario.
- **El organizador puede ver la contraseña de su staff.** Solo la temporal que se genera al restablecerla, en ese momento. No se pueden leer las guardadas.

### 21. ★ ¿Qué impide que un organizador vea los datos de otro?
Además del rol, cada operación comprueba que el recurso sea suyo (protección contra IDOR).
- **¿Encontraron alguno?** Sí, uno en la venta manual, y se corrigió.

### 22. ¿Qué hacen contra la fuerza bruta?
Límite de 5 intentos de ingreso por minuto por IP; además en recuperación de contraseña, consulta de órdenes y webhook.
- **¿Se podía saltear?** Sí: el servidor creía en un encabezado que escribe el cliente. Ahora usa la IP real. El registro y la compra todavía no tienen límite y el contador vive en memoria.

### 23. ¿Hicieron una auditoría de seguridad?
Revisiones propias con una lista de criterios y pruebas automáticas.
- **¿Externa o pruebas de intrusión?** Ninguna de las dos.

## D. Pagos y negocio

### 24. ★ Expliquen el flujo de pago.
Se guarda la orden, se pide el cobro a Mercado Pago, la persona paga allá, Mercado Pago avisa por webhook, consultamos el pago, comparamos monto y moneda, bloqueamos la orden y la tanda, y emitimos.
- **¿Qué pasa si el aviso no llega?** La pantalla de resultado y una tarea programada preguntan a Mercado Pago por la referencia.
- **¿Y si llega dos veces?** La orden está bloqueada y ya figura procesada: no se emite de nuevo.

### 25. ★ ¿Cómo saben que el aviso es de Mercado Pago?
Firma del webhook, y además no creemos en su contenido: consultamos el pago a su API.
- **¿En desarrollo la apagan?** En local se puede apagar por una diferencia del entorno de prueba. En producción debe estar activa y todavía falta confirmarlo con un pago real.

### 26. ¿Quién cobra el dinero?
Cada organizador en su cuenta, vinculada con OAuth; sus permisos se guardan cifrados. La plataforma no toca el dinero de las entradas.
- **¿En la demo funciona así?** No: la demo cobra con la cuenta de prueba de la plataforma, porque la vinculación no se puede probar con usuarios de prueba. Se probó con dinero real el 17/11.

### 27. ¿Cómo gana dinero la plataforma?
Vendiendo créditos: uno por entrada y un costo por publicar. No cobra comisión por venta.
- **Mercado Pago sí cobra.** Sí; el organizador elige absorberlo o trasladarlo, desglosado. Ese cargo no es nuestro.
- **¿Es rentable?** No hicimos una proyección que podamos defender con datos. [A CONFIRMAR: si el PP2 o un trabajo del equipo tiene números, usen solo esos]

### 28. ¿Qué pasa si se cancela un evento?
Se corta venta e ingreso, se avisa por correo y vuelven los créditos de lo no vendido. El organizador reembolsa después, de a una o todas.
- **¿Por qué no reembolsa solo?** El dinero está en la cuenta del organizador y la devolución puede fallar, por ejemplo sin saldo; queda para reintentar. La devolución masiva no la probamos con muchas compras reales.
- **¿Y si devuelve desde el panel de Mercado Pago?** La entrada sigue valiendo en nuestro sistema: hay que anularla. Es una limitación conocida.

### 29. ¿Por qué no hay carrito ni cuenta de comprador?
Cada paso de más es una venta perdida, y un carrito mezclaría eventos de organizadores que cobran en cuentas distintas.
- **¿Y si pierde el correo?** Cuesta recuperarlo: por eso se pide confirmarlo. Con cuentas habría historial.

## E. Inteligencia artificial

### 30. ★ ¿Usaron inteligencia artificial? ¿Para qué?
Sí: Claude Code en Visual Studio Code y Google Antigravity para programar, probar, documentar y desplegar; Figma Make para el primer prototipo. La cátedra lo permite si se documenta y se explica.
- **¿Cuánto del código escribió la IA?** Gran parte se escribió con asistencia. No tenemos una medición y no vamos a inventar un porcentaje. [A CONFIRMAR entre los cuatro cómo lo dicen]

### 31. ★ Entonces, ¿qué hicieron ustedes?
Definir el problema y el modelo de cobro, dar contexto y reglas, aprobar cada plan, revisar, probar a mano —incluido un pago real— y decidir qué se publica. Respondemos por todo lo entregado.
- **Muéstrennos una decisión que no haya sido de la IA.** El modelo de créditos con cuenta de cobro propia, que la plataforma no intervenga en reembolsos y abrir el pago en otra pestaña para que la persona no quede sin salida.

### 32. ★ ¿Qué agentes usaron?
Documentos de contexto por especialidad que la herramienta lee según la tarea: reglas generales, diseño, backend, pagos y seguridad.
- **Eso no son agentes.** Tiene razón en sentido estricto: no son programas autónomos que se coordinen. Son instrucciones especializadas. [A CONFIRMAR: si alguien configuró agentes aparte, mostrarlos]

### 33. ★ ¿Cómo escribían los pedidos?
Con contexto primero, pidiendo plan antes de código, explicando la regla con nuestras palabras y, cuando podíamos, proponiendo la solución.
- **Denos un ejemplo.** *"…la solucion que yo pense fue que el checkout de mercado pago se abra en una pestania diferente y que al hacer el pago la de las entradas se actualice y te muestre tus entradas."*

### 34. ★ ¿La IA se equivocó?
Sí. Llamó a Mercado Pago dentro de una transacción contra una regla escrita, e informó "27 de 28 casos implementados" mirando solo que existieran.
- **Si las reglas no se cumplen, ¿para qué sirven?** Reducen errores y dan contra qué revisar: así detectamos el primero. No reemplazan la verificación.

### 35. ★ ¿Cómo saben que el código funciona si no lo escribieron línea por línea?
616 pruebas de backend, 449 de frontend y 4 de punta a punta, prueba contra el sistema real en celular y computadora, y prueba manual.
- **Las pruebas también las hizo la IA.** Muchas, sí. Es un límite real: las del QR estaban en verde y el error existía. Por eso hace falta revisión humana y escribir la prueba del caso que importa.

### 36. ★ Expliquen una parte del código sin la IA.
Elijan el ingreso: la ruta exige rol Staff QR; el servicio busca la entrada, controla evento y estado y la marca con una orden condicionada; si cambia cero filas, la rechaza.
- **Cada integrante tiene que poder contar un flujo.** Repasen el de compra, ingreso y venta en puerta (guía, sección 10).

### 37. ¿Qué riesgos ven en usar IA?
Aceptar código sin entenderlo, que invente cuando falta detalle, perder contexto en sesiones largas y exponer datos o claves.
- **¿Les pasó con claves?** Sí, con claves **de prueba** en el chat; corresponde renovarlas. [A CONFIRMAR que se renovaron]

## F. Proceso, estado y aspectos legales

### 38. ★ ¿Cumplieron lo planificado?
De 28 casos de uso, 17 coinciden, 10 están implementados con diferencias y 1 no está. Sumamos cosas no especificadas, como reembolsos y auditoría.
- **¿Cuál falta y por qué?** Reasignar el rol de un usuario: en este negocio un organizador no pasa a administrador ni un Staff QR a organizador, y lo descartamos.
- **¿Y los documentos?** La especificación quedó como se entregó; las diferencias están registradas aparte.

### 39. ¿Usaron Scrum?
Lo planificamos. Al desarrollar nos reunimos a trabajar en conjunto, también en clase, y avanzamos por fases con plan y verificación. No usamos Jira.
- **Entonces no hicieron Scrum.** No lo cumplimos completo: no sostuvimos tablero ni ceremonias formales, y preferimos decirlo.

### 40. ¿Cómo se repartieron el trabajo?
En la planificación cada uno tenía un área; en la práctica los cuatro somos full stack e hicimos un poco de todo.
- **El historial muestra cantidades muy distintas de commits.** Expliquen solo lo que realmente pasó: cómo trabajaban juntos y desde qué equipo se subía. [A CONFIRMAR]

### 41. ¿Probaron con usuarios reales?
El problema se relevó con una encuesta al proponer el proyecto. [A CONFIRMAR: si hubo pruebas de uso del sistema con personas externas; si no, digan que no]
- **¿Qué porcentaje respondió qué?** Los resultados no están disponibles; no citen cifras.

### 42. ¿Qué datos personales guardan y qué ley aplica?
Nombre y correo de compradores, datos de organizadores y staff y permisos de Mercado Pago cifrados; nunca tarjetas. Ley 25.326.
- **¿Inscribieron la base?** No. Está pendiente, junto con el plazo de conservación y la transferencia internacional.
- **¿Y el arrepentimiento?** Hay un botón que deriva al organizador. Los términos pasaron por revisión de un abogado; los documentos del proyecto todavía no lo reflejan.

### 43. ★ ¿Está listo para producción?
No. Funciona el circuito completo en una demo con pagos de prueba. Falta cerrar casos de concurrencia, endurecer pagos, migraciones e infraestructura pagas y completar lo legal y fiscal.
- **¿Cuánto les falta?** No tenemos una estimación seria; podemos dar el orden de prioridades.

### 44. ¿Qué harían distinto?
Flyway, claves foráneas y dinero decimal desde el principio; pensar la concurrencia en cada operación de escritura; y medir el uso de IA mientras se trabaja.

---

## Si no saben una respuesta

| Situación | Frase |
|---|---|
| No lo probaron | "No lo probamos; en el código se ve que…" |
| No está hecho | "No está implementado. Lo resolveríamos así…" |
| No saben | "No lo sabemos con certeza y preferimos no inventar." |
| Preguntan a uno que no sabe | "Lo complemento yo", sin corregirse delante de la mesa |
