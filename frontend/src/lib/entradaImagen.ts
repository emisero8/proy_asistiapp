/**
 * Arma una imagen PNG de la entrada (datos + QR) con un <canvas>, sin librerías externas.
 * Es la copia descargable de "Mi entrada": los mismos datos que ve el comprador, con el QR en
 * negro sobre blanco para que siga siendo escaneable.
 */
export interface DatosImagenEntrada {
  nombreEvento: string;
  /** Fecha, hora y lugar del evento, ya armados en una línea; vacío si no hay. */
  detalle?: string;
  nombreTanda: string;
  precio: string;
  titular: string;
  codigo: string;
  /** URL del PNG del QR (el que ya muestra la pantalla). */
  qrUrl: string;
}

const ANCHO = 900;
const MARGEN = 64;
const CARBON = "#141311";
const PAPEL = "#f3f1ec";
const LIMA = "#b6f24a";
const GRIS = "#5c5a54";

/** Parte un texto en líneas que entren en `maxAncho` (corta palabras largas si hace falta). */
function envolver(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width <= maxAncho) {
      actual = prueba;
      continue;
    }
    if (actual) lineas.push(actual);
    actual = palabra;
    while (ctx.measureText(actual).width > maxAncho && actual.length > 1) {
      let corte = actual.length - 1;
      while (corte > 1 && ctx.measureText(actual.slice(0, corte)).width > maxAncho) corte--;
      lineas.push(actual.slice(0, corte));
      actual = actual.slice(corte);
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export async function generarImagenEntrada(datos: DatosImagenEntrada): Promise<Blob> {
  const respuesta = await fetch(datos.qrUrl);
  if (!respuesta.ok) throw new Error("No se pudo obtener el QR");
  const qr = await createImageBitmap(await respuesta.blob());

  // Medimos antes de dibujar para saber el alto total.
  const medida = document.createElement("canvas").getContext("2d");
  if (!medida) throw new Error("Canvas no disponible");
  medida.font = "800 54px Archivo, Inter, Arial, sans-serif";
  const titulo = envolver(medida, datos.nombreEvento, ANCHO - MARGEN * 2);
  const altoTitulo = titulo.length * 62;
  medida.font = "700 38px Inter, Arial, sans-serif";
  const lineasTitular = envolver(medida, datos.titular, ANCHO - MARGEN * 2);

  medida.font = "500 28px Inter, Arial, sans-serif";
  const lineasDetalle = datos.detalle ? envolver(medida, datos.detalle, ANCHO - MARGEN * 2) : [];
  const altoDetalle = lineasDetalle.length ? 20 + lineasDetalle.length * 38 : 0;
  const yDatos = 300 + altoTitulo + altoDetalle;
  const yPerforacion = yDatos + 130 + lineasTitular.length * 46 + 70;
  const tamQr = 440;
  const alto = yPerforacion + 60 + tamQr + 150;

  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, ANCHO, alto);

  // Portada lima
  ctx.fillStyle = LIMA;
  ctx.fillRect(0, 0, ANCHO, 200);
  ctx.fillStyle = CARBON;
  ctx.font = "600 24px 'IBM Plex Mono', monospace";
  ctx.fillText("PASE DIGITAL · AsistíAPP", MARGEN, 110);

  // Título
  ctx.fillStyle = CARBON;
  ctx.font = "800 54px Archivo, Inter, Arial, sans-serif";
  titulo.forEach((linea, i) => ctx.fillText(linea, MARGEN, 290 + i * 62));

  // Fecha, hora y lugar
  ctx.fillStyle = GRIS;
  ctx.font = "500 28px Inter, Arial, sans-serif";
  const yDetalle = 290 + (titulo.length - 1) * 62 + 56;
  lineasDetalle.forEach((linea, i) => ctx.fillText(linea, MARGEN, yDetalle + i * 38));

  // Datos
  const colDer = ANCHO / 2 + 20;
  const dato = (etiqueta: string, valor: string, x: number, y: number) => {
    ctx.fillStyle = GRIS;
    ctx.font = "600 22px 'IBM Plex Mono', monospace";
    ctx.fillText(etiqueta.toUpperCase(), x, y);
    ctx.fillStyle = CARBON;
    ctx.font = "700 38px Inter, Arial, sans-serif";
    ctx.fillText(valor, x, y + 46);
  };
  dato("Tanda", datos.nombreTanda, MARGEN, yDatos);
  dato("Precio", datos.precio, colDer, yDatos);
  ctx.fillStyle = GRIS;
  ctx.font = "600 22px 'IBM Plex Mono', monospace";
  ctx.fillText("TITULAR", MARGEN, yDatos + 110);
  ctx.fillStyle = CARBON;
  ctx.font = "700 38px Inter, Arial, sans-serif";
  lineasTitular.forEach((linea, i) => ctx.fillText(linea, MARGEN, yDatos + 156 + i * 46));

  // Perforación con muescas
  ctx.strokeStyle = GRIS;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(MARGEN, yPerforacion);
  ctx.lineTo(ANCHO - MARGEN, yPerforacion);
  ctx.stroke();
  ctx.setLineDash([]);
  // Las muescas se recortan (transparentes) en vez de pintarse, como en un ticket real.
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(0, yPerforacion, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ANCHO, yPerforacion, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // QR siempre negro sobre blanco, con zona de silencio
  const xQr = (ANCHO - tamQr) / 2;
  const yQr = yPerforacion + 60;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(xQr - 32, yQr - 32, tamQr + 64, tamQr + 64);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, xQr, yQr, tamQr, tamQr);

  // Código en texto
  ctx.fillStyle = CARBON;
  ctx.font = "500 24px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  const lineasCodigo = envolver(ctx, datos.codigo, ANCHO - MARGEN * 2);
  lineasCodigo.forEach((linea, i) => ctx.fillText(linea, ANCHO / 2, yQr + tamQr + 80 + i * 32));

  return new Promise((resolver, rechazar) =>
    canvas.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo generar la imagen"))), "image/png"),
  );
}
