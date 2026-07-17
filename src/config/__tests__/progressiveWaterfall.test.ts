import { describe, expect, it } from "vitest";

import { waterfallFirstSuccess } from "../progressiveWaterfall";
import {
  CINEPRO_PROVIDER_PRIORITY,
  cineproPriorityOrder,
} from "../scrapePriority";

describe("waterfallFirstSuccess (shipped progressive orchestration)", () => {
  it("stops after first success and does not call later providers", async () => {
    const tried: string[] = [];
    const ids = ["vidup", "hexa", "vixsrc"];

    const result = await waterfallFirstSuccess(ids, async (id) => {
      tried.push(id);
      if (id === "hexa") return { stream: `from-${id}` };
      return null;
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("hexa");
    expect(result!.value).toEqual({ stream: "from-hexa" });
    expect(result!.attempts).toBe(2);
    expect(tried).toEqual(["vidup", "hexa"]);
    expect(tried).not.toContain("vixsrc");
  });

  it("returns null and tries every id when all fail", async () => {
    const tried: string[] = [];
    const result = await waterfallFirstSuccess(
      ["a", "b", "c"],
      async (id) => {
        tried.push(id);
        return null;
      },
    );
    expect(result).toBeNull();
    expect(tried).toEqual(["a", "b", "c"]);
  });

  it("uses real priority order so best providers run before worst", async () => {
    const available = ["vixsrc", "vidup", "Peachify", "hexa"];
    const order = cineproPriorityOrder(available, []);
    // Priority list must place S-tier before C-tier without hardcoding full order:
    // first id in ordered list must appear earlier in CINEPRO_PROVIDER_PRIORITY than last.
    const priorityIndex = (id: string) =>
      CINEPRO_PROVIDER_PRIORITY.findIndex((e) => e.id === id);
    expect(priorityIndex(order[0]!)).toBeLessThan(
      priorityIndex(order[order.length - 1]!),
    );
    expect(order[0]).toBe("vidup");
    expect(order[order.length - 1]).toBe("vixsrc");

    const tried: string[] = [];
    await waterfallFirstSuccess(order, async (id) => {
      tried.push(id);
      // succeed on second (should be early S/A tier, not vixsrc)
      if (tried.length === 2) return { ok: true };
      return null;
    });
    expect(tried).toHaveLength(2);
    expect(tried).not.toContain("vixsrc");
    expect(priorityIndex(tried[0]!)).toBeLessThan(priorityIndex("vixsrc"));
  });
});
