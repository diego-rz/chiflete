import { describe, expect, it } from "vitest";
import messages from "@/i18n/messages/es.json";
import { t } from "@/i18n/t";

describe("t", () => {
  it("devuelve el texto del catálogo en español", () => {
    expect(t("app.title")).toBe(messages["app.title"]);
    expect(t("search.label")).toBe(messages["search.label"]);
  });

  it("solo acepta claves del catálogo (comprobado por tsc en npm test)", () => {
    // @ts-expect-error: clave inexistente en es.json
    const missing = () => t("no.existe");
    expect(missing).toBeTypeOf("function");
  });
});
