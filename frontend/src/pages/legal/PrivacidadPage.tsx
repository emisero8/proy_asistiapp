import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { LegalLayout, Seccion } from "./LegalLayout";

export function PrivacidadPage() {
  useDocumentTitle("Política de Privacidad");
  return (
    <LegalLayout titulo="Política de Privacidad" otro={{ texto: "Términos y Condiciones", ruta: "/terminos" }}>
      <Seccion titulo="1. Qué datos guardamos">
        <p>
          De los compradores: nombre y email. De los Organizadores y su personal: nombre, email, contacto para el
          botón de arrepentimiento y los datos de su cuenta de Mercado Pago necesarios para cobrar (los accesos se
          guardan cifrados). No guardamos datos de tarjetas: el pago lo procesa Mercado Pago.
        </p>
      </Seccion>
      <Seccion titulo="2. Para qué los usamos">
        <p>
          Para emitir y enviar las entradas, validarlas en la puerta, procesar pagos y reembolsos, avisar
          cambios del evento y dar soporte. El Organizador del evento recibe los datos de quienes compraron sus
          entradas.
        </p>
      </Seccion>
      <Seccion titulo="3. Con quién los compartimos">
        <p>
          Con Mercado Pago (pagos), con el Organizador del evento y con proveedores que nos prestan servicios, como
          el envío de mails y el almacenamiento de imágenes, que pueden estar fuera del país.
        </p>
      </Seccion>
      <Seccion titulo="4. Tus derechos">
        <p>
          Podés pedir el acceso, rectificación y supresión de tus datos. La Agencia de Acceso a la Información
          Pública (AAIP) es el órgano de control de la Ley 25.326 y atiende denuncias y reclamos.
        </p>
      </Seccion>
      <Seccion titulo="5. Cuánto tiempo los guardamos">
        <p>El tiempo de conservación se define con asesoramiento legal antes de salir a producción.</p>
      </Seccion>
    </LegalLayout>
  );
}
