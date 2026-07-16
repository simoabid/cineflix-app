import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural proof that FranchiseCard ships lazy/async decode on all
 * poster/backdrop <img> surfaces (backdrop, collage, hover strip).
 */
describe('FranchiseCard image loading attributes', () => {
  const source = readFileSync(
    resolve(__dirname, '../FranchiseCard.tsx'),
    'utf8'
  );

  it('includes loading=lazy and decoding=async for collage/poster paths', () => {
    // Every <img in this file should set both attributes (shipped source)
    const imgBlocks = source.match(/<img[\s\S]*?\/>/g) ?? [];
    expect(imgBlocks.length).toBeGreaterThanOrEqual(3);

    for (const block of imgBlocks) {
      expect(block).toMatch(/loading=["']lazy["']/);
      expect(block).toMatch(/decoding=["']async["']/);
    }
  });
});
