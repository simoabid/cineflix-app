import { describe, expect, it } from 'vitest';

import * as PlayerModule from '@/components/player/Player';

describe('P-Stream player barrel', () => {
  it('exposes the original P-Stream player primitives', () => {
    const player = PlayerModule as Record<string, unknown>;

    expect(player.Container).toBeTypeOf('function');
    expect(player.TopControls).toBeTypeOf('function');
    expect(player.BottomControls).toBeTypeOf('function');
    expect(player.ProgressBar).toBeTypeOf('function');
    expect(player.Settings).toBeTypeOf('function');
  });
});
