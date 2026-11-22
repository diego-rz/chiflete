import { afterEach, describe, expect, it } from "vitest";
import { formatNumber, formatObservedAt, toCardinal } from "@/lib/format";

describe("toCardinal", () => {
  it("usa 8 puntos con sectores de 45° centrados", () => {
    expect(toCardinal(0)).toBe("cardinal.N");
    expect(toCardinal(22)).toBe("cardinal.N");
    expect(toCardinal(23)).toBe("cardinal.NE");
    expect(toCardinal(90)).toBe("cardinal.E");
    expect(toCardinal(135)).toBe("cardinal.SE");
    expect(toCardinal(198)).toBe("cardinal.S");
    expect(toCardinal(225)).toBe("cardinal.SO");
    expect(toCardinal(270)).toBe("cardinal.O");
    expect(toCardinal(315)).toBe("cardinal.NO");
    expect(toCardinal(337)).toBe("cardinal.NO");
    expect(toCardinal(338)).toBe("cardinal.N");
    expect(toCardinal(360)).toBe("cardinal.N");
  });
});

describe("formatObservedAt", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  const observedAt = "2026-11-01T02:00:00Z";

  it("usa la zona horaria del dispositivo", () => {
    const sameDayInMadrid = new Date("2026-11-01T10:00:00Z");

    process.env.TZ = "Europe/Madrid";
    expect(formatObservedAt(observedAt, { now: sameDayInMadrid, locale: "es" })).toBe("3:00");

    process.env.TZ = "America/Argentina/Cordoba";
    const sameDayInCordoba = new Date("2026-11-01T01:00:00Z");
    expect(formatObservedAt(observedAt, { now: sameDayInCordoba, locale: "es" })).toBe("23:00");
  });

  it("incluye la fecha cuando el día no es el de hoy en el dispositivo", () => {
    process.env.TZ = "America/Argentina/Cordoba";
    const nextDay = new Date("2026-11-01T12:00:00Z");

    const text = formatObservedAt(observedAt, { now: nextDay, locale: "es" });

    expect(text).toContain("23:00");
    expect(text).toContain("31");
  });
});

describe("formatNumber", () => {
  it("usa el formato numérico en español con un decimal como máximo", () => {
    expect(formatNumber(20.84)).toBe("20,8");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1010.9)).toBe("1010,9");
  });
});
