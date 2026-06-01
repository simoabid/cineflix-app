/**
 * @module @providers
 *
 * Public API for the CINEFLIX provider system.
 * Re-exports the P-Stream provider engine with CINEFLIX-specific factory and utilities.
 *
 * Usage:
 *   import { getProviders, convertStreamToSource } from '@providers';
 *   const providers = getProviders();
 *   const output = await providers.runAll({ media, events });
 */

// CINEFLIX-specific factory
export { getProviders } from './factory';

// Stream conversion utilities
export {
  convertStreamToSource,
  convertCaptions,
  metaToScrapeMedia,
  type SourceSliceSource,
  type SourceQuality,
  type CaptionListItem,
} from './stream-utils';

export {
  buildExtensionFetchPayload,
  buildPrepareStreamPayload,
  hasExtension,
  isDesktopApp,
  prepareStreamWithExtension,
} from './extension';

// Re-export essential types from the engine
export type {
  RunOutput,
  Stream,
  FileBasedStream,
  HlsBasedStream,
  Qualities,
  ScrapeMedia,
  MovieMedia,
  ShowMedia,
  FullScraperEvents,
  ProviderControls,
  RunnerOptions,
  Fetcher,
  FetcherOptions,
  ProviderMakerOptions,
  Targets,
  Flags,
  MetaOutput,
  SourcererOutput,
  EmbedOutput,
} from './engine';

// Re-export essential constants/functions from the engine
export {
  flags,
  targets,
  makeProviders,
  buildProviders,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
  getBuiltinSources,
  getBuiltinEmbeds,
  getBuiltinExternalSources,
  NotFoundError,
  setM3U8ProxyUrl,
  getM3U8ProxyUrl,
  createM3U8ProxyUrl,
  updateM3U8ProxyUrl,
  labelToLanguageCode,
} from './engine';
