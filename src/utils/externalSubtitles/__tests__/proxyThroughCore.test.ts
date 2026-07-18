import { describe, expect, it, vi, beforeEach } from "vitest";

import {
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

  it("routes OpenSubtitles to /v1/subtitles/file not /v1/proxy", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/src-api/vrf-x/file/1";
    const proxied = proxySubtitleThroughCore(raw);
    expect(proxied).toBe(
      `https://core.cineflix.dev/v1/subtitles/file?url=${encodeURIComponent(raw)}`,
    );
    expect(isCoreProxySubtitleUrl(proxied)).toBe(true);
    expect(unwrapCoreProxyUpstream(proxied)).toBe(raw);
  });

  it("leaves non-OS /v1/proxy (vdrk) alone", () => {
    const vdrk =
      "https://core.cineflix.dev/v1/proxy?data=%7B%22url%22%3A%22https%3A%2F%2Fcache.vdrk.site%2Fa.vtt%22%7D";
    expect(proxySubtitleThroughCore(vdrk)).toBe(vdrk);
  });

  it("unwraps OpenSubtitles stuck on /v1/proxy into /v1/subtitles/file", () => {
    const inner =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/99";
    const bad =
      "https://core.cineflix.dev/v1/proxy?data=" +
      encodeURIComponent(JSON.stringify({ url: inner, headers: {} }));
    const fixed = proxySubtitleThroughCore(bad);
    expect(fixed).toContain("/v1/subtitles/file?url=");
    expect(unwrapCoreProxyUpstream(fixed)).toBe(inner);
  });

  it("builds stable ids without proxy JSON garbage", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/123";
    const proxied = proxySubtitleThroughCore(raw);
    const id = stableSubtitleId("core-wyzie", "ar", 6, proxied);
    expect(id).toMatch(/^core-wyzie-ar-6-[0-9a-f]+$/);
    expect(id).not.toContain("%");
  });
});
