import { list } from "subsrt-ts";

import { proxiedFetch } from "@/backend/helpers/fetch";
import { convertSubtitlesToSrt } from "@/components/player/utils/captions";
import { CaptionListItem } from "@/stores/player/slices/source";
import { SimpleCache } from "@/utils/cache";
import {
  canBrowserFetchCaption,
  normalizeCaptionDownloadUrl,
} from "@/utils/externalSubtitles/captionUrls";
import {
  isInvalidSubtitleBody,
  isOpenSubtitlesLoginWall,
} from "@/utils/externalSubtitles/subtitleBody";

import {
  isExtensionActiveCached,
  sendExtensionRequest,
} from "../extension/messaging";

export const subtitleTypeList = list().map((type) => `.${type}`);
const downloadCache = new SimpleCache<string, string>();
downloadCache.setCompare((a, b) => a === b);
const expirySeconds = 24 * 60 * 60;

async function fetchCaptionTextDirect(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/plain, text/vtt, application/x-subrip, */*",
      "Accept-Charset": "utf-8, iso-8859-1, *",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Could not download subtitles (HTTP ${response.status}). Try another track.`,
    );
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.text();
    throw new Error(
      `Subtitle download returned JSON instead of a caption file: ${body.slice(0, 120)}`,
    );
  }
  const buffer = await response.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.includes("\uFFFD") && !text.includes("-->")) {
    text = new TextDecoder("iso-8859-1").decode(buffer);
  } else if (text.includes("\uFFFD")) {
    try {
      text = new TextDecoder("windows-1256").decode(buffer);
    } catch {
      /* keep utf-8 */
    }
  }
  return text;
}

function assertValidCaptionBody(data: string): void {
  if (!data.trim()) throw new Error("Subtitle file was empty");
  if (isOpenSubtitlesLoginWall(data)) {
    throw new Error(
      "Subtitle CDN blocked this network. Try another track or disable VPN.",
    );
  }
  if (isInvalidSubtitleBody(data)) {
    throw new Error(
      "Subtitle download did not return a caption file. Try another track.",
    );
  }
}

/**
 * Download a caption track and return SRT text.
 * OpenSubtitles / public core proxy: browser fetch (user IP).
 * CORS-restricted hosts: extension or MERN /api/proxy.
 */
export async function downloadCaption(
  caption: CaptionListItem,
): Promise<string> {
  const downloadUrl = normalizeCaptionDownloadUrl(caption.url);
  const cached =
    downloadCache.get(downloadUrl) ?? downloadCache.get(caption.url);
  if (cached) return cached;

  let data: string | undefined;

  if (canBrowserFetchCaption(downloadUrl) || !caption.needsProxy) {
    data = await fetchCaptionTextDirect(downloadUrl);
  } else if (isExtensionActiveCached()) {
    const extensionResponse = await sendExtensionRequest({
      url: downloadUrl,
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
    data = await proxiedFetch<string>(downloadUrl, {
      responseType: "text",
      headers: { "Accept-Charset": "utf-8" },
    });
  }

  if (!data) throw new Error("failed to get caption data");
  assertValidCaptionBody(data);

  const output = convertSubtitlesToSrt(data);
  downloadCache.set(downloadUrl, output, expirySeconds);
  if (caption.url !== downloadUrl) {
    downloadCache.set(caption.url, output, expirySeconds);
  }
  return output;
}

export async function downloadWebVTT(url: string): Promise<string> {
  const cached = downloadCache.get(url);
  if (cached) return cached;
  return fetch(url).then((v) => v.text());
}
