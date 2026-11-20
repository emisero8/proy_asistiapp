import type { PlazoLiberacionMp, ZonaComisionMp } from "./types";

/**
 * Comisiones de Mercado Pago Argentina para Checkout Pro / Link de pago, en porcentaje **sin IVA** (valores de
 * referencia al 2026-11-17). AsistíAPP no cobra comisión por venta de entradas: esto es lo que Mercado Pago le
 * descuenta al Organizador según el plazo en que libera el dinero.
 *
 * El monto real del cargo lo calcula el backend (`CargoServicioMp.java`, misma fórmula): acá se usa para la
 * tabla informativa y para el ejemplo de Mi perfil. Si Mercado Pago cambia las tasas, se actualizan en los dos.
 */
export const PLAZOS_MP: ReadonlyArray<{ valor: PlazoLiberacionMp; etiqueta: string; general: number; zonaAlta: number }> = [
  { valor: "AlInstante", etiqueta: "Al instante", general: 6.29, zonaAlta: 6.6 },
  { valor: "Dias10", etiqueta: "En 10 días", general: 4.39, zonaAlta: 4.61 },
  { valor: "Dias18", etiqueta: "En 18 días", general: 3.39, zonaAlta: 3.56 },
  { valor: "Dias35", etiqueta: "En 35 días", general: 1.49, zonaAlta: 1.56 },
];

export const ZONAS_MP: ReadonlyArray<{ valor: ZonaComisionMp; etiqueta: string }> = [
  { valor: "General", etiqueta: "Resto del país" },
  { valor: "BuenosAiresEntreRiosChubut", etiqueta: "Buenos Aires, Entre Ríos o Chubut" },
];

const IVA = 1.21;

/** `6.29` → `"6,29 % + IVA"`. */
export function textoComision(porcentaje: number): string {
  return `${porcentaje.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} % + IVA`;
}

/** `8.24` → `"8,24 %"`. */
export function textoPorcentaje(porcentaje: number): string {
  return `${porcentaje.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

export function porcentajeMp(plazo: PlazoLiberacionMp, zona: ZonaComisionMp): number {
  const fila = PLAZOS_MP.find((p) => p.valor === plazo) ?? PLAZOS_MP[0];
  return zona === "BuenosAiresEntreRiosChubut" ? fila.zonaAlta : fila.general;
}

/**
 * Cargo por entrada que pagaría el comprador si el Organizador traslada la comisión: la comisión con IVA (`t`) se
 * cobra sobre el total, así que el cargo es `precio × t / (1 − t)`, al centavo. Mismo cálculo que el backend.
 */
export function cargoEstimado(precio: number, plazo: PlazoLiberacionMp, zona: ZonaComisionMp): number {
  if (precio <= 0) return 0;
  const t = (porcentajeMp(plazo, zona) * IVA) / 100;
  return Math.round(((precio * t) / (1 - t)) * 100) / 100;
}

export interface DesglosePedido {
  /** Precio de las entradas: precio × cantidad. */
  subtotal: number;
  /** Cargo por procesamiento de pago: cargo por entrada × cantidad (0 si lo absorbe el Organizador). */
  cargo: number;
  /** Lo que se cobra en Mercado Pago. */
  total: number;
}

/**
 * Desglose del pedido del checkout. `cargoUnitario` viene del backend (`TandaResponseDTO.cargoServicio`), que es
 * quien fija el monto que se cobra. Se suma en centavos enteros para no arrastrar errores de punto flotante
 * (3 × 82,38 no da 247,14 exacto en `number`).
 */
export function desglosePedido(precio: number, cargoUnitario: number | null | undefined, cantidad: number): DesglosePedido {
  const centavos = (n: number) => Math.round(n * 100);
  const subtotal = centavos(precio) * cantidad;
  const cargo = centavos(cargoUnitario && cargoUnitario > 0 ? cargoUnitario : 0) * cantidad;
  return { subtotal: subtotal / 100, cargo: cargo / 100, total: (subtotal + cargo) / 100 };
}

/**
 * Qué pasa con la comisión de Mercado Pago cuando hay un reembolso. Se muestra donde el Organizador decide quién
 * paga la comisión y donde reembolsa: el comprador recibe todo lo que pagó (cargo incluido) y Mercado Pago se
 * queda con su comisión, así que la termina absorbiendo el Organizador.
 */
export const AVISO_COMISION_REEMBOLSO = "Mercado Pago no devuelve su comisión cuando hay un reembolso: la absorbés vos.";
