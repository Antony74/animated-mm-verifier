import { ChunkDownloadState } from './chunk-downloader.state';

export interface State {
  machine: any;
  chunkDownload: ChunkDownloadState;
}

