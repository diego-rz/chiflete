// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cities/route";

describe("GET /api/cities", () => {
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

  it("pide al backend la página de 5 con el texto y el offset", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"items":[],"hasMore":false}', { status: 200, headers: { "content-type": "application/json" } }),
    );

    const response = await GET(new Request("http://localhost:3000/api/cities?query=c%C3%B3rdoba&offset=5"));

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://backend.internal:8080/api/v1/cities?query=c%C3%B3rdoba&offset=5&limit=5",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], hasMore: false });
  });

  it("usa offset 0 por defecto", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await GET(new Request("http://localhost:3000/api/cities?query=cordoba"));

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://backend.internal:8080/api/v1/cities?query=cordoba&offset=0&limit=5",
    );
  });

  it("reenvía los errores del backend sin exponer su URL", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"code":"INVALID_REQUEST"}', {
        status: 400,
        headers: { "content-type": "application/json", location: "http://backend.internal:8080/x" },
      }),
    );

    const response = await GET(new Request("http://localhost:3000/api/cities?query=co"));

    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
    const body = await response.text();
    expect(body).toBe('{"code":"INVALID_REQUEST"}');
    expect(body).not.toContain("backend.internal");
  });
});
