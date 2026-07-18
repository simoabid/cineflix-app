import { describe, expect, it } from "vitest";

import {
  canBrowserFetchCaption,
  captionNeedsProxy,
  isCorePublicCaptionUrl,
  normalizeCaptionDownloadUrl,
  stableSubtitleId,
  unwrapCaptionUpstream,
} from "../captionUrls";

describe("captionUrls", () => {
  it("keeps raw OpenSubtitles for browser download", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/src-api/vrf-x/file/1";
    expect(normalizeCaptionDownloadUrl(raw)).toBe(raw);
    expect(canBrowserFetchCaption(raw)).toBe(true);
    expect(captionNeedsProxy(raw)).toBe(false);
  });

  it("unwraps legacy /v1/subtitles/file into raw CDN", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/99";
    const wrapped = `https://core.cineflix.dev/v1/subtitles/file?url=${encodeURIComponent(raw)}`;
    expect(normalizeCaptionDownloadUrl(wrapped)).toBe(raw);
    expect(unwrapCaptionUpstream(wrapped)).toBe(raw);
  });

  it("leaves non-OS /v1/proxy alone", () => {
    const vdrk =
      "https://core.cineflix.dev/v1/proxy?data=%7B%22url%22%3A%22https%3A%2F%2Fcache.vdrk.site%2Fa.vtt%22%7D";
    expect(normalizeCaptionDownloadUrl(vdrk)).toBe(vdrk);
    expect(isCorePublicCaptionUrl(vdrk)).toBe(true);
    expect(captionNeedsProxy(vdrk)).toBe(false);
  });

  it("unwraps OpenSubtitles stuck on /v1/proxy", () => {
    const inner =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/99";
    const bad =
      "https://core.cineflix.dev/v1/proxy?data=" +
      encodeURIComponent(JSON.stringify({ url: inner, headers: {} }));
    expect(normalizeCaptionDownloadUrl(bad)).toBe(inner);
  });

  it("builds stable ids from upstream", () => {
    const raw =
      "https://dl.opensubtitles.org/en/download/subencoding-utf8/file/123";
    const id = stableSubtitleId("core-wyzie", "ar", 6, raw);
    expect(id).toMatch(/^core-wyzie-ar-6-[0-9a-f]+$/);
  });
});
