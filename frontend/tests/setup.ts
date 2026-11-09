import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta los componentes renderizados entre pruebas (sin globals de Vitest).
afterEach(() => {
  cleanup();
});
