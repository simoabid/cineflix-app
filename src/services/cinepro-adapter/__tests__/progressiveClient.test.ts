import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchCineProProviderStreams } from "../client";

describe("fetchCineProProviderStreams (shipped progressive client)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls single-provider movie endpoint, not bulk /v1/movies/:id", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        return new Response(
          JSON.stringify({
            sources: [
              {
                url: "https://example.com/stream.m3u8",
                type: "hls",
                quality: "1080",
                provider: { id: "vidup", name: "VidUP" },
              },
            ],
            subtitles: [],
            diagnostics: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const res = await fetchCineProProviderStreams(
      { tmdbId: "155", type: "movie" },
      "vidup",
      "http://localhost:3005",
    );

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(
      "http://localhost:3005/v1/movies/155/providers/vidup",
    );
    expect(urls[0]).not.toMatch(/\/v1\/movies\/155$/);
    expect(res.sources).toHaveLength(1);
    expect(res.sources[0]!.provider.id).toBe("vidup");
  });

  it("calls single-provider TV endpoint with season/episode", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return new Response(
          JSON.stringify({ sources: [], subtitles: [], diagnostics: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    await fetchCineProProviderStreams(
      { tmdbId: "1399", type: "tv", s: 1, e: 1 },
      "hexa",
      "http://localhost:3005",
    );

    expect(urls[0]).toContain(
      "/v1/tv/1399/seasons/1/episodes/1/providers/hexa",
    );
  });
});
