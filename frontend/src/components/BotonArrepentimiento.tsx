import { MessageCircle, Mail } from "lucide-react";

interface Props {
  nombreEvento: string;
  contactoWhatsapp: string | null;
  contactoEmail: string | null;
}

/**
 * Botón de arrepentimiento (8.8). La plataforma solo intermedia: deriva al WhatsApp o al email del
 * Organizador, que es quien resuelve el pedido. No recibe ni aprueba solicitudes. Sin contacto cargado
 * no se muestra (los eventos nuevos no se publican sin uno).
 */
export function BotonArrepentimiento({ nombreEvento, contactoWhatsapp, contactoEmail }: Props) {
  if (!contactoWhatsapp && !contactoEmail) return null;

  const mensaje = `Hola, quiero ejercer el arrepentimiento de mi compra de entradas para "${nombreEvento}".`;
  const hrefWhatsapp = contactoWhatsapp ? `https://wa.me/${contactoWhatsapp}?text=${encodeURIComponent(mensaje)}` : null;
  const hrefEmail = contactoEmail
    ? `mailto:${contactoEmail}?subject=${encodeURIComponent(`Arrepentimiento de compra: ${nombreEvento}`)}&body=${encodeURIComponent(mensaje)}`
    : null;

  const BOTON =
    "inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-bold text-foreground">¿Te arrepentiste de tu compra?</p>
      <p className="text-xs text-muted-foreground mt-1">
        El pedido lo gestiona directamente el Organizador del evento. Escribile por alguno de estos medios.
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        {hrefWhatsapp && (
          <a href={hrefWhatsapp} target="_blank" rel="noopener noreferrer" className={BOTON}>
            <MessageCircle size={14} /> Escribir por WhatsApp
          </a>
        )}
        {hrefEmail && (
          <a href={hrefEmail} className={BOTON}>
            <Mail size={14} /> Escribir por email
          </a>
        )}
      </div>
    </div>
  );
}
