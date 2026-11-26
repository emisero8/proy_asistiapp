import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/theme";
import { AyudaPage } from "./AyudaPage";
import { GuiaPage } from "./GuiaPage";
import { GUIAS } from "./contenido";

function renderEn(ruta: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/ayuda" element={<AyudaPage />} />
          <Route path="/ayuda/:guia" element={<GuiaPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** jsdom no maqueta: se le dice a qué altura de la pantalla está cada sección y se avisa el scroll. */
async function scrollHasta(ids: string[], leida: number) {
  ids.forEach((id, i) => {
    vi.spyOn(document.getElementById(id)!, "getBoundingClientRect").mockReturnValue({ top: (i - leida) * 500 } as DOMRect);
  });
  await act(async () => {
    window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => requestAnimationFrame(r));
  });
}

describe("Centro de ayuda", () => {
  afterEach(() => vi.restoreAllMocks());

  it("marca en los dos índices la sección que se está leyendo a medida que se hace scroll", async () => {
    const guia = GUIAS[1];
    const ids = guia.secciones.map((s) => s.id);
    renderEn(`/ayuda/${guia.slug}`);

    for (const leida of [0, 2, 1]) {
      await scrollHasta(ids, leida);
      const marcadas = screen
        .getAllByRole("link", { hidden: true })
        .filter((a) => a.getAttribute("aria-current") === "location");
      expect(marcadas.map((a) => a.getAttribute("href"))).toEqual([`#${ids[leida]}`, `#${ids[leida]}`]);
    }
  });

  it("el índice enlaza a las tres guías", () => {
    renderEn("/ayuda");
    for (const guia of GUIAS) {
      expect(screen.getByRole("link", { name: new RegExp(guia.nombre) })).toHaveAttribute("href", `/ayuda/${guia.slug}`);
    }
  });

  it.each(GUIAS)("$slug muestra todas sus secciones y marca la guía actual", (guia) => {
    renderEn(`/ayuda/${guia.slug}`);
    expect(screen.getByRole("heading", { level: 1, name: guia.titulo })).toBeInTheDocument();
    for (const seccion of guia.secciones) {
      expect(screen.getByRole("heading", { level: 2, name: seccion.titulo })).toBeInTheDocument();
    }
    const guias = screen.getByRole("navigation", { name: "Guías" });
    expect(within(guias).getByRole("link", { name: guia.nombre })).toHaveAttribute("aria-current", "page");
  });

  it("los identificadores de sección no se repiten dentro de una guía (son las anclas)", () => {
    for (const guia of GUIAS) {
      const ids = guia.secciones.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("una guía que no existe vuelve al índice", () => {
    renderEn("/ayuda/inexistente");
    expect(screen.getByRole("heading", { level: 1, name: "¿Cómo te ayudamos?" })).toBeInTheDocument();
  });
});
