import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider } from "../lib/theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("arranca en modo oscuro y ofrece cambiar a claro", () => {
    renderToggle();
    expect(screen.getByRole("button", { name: "Cambiar a modo claro" })).toBeInTheDocument();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("al tocarlo alterna el tema, el texto del botón y lo recuerda para la próxima visita", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("button", { name: "Cambiar a modo claro" }));
    expect(screen.getByRole("button", { name: "Cambiar a modo oscuro" })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("asistiapp_theme")).toBe("light");

    await user.click(screen.getByRole("button", { name: "Cambiar a modo oscuro" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("asistiapp_theme")).toBe("dark");
  });
});
