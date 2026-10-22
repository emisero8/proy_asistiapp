import { useEffect, useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { api } from "../lib/api";
import type { SoporteResponseDTO } from "../lib/types";

/**
 * Línea de contacto de soporte (mail / WhatsApp), configurable por el Admin.
 * Pensada para el Comprador, que nunca inicia sesión — así que vive en
 * pantallas públicas, no en los layouts logueados (que ya tienen la
 * campanita de notificaciones para avisos del sistema).
 */
export function SupportContactLine() {
  const [soporte, setSoporte] = useState<SoporteResponseDTO | null>(null);

  useEffect(() => {
    api
      .get<SoporteResponseDTO>("/public/soporte", { skipAuth: true })
      .then(setSoporte)
      .catch(() => {});
  }, []);

  if (!soporte || (!soporte.emailSoporte && !soporte.whatsappSoporte)) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="text-xs text-muted-foreground">¿Necesitás ayuda?</span>
      {soporte.emailSoporte && (
        <a
          href={`mailto:${soporte.emailSoporte}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <Mail size={12} />
          {soporte.emailSoporte}
        </a>
      )}
      {soporte.whatsappSoporte && (
        <a
          href={`https://wa.me/${soporte.whatsappSoporte}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle size={12} />
          WhatsApp
        </a>
      )}
    </div>
  );
}
