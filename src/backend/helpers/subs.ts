import { list } from "subsrt-ts";

import { proxiedFetch } from "@/backend/helpers/fetch";
import { convertSubtitlesToSrt } from "@/components/player/utils/captions";
import { CaptionListItem } from "@/stores/player/slices/source";
import { SimpleCache } from "@/utils/cache";

import {
  isExtensionActiveCached,
  sendExtensionRequest,
} from "../extension/messaging";

export const subtitleTypeList = list().map((type) => `.${type}`);
const downloadCache = new SimpleCache<string, string>();
downloadCache.setCompare((a, b) => a === b);
const expirySeconds = 24 * 60 * 60;

/**
 * True when URL is already served by CinePro Core /v1/proxy (public, CORS-open).
 * Must NOT go through auth-gated SPA /api/proxy.
 */
function isAlreadyProxiedCaptionUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (
      u.pathname.includes("/v1/subtitles/file") &&
      u.searchParams.has("url")
    ) {
      return true;
    }
    return u.pathname.includes("/v1/proxy") && u.searchParams.has("data");
  } catch {
    return (
      url.includes("/v1/subtitles/file?") || url.includes("/v1/proxy?data=")
    );
  }
}

async function fetchCaptionTextDirect(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/plain, text/vtt, application/x-subrip, */*",
      "Accept-Charset": "utf-8, iso-8859-1, *",
    },
  });
  if (!response.ok) {
    // OpenSubtitles often 403s AWS IPs — core must use residential PROXY_URL
    throw new Error(
      `Subtitle download failed (HTTP ${response.status}). ` +
        (response.status === 403 || response.status === 502
          ? "Subtitle CDN blocked the server — ensure PROXY_URL is set on core for OpenSubtitles."
          : "Try another track."),
    );
  }
  const contentType = response.headers.get("content-type") || "";
  // Reject JSON error bodies from misrouted proxies
  if (contentType.includes("application/json")) {
    const body = await response.text();
    throw new Error(
      `Subtitle download returned JSON instead of a caption file: ${body.slice(0, 120)}`,
    );
  }
  const buffer = await response.arrayBuffer();
  // Prefer utf-8; fall back to latin1 for older OpenSubtitles files
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.includes("\uFFFD") && !text.includes("-->")) {
    text = new TextDecoder("iso-8859-1").decode(buffer);
  } else if (text.includes("\uFFFD")) {
    // Mixed: try windows-1256 for Arabic SRT if many replacement chars
    try {
      text = new TextDecoder("windows-1256").decode(buffer);
    } catch {
      /* keep utf-8 */
    }
  }
  return text;
}

/**
 * Always returns SRT.
 *
 * Core-proxied URLs (path B Wyzie via /v1/proxy) use direct fetch — no
 * auth-gated /api/proxy. Legacy needsProxy still uses extension or /api/proxy.
 */
export async function downloadCaption(
  caption: CaptionListItem,
): Promise<string> {
  const cached = downloadCache.get(caption.url);
  if (cached) return cached;

  let data: string | undefined;

  // Already on public core proxy — never use MERN /api/proxy
  if (isAlreadyProxiedCaptionUrl(caption.url) || !caption.needsProxy) {
    data = await fetchCaptionTextDirect(caption.url);
  } else if (caption.needsProxy) {
    if (isExtensionActiveCached()) {
      const extensionResponse = await sendExtensionRequest({
        url: caption.url,
        method: "GET",
      });
      if (
        !extensionResponse?.success ||
        typeof extensionResponse.response.body !== "string"
      ) {
        throw new Error("failed to get caption data from extension");
      }

      data = extensionResponse.response.body;
    } else {
      data = await proxiedFetch<string>(caption.url, {
        responseType: "text",
        headers: {
          "Accept-Charset": "utf-8",
        },
      });
    }
  }

  if (!data) throw new Error("failed to get caption data");
  if (!data.trim()) throw new Error("Subtitle file was empty");

  // HTML / rewritten-manifest garbage from blocked OpenSubtitles on EC2
  const trimmed = data.trim();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("/v1/proxy?data=")
  ) {
    throw new Error(
      "Subtitle download did not return a caption file (CDN blocked or wrong proxy). Check core PROXY_URL for OpenSubtitles.",
    );
  }

  const output = convertSubtitlesToSrt(data);
  downloadCache.set(caption.url, output, expirySeconds);
  return output;
}

/**
 * Downloads the WebVTT content. No different than a simple
 * get request with a cache.
 */
export async function downloadWebVTT(url: string): Promise<string> {
  const cached = downloadCache.get(url);
  if (cached) return cached;

  const data = await fetch(url).then((v) => v.text());
  return data;
}
