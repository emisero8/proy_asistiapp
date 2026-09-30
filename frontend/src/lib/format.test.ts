import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hoyLocal } from "./format";

describe("hoyLocal", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "America/Argentina/Buenos_Aires");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("de noche en Argentina devuelve el día local, no el día UTC siguiente", () => {
    // 22:30 en Buenos Aires = 01:30 UTC del día siguiente.
    vi.setSystemTime(new Date("2026-09-30T22:30:00-03:00"));

    // Confirma que el escenario reproduce el bug: la fecha UTC ya es "mañana".
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(hoyLocal()).toBe("2026-09-30");
  });

  it("de día coincide con la fecha UTC", () => {
    vi.setSystemTime(new Date("2026-09-30T12:00:00-03:00"));
    expect(hoyLocal()).toBe("2026-09-30");
  });

  it("rellena mes y día con cero a la izquierda", () => {
    vi.setSystemTime(new Date("2026-01-05T10:00:00-03:00"));
    expect(hoyLocal()).toBe("2026-01-05");
  });
});
