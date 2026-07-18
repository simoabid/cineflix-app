/**
 * Validate subtitle download bodies before converting to SRT.
 */

export function isBotChallengeHtml(text: string): boolean {
  const t = text.slice(0, 8000).toLowerCase();
  return (
    t.includes("anubis") ||
    t.includes("just a moment") ||
    t.includes("making sure you") ||
    t.includes("cf-challenge") ||
    t.includes("captcha") ||
    t.includes("_cf_chl") ||
    (t.includes("<!doctype html") && t.includes("challenge"))
  );
}

/** OpenSubtitles soft-block (datacenter IP / unauthenticated). */
export function isOpenSubtitlesLoginWall(text: string): boolean {
  const t = text.slice(0, 4000);
  return (
    /need to Log In/i.test(t) ||
    /continue OpenSubtitles\.org/i.test(t) ||
    /you need to log in/i.test(t) ||
    (/OpenSubtitles\.org/i.test(t) && /log\s*in/i.test(t) && t.length < 800)
  );
}

export function isInvalidSubtitleBody(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (isBotChallengeHtml(trimmed)) return true;
  if (isOpenSubtitlesLoginWall(trimmed)) return true;
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    return true;
  }
  // JSON error object (not microDVD {frame}{frame})
  if (trimmed.startsWith("{") && !/^\{\d+\}/.test(trimmed)) {
    try {
      JSON.parse(trimmed.slice(0, 500));
      return true;
    } catch {
      /* not JSON */
    }
  }
  if (trimmed.startsWith("/v1/proxy?data=")) return true;
  return false;
}
