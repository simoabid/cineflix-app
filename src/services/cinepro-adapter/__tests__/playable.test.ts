import { describe, expect, it } from "vitest";

import {
  cineproProviderIdFromSourceId,
  isFailedCineProProvider,
  isPlayableCineProSource,
} from "../playable";
import { mapCineProResultToStreamsWithMeta } from "../mapper";
import type { CineProSource } from "../types";

describe("isPlayableCineProSource", () => {
  it("rejects embed type and embed-like URLs", () => {
    expect(
      isPlayableCineProSource({
        type: "embed",
        url: "https://ythd.org/embed/687163",
      }),
    ).toBe(false);
    expect(
      isPlayableCineProSource({
        type: "hls",
        url: "https://ythd.org/embed/687163",
      }),
    ).toBe(false);
  });

  it("accepts real hls/mp4 urls", () => {
    expect(
      isPlayableCineProSource({
        type: "hls",
        url: "https://cdn.example.com/master.m3u8",
      }),
    ).toBe(true);
    expect(
      isPlayableCineProSource({
        type: "mp4",
        url: "https://cdn.example.com/video.mp4",
      }),
    ).toBe(true);
  });
});

describe("mapCineProResultToStreamsWithMeta playable filter", () => {
  it("returns empty when only embed sources exist (vidup fallback case)", () => {
    const sources: CineProSource[] = [
      {
        url: "http://localhost:3005/v1/proxy?data=ythd-embed",
        type: "embed",
        quality: "Auto",
        provider: { id: "vidup", name: "VidUP (Fallback)" },
      },
    ];
    expect(mapCineProResultToStreamsWithMeta(sources, [])).toEqual([]);
  });

  it("keeps hls and drops embed from the same provider payload", () => {
    const sources: CineProSource[] = [
      {
        url: "https://cdn.example.com/a.m3u8",
        type: "hls",
        quality: "1080",
        provider: { id: "hexa", name: "Hexa" },
      },
      {
        url: "https://ythd.org/embed/1",
        type: "embed",
        quality: "Auto",
        provider: { id: "vidup", name: "VidUP (Fallback)" },
      },
    ];
    const mapped = mapCineProResultToStreamsWithMeta(sources, []);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]!.providerId).toBe("hexa");
    expect(mapped[0]!.stream.type).toBe("hls");
  });
});

describe("failure id helpers", () => {
  it("normalizes cinepro source ids", () => {
    expect(cineproProviderIdFromSourceId("cinepro-vidup")).toBe("vidup");
    expect(cineproProviderIdFromSourceId("cinepro-vidup-hls-1")).toBe("vidup");
    expect(cineproProviderIdFromSourceId("dopebox")).toBeNull();
  });

  it("matches failed providers across id shapes", () => {
    expect(isFailedCineProProvider("vidup", ["cinepro-vidup"])).toBe(true);
    expect(isFailedCineProProvider("vidup", ["cinepro-vidup-hls-1"])).toBe(
      true,
    );
    expect(isFailedCineProProvider("hexa", ["cinepro-vidup"])).toBe(false);
  });
});
