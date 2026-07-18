import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  headersForSubtitleUrl,
  isCoreProxySubtitleUrl,
  proxySubtitleThroughCore,
  stableSubtitleId,
  unwrapCoreProxyUpstream,
} from "../proxyThroughCore";

vi.mock("@/stores/cinepro", () => ({
  useCineProStore: {
    getState: () => ({
      serverUrl: "https://core.cineflix.dev",
      isEnabled: true,
    }),
  },
}));

vi.mock("@/services/cinepro-adapter/client", () => ({
  getCineProBaseUrl: () => "https://core.cineflix.dev",
}));

describe("proxyThroughCore (subtitle select path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects OMSS /v1/proxy URLs", () => {
    expect(
      isCoreProxySubtitleUrl(
        "https://core.cineflix.dev/v1/proxy?data=%7B%22url%22%3A%22https%3A%2F%2Fcdn.example%2Fa.srt%22%7D",
      ),
    ).toBe(true);
    expect(isCoreProxySubtitleUrl("https://cdn.example/a.srt")).toBe(false);
  });

  it("wraps raw CDN URLs with core proxy and leaves already-proxied alone", () => {
    const raw = "https://charlie.example/subs/en.srt";
    const proxied = proxySubtitleThroughCore(raw);
    expect(proxied.startsWith("https://core.cineflix.dev/v1/proxy?data=")).toBe(
      true,
    );
    const data = JSON.parse(
      decodeURIComponent(new URL(proxied).searchParams.get("data")!),
    );
    expect(data.url).toBe(raw);

    expect(proxySubtitleThroughCore(proxied)).toBe(proxied);
  });

  it("uses TemporaryUserAgent for OpenSubtitles downloads", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/src-api/vrf-x/file/1";
    const hdrs = headersForSubtitleUrl(raw);
    expect(hdrs["User-Agent"]).toBe("TemporaryUserAgent");
    const proxied = proxySubtitleThroughCore(raw);
    const data = JSON.parse(
      decodeURIComponent(new URL(proxied).searchParams.get("data")!),
    );
    expect(data.headers["User-Agent"]).toBe("TemporaryUserAgent");
  });

  it("builds stable ids from upstream URL not proxy JSON tail", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/123";
    const proxied = proxySubtitleThroughCore(raw);
    const id = stableSubtitleId("core-wyzie", "ar", 6, proxied);
    expect(id).toMatch(/^core-wyzie-ar-6-[0-9a-f]+$/);
    expect(id).not.toContain("%");
    expect(id).not.toContain("brip");
    expect(unwrapCoreProxyUpstream(proxied)).toBe(raw);
  });
});
