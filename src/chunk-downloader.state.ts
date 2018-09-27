
export interface ChunkDownloadState {
  nextChunk: number;
  chunks: ArrayBuffer[];
}

export const chunkDownloadInitialState: ChunkDownloadState = {
  nextChunk: 1,
  chunks: []
};

