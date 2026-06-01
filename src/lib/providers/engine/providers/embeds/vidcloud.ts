import { makeEmbed } from '../base';

import { upcloudScraper } from './upcloud';

export const vidCloudScraper = makeEmbed({
  id: 'vidcloud',
  name: 'VidCloud',
  rank: 201,
  disabled: false,
  flags: [],
  async scrape(ctx) {
    // Both vidcloud and upcloud have the same embed domain (rabbitstream.net)
    const result = await upcloudScraper.scrape(ctx);
    return {
      stream: result.stream.map((s) => ({
        ...s,
        flags: [],
      })),
    };
  },
});
