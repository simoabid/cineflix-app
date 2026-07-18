import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  isBrowserDirectSubtitleUrl,
  isCoreProxySubtitleUrl,
  normalizeCaptionDownloadUrl,
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

describe("proxyThroughCore (browser-first Path B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps raw OpenSubtitles for browser download", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/src-api/vrf-x/file/1";
    const out = normalizeCaptionDownloadUrl(raw);
    expect(out).toBe(raw);
    expect(proxySubtitleThroughCore(raw)).toBe(raw);
    expect(isBrowserDirectSubtitleUrl(out)).toBe(true);
    expect(isCoreProxySubtitleUrl(out)).toBe(false);
  });

  it("unwraps OpenSubtitles stuck on /v1/subtitles/file into raw CDN", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/99";
    const wrapped = `https://core.cineflix.dev/v1/subtitles/file?url=${encodeURIComponent(raw)}`;
    expect(normalizeCaptionDownloadUrl(wrapped)).toBe(raw);
    expect(unwrapCoreProxyUpstream(wrapped)).toBe(raw);
  });

  it("leaves non-OS /v1/proxy (vdrk) alone", () => {
    const vdrk =
      "https://core.cineflix.dev/v1/proxy?data=%7B%22url%22%3A%22https%3A%2F%2Fcache.vdrk.site%2Fa.vtt%22%7D";
    expect(proxySubtitleThroughCore(vdrk)).toBe(vdrk);
    expect(isCoreProxySubtitleUrl(vdrk)).toBe(true);
  });

  it("unwraps OpenSubtitles stuck on /v1/proxy into raw CDN", () => {
    const inner =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/99";
    const bad =
      "https://core.cineflix.dev/v1/proxy?data=" +
      encodeURIComponent(JSON.stringify({ url: inner, headers: {} }));
    const fixed = proxySubtitleThroughCore(bad);
    expect(fixed).toBe(inner);
    expect(fixed).not.toContain("/v1/subtitles/file");
  });

  it("builds stable ids without proxy JSON garbage", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/123";
    const id = stableSubtitleId("core-wyzie", "ar", 6, raw);
    expect(id).toMatch(/^core-wyzie-ar-6-[0-9a-f]+$/);
    expect(id).not.toContain("%");
  });
});
