/**
 * Textos del centro de ayuda (/ayuda). Describen lo que la app hace hoy: si cambia una regla de
 * negocio o el nombre de un botón, hay que actualizar la sección correspondiente.
 */

export interface Problema {
  pregunta: string;
  respuesta: string;
}

export interface SeccionAyuda {
  /** Ancla de la sección: /ayuda/<guía>#<id>. */
  id: string;
  titulo: string;
  intro: string;
  pasos?: string[];
  detalles?: string[];
  atencion?: string;
  problemas?: Problema[];
}

export type SlugGuia = "compradores" | "organizadores" | "staff";

export interface Guia {
  slug: SlugGuia;
  titulo: string;
  /** Nombre corto para la tarjeta del índice y las pestañas. */
  nombre: string;
  resumen: string;
  secciones: SeccionAyuda[];
}

const COMPRADORES: Guia = {
  slug: "compradores",
  nombre: "Compradores",
  titulo: "Guía para compradores",
  resumen: "Comprar entradas, pagar, usar el QR en la puerta y qué hacer si algo sale mal.",
  secciones: [
    {
      id: "comprar",
      titulo: "Comprar entradas",
      intro: "No hace falta crear una cuenta: las entradas llegan por email.",
      pasos: [
        "Entrá a “Eventos” o abrí el link del evento que te compartieron.",
        "Elegí la tanda y la cantidad de entradas.",
        "Completá tu nombre y apellido, tu email y repetí el email para confirmarlo.",
        "Revisá el resumen del pedido y continuá a Mercado Pago.",
      ],
      detalles: [
        "Cada organizador define cuántas entradas puede tener una misma persona (mismo email) en su evento. En una compra no se pueden pedir más de 20.",
        "Las entradas se venden hasta que el evento finaliza, 12 horas después de empezar, salvo que la tanda cierre antes.",
        "Algunos organizadores suman al precio un cargo por la comisión de Mercado Pago. Si es así, aparece detallado antes de pagar.",
      ],
      atencion: "Revisá bien el email: es donde llegan las entradas.",
      problemas: [
        { pregunta: "No puedo elegir una tanda", respuesta: "Puede estar agotada, no haber abierto todavía su venta o haberla cerrado ya." },
        {
          pregunta: "Me dice que alcancé el máximo por persona",
          respuesta: "Ese email ya llegó al tope de entradas para ese evento. Si necesitás más, consultá al organizador.",
        },
      ],
    },
    {
      id: "pago",
      titulo: "Pago y estados de la compra",
      intro: "El pago se hace en Mercado Pago. Las entradas se generan cuando el pago queda confirmado.",
      pasos: [
        "Pagá en la pantalla de Mercado Pago.",
        "Volvé a AsistíAPP y esperá la confirmación en la pantalla del resultado.",
        "Cuando aparece “¡Pago aprobado!” ya podés ver tus entradas, y también te llegan por email.",
      ],
      detalles: [
        "Todavía no recibimos la confirmación: Mercado Pago puede demorar unos minutos. No vuelvas a pagar; consultá de nuevo en un rato.",
        "El pago no se pudo completar: no se generaron entradas y podés volver a intentar.",
        "La orden venció: pasó el tiempo para pagar (30 minutos). Empezá la compra de nuevo.",
        "Te devolvimos el pago: se cobró pero ya no se podía entregar la compra, por ejemplo porque se agotó el cupo. El reembolso es automático.",
      ],
      atencion: "La entrada no queda reservada mientras pagás: el cupo se descuenta cuando se confirma el pago.",
      problemas: [
        {
          pregunta: "Pagué y no me llegó el mail",
          respuesta: "Revisá la carpeta de spam o promociones. Si no está, escribile al organizador del evento con el email que usaste y el comprobante de Mercado Pago.",
        },
        { pregunta: "Cerré la pestaña de Mercado Pago", respuesta: "Desde la pantalla del resultado podés abrir Mercado Pago de nuevo mientras la orden no haya vencido." },
      ],
    },
    {
      id: "mi-entrada",
      titulo: "Tu entrada y el QR",
      intro: "Cada entrada tiene su propio código QR y un enlace para verla.",
      pasos: [
        "Abrí el mail de la compra y tocá el enlace de la entrada, o mostrá el QR que viene en el mail.",
        "En la puerta, mostrá el QR con el brillo de la pantalla alto.",
      ],
      detalles: [
        "Cada entrada se valida una sola vez.",
        "Si compraste varias, cada persona tiene que mostrar un QR distinto.",
        "En la pantalla de la entrada vas a ver si está anulada, ya utilizada, o si el evento se canceló o finalizó.",
      ],
      atencion: "El enlace es la entrada: quien lo tenga puede ver y usar el QR. Compartilo solo con quien vaya a ir.",
    },
    {
      id: "cancelaciones",
      titulo: "Cancelaciones, arrepentimiento y devoluciones",
      intro: "El dinero de las entradas lo recibe el organizador, y es quien resuelve las devoluciones.",
      pasos: [
        "Abrí la página del evento.",
        "Buscá “¿Te arrepentiste de tu compra?”.",
        "Escribile al organizador por WhatsApp o por email e indicá el nombre y el email de la compra.",
      ],
      detalles: [
        "Si el evento se cancela, recibís un aviso por email y la entrada deja de servir para ingresar.",
        "Una entrada reembolsada o anulada no permite el ingreso.",
      ],
      atencion: "AsistíAPP te conecta con el organizador, pero no recibe ni aprueba los pedidos de devolución.",
    },
  ],
};

const ORGANIZADORES: Guia = {
  slug: "organizadores",
  nombre: "Organizadores",
  titulo: "Guía para organizadores",
  resumen: "Cuenta, cobros, créditos, eventos, tandas, staff, métricas, reembolsos y cancelaciones.",
  secciones: [
    {
      id: "cuenta",
      titulo: "Crear la cuenta y completar el perfil",
      intro: "El registro es gratis y trae créditos de bienvenida.",
      pasos: [
        "Entrá a “Soy organizador” y creá tu cuenta con nombre, email y una contraseña de al menos 8 caracteres.",
        "En “Mi perfil” cargá un contacto para compradores: WhatsApp, email o ambos.",
        "En “Mi perfil” vinculá tu cuenta de Mercado Pago.",
      ],
      detalles: [
        "El contacto es el que ve quien quiere arrepentirse de su compra.",
        "En el perfil también podés fijar el máximo de entradas por persona para tus eventos. Si lo dejás vacío, rige el de la plataforma.",
      ],
      atencion: "Sin cuenta de Mercado Pago vinculada y sin un contacto cargado no se puede publicar un evento.",
      problemas: [{ pregunta: "Olvidé mi contraseña", respuesta: "En la pantalla de ingreso tocá “¿Olvidaste tu contraseña?” y te enviamos un link por email." }],
    },
    {
      id: "mercado-pago",
      titulo: "Cobrar con Mercado Pago",
      intro: "El dinero de tus entradas va directo a tu cuenta de Mercado Pago. AsistíAPP no cobra comisión por venta.",
      pasos: [
        "En “Mi perfil”, tocá “Vincular Mercado Pago” y autorizá el acceso.",
        "Elegí quién paga la comisión de Mercado Pago: la absorbés vos o la paga quien compra.",
        "Si la paga quien compra, indicá el plazo de liberación y la zona que tenés configurados en Mercado Pago.",
      ],
      detalles: [
        "Mercado Pago cobra su propia comisión según el plazo en que libera el dinero.",
        "Los valores que muestra la app son de referencia: confirmá los tuyos en tu cuenta.",
      ],
      problemas: [
        {
          pregunta: "La app me pide volver a vincular la cuenta",
          respuesta: "El acceso venció o lo quitaste desde Mercado Pago. Volvé a vincularla; hasta entonces no vas a poder cobrar entradas online.",
        },
      ],
    },
    {
      id: "creditos",
      titulo: "Créditos",
      intro: "Los créditos son lo que le pagás a la plataforma. Publicar un evento y habilitar sus entradas los consume.",
      pasos: ["Entrá a “Créditos”.", "Elegí un paquete y pagá en Mercado Pago.", "Los créditos se acreditan cuando se confirma el pago."],
      detalles: [
        "Cada entrada consume 1 crédito, y se descuenta al crear la tanda según su cupo (también las de cortesía).",
        "Publicar un evento tiene además un costo en créditos, que se muestra antes de publicar.",
        "Vuelven a tu saldo los créditos de las entradas sin vender al cancelar un evento o eliminar una tanda, y los de las entradas que anulás antes de que el evento finalice.",
        "El costo de publicar no se devuelve.",
        "En “Créditos” tenés el historial de movimientos y de compras.",
      ],
    },
    {
      id: "eventos",
      titulo: "Crear y publicar un evento",
      intro: "El asistente “Crear evento” te guía desde los datos hasta la publicación.",
      pasos: [
        "Cargá nombre, descripción, fecha, hora, lugar e imagen de portada.",
        "Armá las tandas de entradas.",
        "Revisá el costo en créditos y tocá “Publicar evento”.",
        "Compartí el link de la página pública.",
      ],
      detalles: [
        "La fecha y la hora no pueden estar en el pasado.",
        "Para publicar hace falta al menos una tanda de venta, créditos suficientes, Mercado Pago vinculado y un contacto cargado.",
        "Un evento finaliza 12 horas después de su hora de inicio. Desde ese momento no se vende, no se edita y las entradas no sirven para ingresar; las ventas y los listados quedan para consulta.",
        "Un borrador que nunca publicaste se puede eliminar y devuelve los créditos de sus entradas.",
      ],
    },
    {
      id: "tandas",
      titulo: "Tandas de entradas",
      intro: "Cada tanda tiene nombre, precio, cupo y, si querés, una ventana de venta.",
      detalles: [
        "Si dejás vacías las fechas de venta, la tanda se vende desde que publicás.",
        "La venta puede seguir hasta que el evento finaliza, pero no más allá.",
        "Una tanda de cortesía no se vende: solo vos emitís sus entradas.",
        "El cupo no puede bajar de las entradas ya vendidas.",
        "No se puede eliminar una tanda con ventas, ni la última tanda de venta de un evento publicado.",
        "Si cambiás el precio, las entradas ya vendidas conservan el precio con el que salieron.",
      ],
    },
    {
      id: "cortesias",
      titulo: "Cortesías y pagos por fuera",
      intro: "Podés emitir entradas vos mismo desde el detalle del evento, con “Emitir entradas”.",
      pasos: [
        "Abrí el evento y tocá “Emitir entradas”.",
        "Elegí la tanda, si es cortesía o un pago cobrado por fuera, y los datos de quien la recibe.",
        "Compartí el enlace de cada entrada.",
      ],
      detalles: [
        "Salen del cupo de la tanda y no tienen costo extra: ya están pagas en créditos.",
        "No tienen tope por persona.",
        "Una cortesía no suma a los ingresos; un pago por fuera sí.",
      ],
    },
    {
      id: "staff",
      titulo: "Staff y topes de venta",
      intro: "El Staff QR valida entradas en la puerta; el Staff Vendedor vende en el evento.",
      pasos: [
        "Entrá a “Staff” y sumá a la persona con su nombre, email y el evento asignado.",
        "A un vendedor definile el tope de entradas que puede vender.",
        "La persona recibe sus credenciales por email e ingresa desde “Soy staff”.",
      ],
      detalles: [
        "Cada integrante trabaja sobre un solo evento, el que tiene asignado.",
        "El tope es el máximo que puede vender en total. Lo podés ampliar después.",
        "El tope no reserva cupo: el vendedor no puede vender más de lo que queda en la tanda.",
        "El dinero que cobra el vendedor se arregla entre ustedes; la app lleva el registro para rendir.",
      ],
      problemas: [
        { pregunta: "Un integrante perdió su contraseña", respuesta: "En “Staff”, generá una contraseña nueva y pasásela." },
        { pregunta: "Alguien ya no trabaja conmigo", respuesta: "Dalo de baja desde “Staff”; podés reactivarlo más adelante." },
      ],
    },
    {
      id: "metricas",
      titulo: "Ventas y métricas",
      intro: "El detalle de cada evento muestra ingresos, entradas vendidas, validados en puerta y aforo disponible.",
      detalles: [
        "Hay un desglose por tanda y la lista de compradores con su estado y canal de venta.",
        "Podés buscar, filtrar y exportar las entradas a Excel.",
        "La campanita te avisa la primera venta, las tandas agotadas, los reembolsos y los créditos acreditados.",
      ],
    },
    {
      id: "cancelar",
      titulo: "Anular, reembolsar y cancelar",
      intro: "Podés dejar sin efecto una entrada o cancelar el evento completo.",
      pasos: [
        "Para una entrada: buscala en la lista de compradores y tocá “Anular”. Si se pagó online, podés marcar que además se reembolse.",
        "Para un evento: tocá “Cancelar evento” y confirmá.",
        "En un evento cancelado, usá “Reembolsar todas” para devolver las compras online.",
      ],
      detalles: [
        "Una entrada anulada deja de valer en la puerta. El crédito vuelve a tu saldo, pero el cupo de la tanda no se libera.",
        "Una entrada ya usada no se puede anular.",
        "Los reembolsos salen del saldo de tu cuenta de Mercado Pago. Si no alcanza, quedan pendientes y podés reintentar.",
        "Al cancelar se avisa por email a quienes compraron.",
      ],
      atencion:
        "Desde la hora de inicio ya no podés cancelar el evento. Si hubo una emergencia, pedíselo al Administrador, que puede hacerlo hasta que el evento finaliza. No se puede deshacer.",
    },
  ],
};

const STAFF: Guia = {
  slug: "staff",
  nombre: "Equipo del evento",
  titulo: "Guía para el equipo del evento",
  resumen: "Ingresar, vender en puerta, escanear entradas y entender cada rechazo.",
  secciones: [
    {
      id: "ingresar",
      titulo: "Ingresar",
      intro: "El organizador crea tu cuenta y te llegan las credenciales por email.",
      pasos: [
        "Entrá a “Soy staff”.",
        "Ingresá tu email y tu contraseña.",
        "Según tu rol vas a ver el punto de venta o el escáner.",
      ],
      problemas: [
        { pregunta: "No puedo ingresar", respuesta: "Revisá el email y la contraseña. Pedile al organizador una contraseña nueva o que confirme que tu cuenta está activa." },
        { pregunta: "Me dice que hay demasiados intentos", respuesta: "Esperá un par de minutos antes de volver a probar." },
      ],
    },
    {
      id: "vender",
      titulo: "Vender en puerta",
      intro: "El Staff Vendedor genera entradas en el momento, sin pasar por Mercado Pago.",
      pasos: [
        "Elegí la tanda y la cantidad.",
        "Cobrá por tu cuenta, según lo acordado con el organizador.",
        "Cargá el nombre y el email de quien compra y confirmá la venta.",
        "Las entradas le llegan por email; también podés compartirle el enlace.",
      ],
      detalles: [
        "Arriba ves cuántas entradas te quedan para llegar a tu tope.",
        "Podés vender hasta 20 por operación, siempre dentro del cupo, de tu tope y del máximo por persona.",
        "Se vende hasta que el evento finaliza.",
      ],
      atencion: "El enlace de cada entrada es la entrada. Compartilo solo con quien la compró.",
      problemas: [
        { pregunta: "Llegaste a tu tope de ventas", respuesta: "Pedile al organizador que lo amplíe." },
        { pregunta: "No hay eventos para vender", respuesta: "El organizador tiene que asignarte un evento publicado que no haya finalizado." },
      ],
    },
    {
      id: "escanear",
      titulo: "Escanear entradas",
      intro: "El Staff QR valida cada entrada en la puerta. Validarla la marca como usada.",
      pasos: [
        "Permití el acceso a la cámara cuando el navegador lo pida.",
        "Apuntá al QR de la entrada.",
        "Esperá el resultado antes de dejar pasar.",
        "Si la cámara no lee, usá “Ingresar código manualmente” y tocá “Validar”.",
      ],
      detalles: ["Se necesita conexión a internet para validar.", "El escáner muestra la cuenta de entradas válidas e inválidas."],
      problemas: [{ pregunta: "No se abre la cámara", respuesta: "Revisá el permiso de cámara en el navegador. Mientras tanto, validá con el código de la entrada." }],
    },
    {
      id: "rechazos",
      titulo: "Qué significa cada rechazo",
      intro: "Si una entrada no es válida, el escáner explica el motivo.",
      detalles: [
        "Entrada ya utilizada: ya ingresó alguien con ese QR. El mensaje indica cuándo.",
        "Entrada anulada: el organizador la dejó sin efecto.",
        "Evento cancelado: ninguna entrada de ese evento permite el ingreso.",
        "Evento finalizado: pasaron 12 horas desde el inicio.",
        "Evento diferente: la entrada es de otro evento, no del que tenés asignado.",
        "No se encontró ninguna entrada: el código no corresponde a una entrada de AsistíAPP o está mal escrito.",
      ],
      atencion: "Ante una duda con una entrada rechazada, derivá a la persona con el organizador.",
    },
  ],
};

export const GUIAS: Guia[] = [COMPRADORES, ORGANIZADORES, STAFF];
