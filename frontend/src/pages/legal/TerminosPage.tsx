import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { LegalLayout, Seccion } from "./LegalLayout";

export function TerminosPage() {
  useDocumentTitle("Términos y Condiciones");
  return (
    <LegalLayout titulo="Términos y Condiciones" otro={{ texto: "Política de Privacidad", ruta: "/privacidad" }}>
      <Seccion titulo="1. Qué es AsistíAPP">
        <p>
          AsistíAPP es una plataforma <strong>intermediaria</strong> que permite a los Organizadores publicar eventos
          y vender entradas digitales con código QR. El contrato de venta de cada entrada es entre quien la compra y
          el Organizador del evento; AsistíAPP no vende las entradas ni organiza los eventos.
        </p>
      </Seccion>
      <Seccion titulo="2. Qué cobra la plataforma">
        <p>
          AsistíAPP cobra al Organizador únicamente por créditos (un crédito por cada entrada puesta a la venta). No
          cobra comisión sobre el precio de las entradas: el dinero que paga el comprador va directo a la cuenta de
          Mercado Pago del Organizador.
        </p>
      </Seccion>
      <Seccion titulo="3. Cancelaciones, cambios y reembolsos">
        <p>
          El Organizador es el responsable del evento, de sus cambios o cancelación y de devolver el dinero cuando
          corresponda. AsistíAPP solo ofrece las herramientas para anular entradas y reembolsar desde la cuenta del
          Organizador. Los reembolsos dependen de que esa cuenta tenga saldo suficiente.
        </p>
      </Seccion>
      <Seccion titulo="4. Arrepentimiento">
        <p>
          Cada evento muestra un botón de arrepentimiento que deriva al contacto del Organizador (WhatsApp o mail).
          La solicitud se resuelve con el Organizador.
        </p>
      </Seccion>
      <Seccion titulo="5. Uso de la entrada">
        <p>
          Quien tiene el enlace o el código QR de una entrada puede usarla. Cada código se valida una sola vez en la
          puerta: conviene no compartirlo.
        </p>
      </Seccion>
      <Seccion titulo="6. Cuentas">
        <p>
          Cada Organizador es responsable de los datos que carga y de la actividad de su cuenta y de su personal.
          AsistíAPP puede suspender cuentas que incumplan estos términos o la ley.
        </p>
      </Seccion>
      <Seccion titulo="7. Contacto y soporte">
        <p>Las consultas sobre estos términos se hacen por los medios de contacto publicados en el sitio.</p>
      </Seccion>
    </LegalLayout>
  );
}
