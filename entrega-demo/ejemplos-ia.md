# Ejemplos reales de trabajo con IA

Material para la sección 6 de la guía y las diapositivas 13 y 14. **Para elegir y confirmar.**

- Fuente: historial local de Claude Code (16/08 a 27/11) y de Antigravity (13–14/08) **de la PC de Felipe**. El equipo indicó que casi todos usaron esa cuenta.
- Las citas son textuales, con sus errores de tipeo. En una diapositiva se pueden corregir solo la ortografía y los acentos, o recortar con "(…)".
- No se copiaron claves, correos ni datos personales.

## 1. Instrucciones

### 1.1 Dar contexto antes de pedir (Antigravity, 13/08) ★
> "para ponerte en contexto del proyecto en si, en la carpeta docs esta toda la informacion del proyecto, casos de uso, de q trata el sistema, diagramas de todo entre otras cosas. en el claude.md las reglas que debe seguir el agente y en API.md las especificaciones para usar al momento de trabajar con el backend, en el design.md esta toda la informacion para trabajar en el frontend. ademas ya tengo creado un plan de implementacion (…) por fases para el backend, que ya lleva resuleto hasta la fase2, asi que deberiamos seguir con la fase 3."

**Muestra:** un documento por especialidad y un plan por fases. La herramienta respondió con un plan escrito de la fase 3 (seguridad y JWT), que se aprobó antes de programar.

### 1.2 Definir una regla de negocio y pedir que la repita (17/11) ★
> "elijo la opcion A, que era la que ya tenia en mente. te la digo con mis palabras a ver si la entendiste, la idea seria que un organizador se registra y compra un pack de creditos donde cada credito vale 1 entrada, ademas de cobrarle al publicar 1 evento (monto a definir y configurable desde admin). (…) luego el organizador debe poner su cuenta de mercado pago (…) y el es el que recibe el dinero de la venta de entradas en su cuenta sin ningun tipo de comision."

**Muestra:** el modelo de negocio lo definió una persona; la IA ofreció opciones.

### 1.3 Proponer la solución, no solo el problema (10/11) ★
> "al completar el pago no existe ningun boton para volver a la pagina y ver las entradas (…) la solucion que yo pense fue que el checkout de mercado pago se abra en una pestania diferente y que al hacer el pago la de las entradas se actualice y te muestre tus entradas."

**Resultado:** así quedó (`lib/pago.ts`; `DECISIONES.md` 10/11; commit "pago en pestaña nueva…").

### 1.4 Pedir el plan antes del código (06/10)
> "todos estos cambios son lo que tenemos que hacer para el jueves, como crees que deberiamos organizarlos y que prioridad le damos a cada uno. no hagas nada todavia."

### 1.5 Fijar reglas de proceso (06/10)
> "cualquier error que vayas encontrando a medida que hacemos cosas, anda agregandolos a los planes de implementaciones y resolvelos, cosa de que no quede nada a la deriva sin corregir. (…) luego haceme un resumen de todo lo q hicimos y q falta hacer. luego elijo si seguir o no"

### 1.6 Reportar un error con lo que se ve y lo que se espera (22/10)
> "hay eventos cargados que ya pasaron su fecha donde se realizaban y siguen mostrandose disponibles (…) te deja entrar al evento y seleccionar la tanda para comprar (…) no tendria que ser posible"

## 2. La persona decide

| Fecha | Cita | Qué pasó |
|---|---|---|
| 17/11 | "el arrepentimiento del comprador no creo que deberia existir ya que eso se tendria que hablar fuera de la plataforma sin nosotros como intermediarios" | No hay reembolso a pedido del comprador. Después se agregó un botón de arrepentimiento que deriva al contacto del organizador |
| 20/11 | "al hacer la devolucion, no tendria que ser sin el cargo extyra?" | Se discutió y quedó que se devuelve todo lo pagado, aclarándoselo al organizador (commit 20/11) |
| 20/11 | "me parece que yase lo que paso (…) esta el modo desarrollo y el modo prueba. eso hace que se requieran dos claves me parece?" | Era eso: el backend pasó a aceptar las dos claves de firma del webhook (commit 20/11) |
| 26/11 | "una tanda de un evento tiene cupo de 50 entradas nomas pero vos le asignaste al vendedor 100 (…) esto no produciria un error?" | Cuestionar un dato para entender la regla: el tope del vendedor es un máximo y el cupo frena la venta (`DECISIONES.md` 26/11) |

## 3. Errores y correcciones

| # | Qué pasó | Cómo se detectó | Corrección | Para usar |
|---|---|---|---|---|
| A ★ | El pedido era que el nombre de usuario quedara fijo; la primera solución no lo lograba. La causa real: una animación de transición rompía `position: fixed` en toda la app | Prueba manual: "mira, aca lo que te pedia era que el nombre de usuario quede siempre fijo (…)" (07/10) | Se investigó en el navegador (commit "position:fixed roto…") | Muy claro y visual |
| B ★ | `CLAUDE.md` pide llamar a Mercado Pago fuera de las transacciones; el inicio de compra lo hacía adentro. De paso, se podía perder la marca de "cuenta revocada" | Revisión del código contra las reglas (27/11) | Orden guardada antes de llamar; prueba nueva | Muestra que tener la regla escrita no alcanza: hay que verificar |
| C ★ | La IA informó "27 de 28 casos de uso implementados" mirando solo que existieran | Comparación paso a paso con la especificación (27/11) | 17 coinciden, 10 con diferencias, 1 no está | Muestra que no hay que aceptar el primer resumen |
| D | El QR no se veía en Gmail (imagen incrustada como texto) | Compra de prueba y mirar el correo (12–13/11) | Imagen adjunta en línea (`cid:`) | Solo si confirman que ese código lo generó la IA [A CONFIRMAR] |
| E | La IA agregó al `.gitignore` una carpeta ajena al proyecto, que no se quería publicar | "yo no queria que se vea eso" (22/10) | Se revirtió | Ejemplo de revisar lo que se commitea |

★ = recomendados.

**No recomiendo usar** la corrección del 22/10 sobre la autoría de un commit sin pensarlo antes: abre la conversación sobre por qué el historial no menciona a la IA. Si lo preguntan, contesten de frente: es una regla del equipo, el uso está permitido por la cátedra y lo explican acá, con evidencia.

## 4. Confirmado por el equipo (27/11)

- Los cuatro usaron IA casi siempre desde la cuenta de Felipe: estos ejemplos representan el trabajo del equipo.
- Diapositiva 13: ejemplos 1.1 y 1.3. Diapositiva 14: errores B y C.
- Preséntenlos como "así trabajamos", sin atribuir cada cita a otra persona de la que la escribió.
