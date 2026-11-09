// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callBackend } from "@/lib/backend-client";

describe("callBackend", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const logs: string[] = [];

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation((line: string) => {
      logs.push(line);
    });
    fetchMock.mockReset();
    logs.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("lee BACKEND_URL en cada llamada", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));

    vi.stubEnv("BACKEND_URL", "http://uno:8080");
    await callBackend("SEARCH", "/api/v1/cities?query=cordoba");
    vi.stubEnv("BACKEND_URL", "http://dos:8080");
    await callBackend("SEARCH", "/api/v1/cities?query=cordoba");

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "http://uno:8080/api/v1/cities?query=cordoba",
      "http://dos:8080/api/v1/cities?query=cordoba",
    ]);
  });

  it("aborta a los 5000 ms con AbortSignal.timeout", async () => {
    vi.stubEnv("BACKEND_URL", "http://backend:8080");
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));

    await callBackend("CURRENT_WEATHER", "/api/v1/current-weather?latitude=1&longitude=2");

    expect(timeoutSpy).toHaveBeenCalledWith(5000);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.signal).toBe(timeoutSpy.mock.results[0]?.value);
  });

  it("reenvía el estado y el cuerpo del backend", async () => {
    vi.stubEnv("BACKEND_URL", "http://backend:8080");
    fetchMock.mockImplementation(
      async () =>
        new Response('{"code":"PROVIDER_UNAVAILABLE"}', {
          status: 502,
          headers: { "content-type": "application/json" },
        }),
    );

    const response = await callBackend("SEARCH", "/api/v1/cities?query=cordoba");

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ code: "PROVIDER_UNAVAILABLE" });
  });

  it("registra una línea JSON sin la query string ni IPs", async () => {
    vi.stubEnv("BACKEND_URL", "http://203.0.113.7:8080");
    fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));

    await callBackend("SEARCH", "/api/v1/cities?query=cordoba&offset=0&limit=5");

    expect(logs).toHaveLength(1);
    const entry = JSON.parse(logs[0] ?? "{}") as Record<string, unknown>;
    expect(entry).toMatchObject({ operation: "SEARCH", outcome: "SUCCESS", status: 200 });
    expect(entry.durationMs).toBeTypeOf("number");
    expect(logs[0]).not.toContain("cordoba");
    expect(logs[0]).not.toContain("query");
    expect(logs[0]).not.toContain("203.0.113.7");
  });

  it("registra el error y lo propaga si el backend no responde", async () => {
    vi.stubEnv("BACKEND_URL", "http://backend:8080");
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));

    await expect(callBackend("SEARCH", "/api/v1/cities?query=cordoba")).rejects.toThrow();

    const entry = JSON.parse(logs[0] ?? "{}") as Record<string, unknown>;
    expect(entry).toMatchObject({ operation: "SEARCH", outcome: "TIMEOUT" });
  });
});
