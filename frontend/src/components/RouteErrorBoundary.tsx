import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "./ui";

const CLAVE_RECARGA = "asistiapp_recarga_por_chunk";
const VENTANA_RECARGA_MS = 10_000;

/**
 * Error típico de un chunk lazy que no se pudo bajar. En producción pasa con pestañas abiertas
 * durante un deploy: el HTML viejo pide archivos con hashes que ya no existen. Los mensajes
 * varían según el navegador.
 */
function esErrorDeCargaDeChunk(error: unknown): boolean {
  const mensaje = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Outdated Optimize Dep/i.test(
    mensaje,
  );
}

function recargaRecienIntentada(): boolean {
  try {
    const t = Number(sessionStorage.getItem(CLAVE_RECARGA));
    return Number.isFinite(t) && Date.now() - t < VENTANA_RECARGA_MS;
  } catch {
    return true; // sin sessionStorage no hay forma de evitar un loop: no se recarga solo
  }
}

function marcarRecarga() {
  try {
    sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
  } catch {
    // ignorado: ver recargaRecienIntentada
  }
}

interface Props {
  children: ReactNode;
  /** `page` ocupa la pantalla entera; `content` vive dentro de un layout (sidebar visible). */
  variant?: "page" | "content";
  /** Inyectable para tests. */
  onReload?: () => void;
}

interface State {
  error: unknown;
}

/**
 * Atrapa errores de render de una ruta para que la app no quede en blanco.
 *
 * - **Chunk que no carga** (versión nueva desplegada): recarga la página **una vez** sola; si
 *   en los 10 s siguientes vuelve a fallar, no insiste (evita un loop) y muestra el aviso con
 *   "Recargar".
 * - **Cualquier otro error:** aviso con "Recargar" e "Ir al inicio".
 *
 * Adentro de `<AnimatedOutlet>` se remonta con cada navegación, así que cambiar de pantalla
 * también lo resetea.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (esErrorDeCargaDeChunk(error) && !recargaRecienIntentada()) {
      marcarRecarga();
      this.recargar();
      return;
    }
    console.error("Error de render en la ruta:", error, info.componentStack);
  }

  recargar = () => {
    (this.props.onReload ?? (() => window.location.reload()))();
  };

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;

    const deChunk = esErrorDeCargaDeChunk(error);
    return (
      <div
        role="alert"
        className={
          this.props.variant === "content"
            ? "flex min-h-[60vh] items-center justify-center px-6 py-16"
            : "flex min-h-dvh items-center justify-center bg-background px-6 py-16"
        }
      >
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-warning/14 text-warning">
            <TriangleAlert size={20} aria-hidden="true" />
          </div>
          <h1 className="text-lg font-extrabold text-foreground">
            {deChunk ? "Hay una versión nueva de AsistíAPP" : "Algo salió mal"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {deChunk
              ? "No pudimos cargar esta pantalla porque la aplicación se actualizó. Recargá para usar la versión nueva."
              : "Ocurrió un error inesperado al mostrar esta pantalla. Recargá para intentarlo de nuevo."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button leftIcon={<RefreshCw size={15} />} onClick={this.recargar}>
              Recargar
            </Button>
            {!deChunk && (
              <Button variant="secondary" onClick={() => window.location.assign("/")}>
                Ir al inicio
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
