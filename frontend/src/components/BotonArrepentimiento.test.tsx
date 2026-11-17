import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BotonArrepentimiento } from "./BotonArrepentimiento";

describe("BotonArrepentimiento", () => {
  it("con WhatsApp, abre el chat del Organizador con el evento ya escrito", () => {
    render(<BotonArrepentimiento nombreEvento="Fiesta" contactoWhatsapp="5491155551234" contactoEmail={null} />);

    const link = screen.getByRole("link", { name: /whatsapp/i });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin + url.pathname).toBe("https://wa.me/5491155551234");
    expect(url.searchParams.get("text")).toContain("Fiesta");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.queryByRole("link", { name: /mail|email/i })).not.toBeInTheDocument();
  });

  it("con email, arma un mailto con el asunto y el evento", () => {
    render(<BotonArrepentimiento nombreEvento="Fiesta" contactoWhatsapp={null} contactoEmail="hola@evento.com" />);

    const link = screen.getByRole("link", { name: /email/i });
    expect(link.getAttribute("href")).toMatch(/^mailto:hola@evento\.com\?/);
    expect(decodeURIComponent(link.getAttribute("href")!)).toContain("Fiesta");
  });

  it("con los dos, muestra los dos caminos", () => {
    render(<BotonArrepentimiento nombreEvento="Fiesta" contactoWhatsapp="5491155551234" contactoEmail="hola@evento.com" />);

    expect(screen.getByRole("link", { name: /whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email/i })).toBeInTheDocument();
  });

  it("sin ningún contacto no muestra nada", () => {
    const { container } = render(<BotonArrepentimiento nombreEvento="Fiesta" contactoWhatsapp={null} contactoEmail={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("aclara que el pedido lo resuelve el Organizador, no la plataforma", () => {
    render(<BotonArrepentimiento nombreEvento="Fiesta" contactoWhatsapp="5491155551234" contactoEmail={null} />);

    expect(screen.getByText(/organizador/i)).toBeInTheDocument();
  });
});
