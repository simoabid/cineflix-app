import type { Stream } from '@/lib/providers';
import { prepareStreamWithExtension } from '@/lib/providers/extension';

export async function prepareStream(stream: Stream): Promise<void> {
  await prepareStreamWithExtension(stream);
}
