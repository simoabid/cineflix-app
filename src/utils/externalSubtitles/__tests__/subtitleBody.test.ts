import { describe, expect, it } from "vitest";

import {
  isInvalidSubtitleBody,
  isOpenSubtitlesLoginWall,
} from "../subtitleBody";

describe("subtitleBody", () => {
  it("accepts real SRT", () => {
    expect(
      isInvalidSubtitleBody("1\n00:00:05,866 --> 00:00:30,866\nHello\n"),
    ).toBe(false);
  });

  it("rejects login-wall fake SRT", () => {
    const wall = `1
00:00:00,001 --> 04:00:00,000
In order to continue OpenSubtitles.org
subtitles service you need to Log In
`;
    expect(isOpenSubtitlesLoginWall(wall)).toBe(true);
    expect(isInvalidSubtitleBody(wall)).toBe(true);
  });

  it("rejects CF challenge HTML", () => {
    const html =
      "<!DOCTYPE html><html><title>Just a moment...</title><body>challenge</body></html>";
    expect(isInvalidSubtitleBody(html)).toBe(true);
  });
});
