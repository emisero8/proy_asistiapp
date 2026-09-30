import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DialogProvider } from "./DialogProvider";
import { useDialog, type ConfirmOpciones, type PromptOpciones } from "../lib/dialogs";

/** Pantalla mínima que dispara cada tipo de diálogo y muestra en pantalla lo que devolvió. */
function Probe({ confirmOpts, promptOpts }: { confirmOpts?: Partial<ConfirmOpciones>; promptOpts?: Partial<PromptOpciones> }) {
  const { confirm, alert, prompt } = useDialog();
  const [resultado, setResultado] = useState("(sin resultado)");

  return (
    <div>
      <button onClick={async () => setResultado(`confirm=${await confirm({ titulo: "¿Seguro?", mensaje: "Se borra todo", ...confirmOpts })}`)}>
        abrir confirm
      </button>
      <button
        onClick={async () => {
          await alert({ titulo: "Contraseña temporal", mensaje: "Pasásela al staff", copiable: "Abc123xyz9" });
          setResultado("alert cerrado");
        }}
      >
        abrir alert
      </button>
      <button
        onClick={async () =>
          setResultado(`prompt=${JSON.stringify(await prompt({ titulo: "Nuevo nombre", etiqueta: "Nombre", ...promptOpts }))}`)
        }
      >
        abrir prompt
      </button>
      <button
        onClick={async () => {
          const primero = confirm({ titulo: "Primero" });
          const segundo = confirm({ titulo: "Segundo" });
          setResultado(`cola=${await primero},${await segundo}`);
        }}
      >
        abrir dos
      </button>
      <p data-testid="resultado">{resultado}</p>
    </div>
  );
}

function renderProbe(props: Parameters<typeof Probe>[0] = {}) {
  return render(
    <DialogProvider>
      <Probe {...props} />
    </DialogProvider>,
  );
}

const resultado = () => screen.getByTestId("resultado").textContent;

describe("DialogProvider — confirm", () => {
  it("devuelve true al confirmar y cierra el diálogo", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir confirm" }));

    const dialogo = screen.getByRole("dialog", { name: "¿Seguro?" });
    expect(within(dialogo).getByText("Se borra todo")).toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(resultado()).toBe("confirm=true"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("devuelve false al cancelar", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir confirm" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(resultado()).toBe("confirm=false"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape cancela", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir confirm" }));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(resultado()).toBe("confirm=false"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("un clic en el fondo cancela, pero un clic dentro del panel no", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir confirm" }));

    await user.click(screen.getByRole("heading", { name: "¿Seguro?" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("dialog").parentElement!);
    await waitFor(() => expect(resultado()).toBe("confirm=false"));
  });

  it("variante destructiva: es un alertdialog, arranca con el foco en Cancelar y respeta los textos", async () => {
    const user = userEvent.setup();
    renderProbe({ confirmOpts: { variante: "destructiva", confirmarTexto: "Eliminar", cancelarTexto: "No, volver" } });
    await user.click(screen.getByRole("button", { name: "abrir confirm" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No, volver" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();

    // Con el foco en "No, volver", Enter no borra nada.
    await user.keyboard("{Enter}");
    await waitFor(() => expect(resultado()).toBe("confirm=false"));
  });

  it("variante normal: el foco inicial queda en el botón de confirmar", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir confirm" }));
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveFocus();
  });

  it("al cerrar devuelve el foco al botón que abrió el diálogo", async () => {
    const user = userEvent.setup();
    renderProbe();
    const disparador = screen.getByRole("button", { name: "abrir confirm" });
    await user.click(disparador);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(disparador).toHaveFocus());
  });

  it("Tab queda atrapado dentro del diálogo (ciclo en ambos sentidos)", async () => {
    const user = userEvent.setup();
    renderProbe({ confirmOpts: { variante: "destructiva" } });
    await user.click(screen.getByRole("button", { name: "abrir confirm" }));

    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    const confirmar = screen.getByRole("button", { name: "Confirmar" });
    expect(cancelar).toHaveFocus();

    await user.tab();
    expect(confirmar).toHaveFocus();
    await user.tab(); // del último vuelve al primero, sin escaparse a la página de atrás
    expect(cancelar).toHaveFocus();
    await user.tab({ shift: true }); // del primero va al último
    expect(confirmar).toHaveFocus();
  });

  it("bloquea el scroll del fondo mientras está abierto y lo restaura al cerrar", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir confirm" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });

  it("si se piden dos a la vez, se muestran de a uno y en orden", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir dos" }));

    expect(screen.getByRole("heading", { name: "Primero" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Segundo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("heading", { name: "Segundo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(resultado()).toBe("cola=true,false"));
  });
});

describe("DialogProvider — alert", () => {
  it("se cierra con el botón, sin botón de cancelar, y resuelve la promesa", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir alert" }));

    const dialogo = screen.getByRole("dialog", { name: "Contraseña temporal" });
    expect(within(dialogo).queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "Entendido" }));

    await waitFor(() => expect(resultado()).toBe("alert cerrado"));
  });

  it("muestra el texto copiable y el botón Copiar lo copia al portapapeles", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir alert" }));

    expect(screen.getByText("Abc123xyz9")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe("Abc123xyz9");
  });
});

describe("DialogProvider — prompt", () => {
  it("devuelve el texto ingresado al enviar con Enter, con el foco inicial en el input", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir prompt" }));

    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveFocus();
    await user.type(input, "Felipe{Enter}");

    await waitFor(() => expect(resultado()).toBe('prompt="Felipe"'));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("devuelve null al cancelar", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "abrir prompt" }));
    await user.type(screen.getByLabelText("Nombre"), "algo");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(resultado()).toBe("prompt=null"));
  });

  it("no se cierra mientras la validación falle, marca el error y lo limpia al volver a escribir", async () => {
    const user = userEvent.setup();
    renderProbe({ promptOpts: { tipo: "password", validar: (v) => (v.length >= 8 ? null : "Mínimo 8 caracteres") } });
    await user.click(screen.getByRole("button", { name: "abrir prompt" }));

    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveAttribute("type", "password");
    await user.type(input, "corta{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Mínimo 8 caracteres");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(resultado()).toBe("(sin resultado)");

    await user.type(input, "!");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.type(input, "unaClaveLarga{Enter}");
    await waitFor(() => expect(resultado()).toBe('prompt="corta!unaClaveLarga"'));
  });
});

describe("useDialog", () => {
  it("falla con un mensaje claro si se usa fuera del DialogProvider", () => {
    const consola = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow("useDialog debe usarse dentro de <DialogProvider>");
    } finally {
      console.error = consola;
    }
  });
});
