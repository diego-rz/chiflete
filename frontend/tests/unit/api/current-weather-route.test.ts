// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/current-weather/route";

describe("GET /api/current-weather", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BACKEND_URL", "http://backend.internal:8080");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("pide al backend el clima con las coordenadas y reenvía la respuesta", async () => {
    const weather = '{"measurementSystem":"METRIC","stale":false,"temperature":20.8}';
    fetchMock.mockResolvedValue(new Response(weather, { status: 200, headers: { "content-type": "application/json" } }));

    const response = await GET(
      new Request("http://localhost:3000/api/current-weather?latitude=-31.4135&longitude=-64.18105"),
    );

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://backend.internal:8080/api/v1/current-weather?latitude=-31.4135&longitude=-64.18105",
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(weather);
  });

  it("si el backend es inaccesible devuelve 502 con el código del contrato", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await GET(new Request("http://localhost:3000/api/current-weather?latitude=1&longitude=2"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ code: "PROVIDER_UNAVAILABLE" });
  });
});
