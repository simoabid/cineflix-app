import { Embed, Sourcerer } from './base';
import { AnimekaiScraper } from './embeds/animekai';
import {
  vidjoyStream1Scraper,
  vidjoyStream2Scraper,
  vidjoyStream3Scraper,
  vidjoyStream4Scraper,
  vidjoyStream5Scraper,
} from './archive/embeds/vidjoy';
import { animekaiScraper } from './sources/animekai';
import { remotestreamScraper } from './archive/sources/remotestream';
import { TASFScraper } from './archive/sources/theyallsayflix';
import { vidjoyScraper as archivedVidjoyScraper } from './archive/sources/vidjoy';
import { FedAPIScraper } from './sources/fedapi';
import { FedAPIDBScraper } from './sources/fedapidb';
import { doodScraper } from './embeds/dood';
import { filemoonScraper } from './embeds/filemoon';
import { mixdropScraper } from './embeds/mixdrop';
import { serverMirrorEmbed } from './embeds/server-mirrors';
import { turbovidScraper } from './embeds/turbovid';
import { upcloudScraper } from './embeds/upcloud';
import { autoembedScraper } from './sources/autoembed';
import { dopeboxEmbeds, dopeboxScraper } from './sources/dopebox/index';
import { ee3Scraper } from './sources/ee3';
import { fsharetvScraper } from './sources/fsharetv';
import { fsOnlineEmbeds, fsOnlineScraper } from './sources/fsonline/index';
import { insertunitScraper } from './sources/insertunit';
import { mp4hydraScraper } from './sources/mp4hydra';
import { pirxcyScraper } from './sources/pirxcy';
import { tugaflixScraper } from './sources/tugaflix';
import { vidsrcvipScraper } from './sources/vidsrcvip';
import { zoechipScraper } from './sources/zoechip';

import { AnimetsuEmbeds } from './embeds/animetsu';
import {
  autoembedBengaliScraper,
  autoembedEnglishScraper,
  autoembedHindiScraper,
  autoembedTamilScraper,
  autoembedTeluguScraper,
} from './embeds/autoembed';
import { cinemaosEmbeds } from './embeds/cinemaos';
import { closeLoadScraper } from './embeds/closeload';
import { droploadScraper } from './embeds/dropload';
import { filelionsScraper } from './embeds/filelions';
import { mp4hydraServer1Scraper, mp4hydraServer2Scraper } from './embeds/mp4hydra';
import { myanimedubScraper } from './embeds/myanimedub';
import { myanimesubScraper } from './embeds/myanimesub';
import { ridooScraper } from './embeds/ridoo';
import { streamtapeLatinoScraper, streamtapeScraper } from './embeds/streamtape';
import { streamvidScraper } from './embeds/streamvid';
import {
  streamwishEnglishScraper,
  streamwishJapaneseScraper,
  streamwishLatinoScraper,
  streamwishSpanishScraper,
} from './embeds/streamwish';
import { supervideoScraper } from './embeds/supervideo';
import { vidCloudScraper } from './embeds/vidcloud';
import { vidhideEnglishScraper, vidhideLatinoScraper, vidhideSpanishScraper } from './embeds/vidhide';
import { vidifyEmbeds } from './embeds/vidify';
import { VidnestEmbeds } from './embeds/vidnest';
import {
  VidsrcsuServer10Scraper,
  VidsrcsuServer11Scraper,
  VidsrcsuServer12Scraper,
  VidsrcsuServer1Scraper,
  VidsrcsuServer20Scraper,
  VidsrcsuServer2Scraper,
  VidsrcsuServer3Scraper,
  VidsrcsuServer4Scraper,
  VidsrcsuServer5Scraper,
  VidsrcsuServer6Scraper,
  VidsrcsuServer7Scraper,
  VidsrcsuServer8Scraper,
  VidsrcsuServer9Scraper,
} from './embeds/vidsrcsu';
import { viperScraper } from './embeds/viper';
import { voeScraper } from './embeds/voe';
import { warezcdnembedHlsScraper } from './embeds/warezcdn/hls';
import { warezcdnembedMp4Scraper } from './embeds/warezcdn/mp4';
import { warezPlayerScraper } from './embeds/warezcdn/warezplayer';
import { zunimeEmbeds } from './embeds/zunime';
import { EightStreamScraper } from './sources/8stream';
import { animeflvScraper } from './sources/animeflv';
import { animetsuScraper } from './sources/animetsu';
import { cinehdplusScraper } from './sources/cinehdplus-es';
import { coitusScraper } from './sources/coitus';
import { cuevana3Scraper } from './sources/cuevana3';
import { debridScraper } from './sources/debrid';
import { embedsuScraper } from './sources/embedsu';
import { fullhdfilmizleScraper } from './sources/fullhdfilmizle';
import { hdRezkaScraper } from './sources/hdrezka';
import { lookmovieScraper } from './sources/lookmovie';
import { movies4fScraper } from './sources/movies4f';
import { myanimeScraper } from './sources/myanime';
import { nunflixScraper } from './sources/nunflix';
import { pelisplushdScraper } from './sources/pelisplushd';
import { primewireScraper } from './sources/primewire';
import { rgshowsScraper } from './sources/rgshows';
import { ridooMoviesScraper } from './sources/ridomovies';
import { slidemoviesScraper } from './sources/slidemovies';
import { soaperTvScraper } from './sources/soapertv';
import { streamboxScraper } from './sources/streambox';
import { turbovidSourceScraper } from './sources/turbovid';
import { vidapiClickScraper } from './sources/vidapiclick';
import { vidifyScraper } from './sources/vidify';
import { vidlinkScraper } from './sources/vidlink';
import { vidnestScraper } from './sources/vidnest';
import { vidrockScraper } from './sources/vidrock';
import { warezcdnScraper } from './sources/warezcdn';
import { watchanimeworldScraper } from './sources/watchanimeworld';
import { wecimaScraper } from './sources/wecima';
import { zunimeScraper } from './sources/zunime';

export function gatherAllSources(): Array<Sourcerer> {
  // all sources are gathered here
  return [
    fsOnlineScraper,
    dopeboxScraper,
    TASFScraper,
    cuevana3Scraper,
    ridooMoviesScraper,
    hdRezkaScraper,
    warezcdnScraper,
    insertunitScraper,
    soaperTvScraper,
    autoembedScraper,
    myanimeScraper,
    tugaflixScraper,
    ee3Scraper,
    fsharetvScraper,
    zoechipScraper,
    mp4hydraScraper,
    embedsuScraper,
    slidemoviesScraper,
    vidapiClickScraper,
    coitusScraper,
    streamboxScraper,
    nunflixScraper,
    EightStreamScraper,
    wecimaScraper,
    animeflvScraper,
    animekaiScraper,
    FedAPIScraper,
    FedAPIDBScraper,
    pirxcyScraper,
    vidsrcvipScraper,
    rgshowsScraper,
    vidifyScraper,
    zunimeScraper,
    vidnestScraper,
    animetsuScraper,
    lookmovieScraper,
    turbovidSourceScraper,
    pelisplushdScraper,
    primewireScraper,
    movies4fScraper,
    debridScraper,
    cinehdplusScraper,
    fullhdfilmizleScraper,
    vidlinkScraper,
    vidrockScraper,
    archivedVidjoyScraper,
    remotestreamScraper,
    watchanimeworldScraper,
  ];
}

export function gatherAllEmbeds(): Array<Embed> {
  // all embeds are gathered here
  return [
    ...fsOnlineEmbeds,
    vidjoyStream1Scraper,
    vidjoyStream2Scraper,
    vidjoyStream3Scraper,
    vidjoyStream4Scraper,
    vidjoyStream5Scraper,
    ...dopeboxEmbeds,
    serverMirrorEmbed,
    upcloudScraper,
    vidCloudScraper,
    mixdropScraper,
    ridooScraper,
    closeLoadScraper,
    doodScraper,
    streamvidScraper,
    streamtapeScraper,
    warezcdnembedHlsScraper,
    warezcdnembedMp4Scraper,
    warezPlayerScraper,
    autoembedEnglishScraper,
    autoembedHindiScraper,
    autoembedBengaliScraper,
    autoembedTamilScraper,
    autoembedTeluguScraper,
    turbovidScraper,
    mp4hydraServer1Scraper,
    mp4hydraServer2Scraper,
    VidsrcsuServer1Scraper,
    VidsrcsuServer2Scraper,
    VidsrcsuServer3Scraper,
    VidsrcsuServer4Scraper,
    VidsrcsuServer5Scraper,
    VidsrcsuServer6Scraper,
    VidsrcsuServer7Scraper,
    VidsrcsuServer8Scraper,
    VidsrcsuServer9Scraper,
    VidsrcsuServer10Scraper,
    VidsrcsuServer11Scraper,
    VidsrcsuServer12Scraper,
    VidsrcsuServer20Scraper,
    viperScraper,
    streamwishJapaneseScraper,
    streamwishLatinoScraper,
    streamwishSpanishScraper,
    streamwishEnglishScraper,
    streamtapeLatinoScraper,
    ...cinemaosEmbeds,
    // ...cinemaosHexaEmbeds,
    // vidsrcNovaEmbed,
    // vidsrcCometEmbed,
    // vidsrcPulsarEmbed,
    ...vidifyEmbeds,
    ...zunimeEmbeds,
    ...AnimetsuEmbeds,
    ...VidnestEmbeds,
    myanimesubScraper,
    myanimedubScraper,
    filemoonScraper,
    vidhideLatinoScraper,
    vidhideSpanishScraper,
    vidhideEnglishScraper,
    filelionsScraper,
    droploadScraper,
    supervideoScraper,
    voeScraper,
    AnimekaiScraper,
  ];
}
