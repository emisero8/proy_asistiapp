/**
 * Portada generativa para eventos sin imagen (o cuya imagen no carga). Reemplaza el placeholder
 * de "imagen rota" por un póster oscuro con un patrón geométrico sutil elegido de forma
 * **determinística** según el nombre del evento, y las iniciales del evento en `Archivo` grande
 * abajo a la izquierda (como el prototipo). Las iniciales escalan con el contenedor (unidades de
 * container query), así se ven bien tanto en una miniatura de 32 px como en una portada 16:9.
 */

const FONDO = "#181816";
const LINEA = "#33312b";
const LINEA_SUAVE = "#2a2824";
const LUZ = "#c9c7c0";

/** Hash FNV-1a de 32 bits, estable entre sesiones (no usa Math.random). */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Preposiciones y artículos comunes en español que nunca deben ser la "letra principal"
 * de las iniciales (para que "Festival de prueba" dé "FP", no "FD").
 */
const STOPWORDS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "en", "a", "para", "por", "con",
]);

/**
 * Iniciales inteligentes: primera letra de las dos primeras palabras **significativas**
 * (ignorando artículos/preposiciones), p. ej. "Festival de prueba" → "FP". Si el título
 * es de una sola palabra significativa, sus dos primeras letras ("Festival" → "FE"). Si
 * todas las palabras son stopwords, cae a las literales para no quedar vacío.
 */
function iniciales(nombre: string): string {
  const todas = nombre.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (todas.length === 0) return "EV";
  const significativas = todas.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const base = significativas.length > 0 ? significativas : todas;
  if (base.length === 1) return base[0].slice(0, 2).toUpperCase();
  return (base[0][0] + base[1][0]).toUpperCase();
}

interface Props {
  /** Nombre del evento: siembra el patrón y las iniciales. */
  nombre?: string | null;
  /** Mismas clases de tamaño/encuadre/borde que la imagen real. */
  className: string;
  /** Si se pasa, el bloque se anuncia como imagen con este texto; si no, es decorativo. */
  alt?: string;
}

export function PortadaGenerativa({ nombre, className, alt }: Props) {
  const seed = (nombre ?? "").trim() || "Evento";
  const h = hashString(seed);
  const variante = h % 4;
  const ini = iniciales(seed);
  const rol = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true as const };

  return (
    <div className={`${className} relative overflow-hidden`} style={{ background: FONDO, containerType: "size" }} {...rol}>
      <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        {variante === 0 && <Diagonales h={h} />}
        {variante === 1 && <Concentricas h={h} />}
        {variante === 2 && <Verticales h={h} />}
        {variante === 3 && <Grilla h={h} />}
      </svg>
      <span
        className="absolute bottom-0 left-0 font-display font-extrabold uppercase leading-none tracking-tight text-white/92"
        style={{ fontSize: "clamp(0.6rem, 30cqmin, 3.5rem)", padding: "7cqmin 8cqmin" }}
      >
        {ini}
      </span>
    </div>
  );
}

/** 1 — líneas diagonales finas + viñeta. */
function Diagonales({ h }: { h: number }) {
  const sep = 6 + (h % 3); // 6–8
  return (
    <>
      <defs>
        <pattern id={`d-${h}`} width={sep} height={sep} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2={sep} stroke={LINEA} strokeWidth="1" />
        </pattern>
        <radialGradient id={`dv-${h}`} cx="50%" cy="38%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#d-${h})`} />
      <rect width="120" height="120" fill={`url(#dv-${h})`} />
    </>
  );
}

/** 2 — ondas concéntricas + "luna" clara. */
function Concentricas({ h }: { h: number }) {
  const cx = 84 + (h % 12); // luna hacia la derecha
  const cy = 30 + (h % 10);
  const anillos = Array.from({ length: 11 }, (_, i) => 10 + i * 11);
  return (
    <>
      <rect width="120" height="120" fill={FONDO} />
      {anillos.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={LINEA} strokeWidth="1" opacity={0.9 - r / 200} />
      ))}
      <circle cx={cx} cy={cy} r="14" fill={LUZ} opacity="0.92" />
      <circle cx={cx} cy={cy} r="14" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="1" />
    </>
  );
}

/** 3 — rayas verticales con luz desde arriba. */
function Verticales({ h }: { h: number }) {
  const sep = 7 + (h % 3); // 7–9
  return (
    <>
      <defs>
        <pattern id={`v-${h}`} width={sep} height="120" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width={Math.max(2, sep - 4)} height="120" fill={LINEA_SUAVE} />
        </pattern>
        <linearGradient id={`vl-${h}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LINEA} stopOpacity="0.9" />
          <stop offset="55%" stopColor={FONDO} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#v-${h})`} />
      <rect width="120" height="120" fill={`url(#vl-${h})`} />
    </>
  );
}

/** 4 — grilla fina + viñeta. */
function Grilla({ h }: { h: number }) {
  const sep = 12 + (h % 6); // 12–17
  return (
    <>
      <defs>
        <pattern id={`g-${h}`} width={sep} height={sep} patternUnits="userSpaceOnUse">
          <path d={`M ${sep} 0 L 0 0 0 ${sep}`} fill="none" stroke={LINEA} strokeWidth="1" />
        </pattern>
        <radialGradient id={`gv-${h}`} cx="30%" cy="30%" r="90%">
          <stop offset="50%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#g-${h})`} />
      <rect width="120" height="120" fill={`url(#gv-${h})`} />
    </>
  );
}
