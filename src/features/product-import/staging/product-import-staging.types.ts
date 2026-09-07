import type { Readable } from "node:stream";

export type ProductImportUploadState = "READY" | "UPLOADING" | "UPLOAD_COMPLETE" | "CANCELLED" | "FAILED";

export interface ProductImportUploadSession {
  batchId: string;
  uploadId: string;
  originalFilename: string;
  totalSize: number;
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number[];
  state: ProductImportUploadState;
  createdAt: string;
  updatedAt: string;
}

export class ProductImportChunkWriteError extends Error {
  readonly code: string;
  readonly expectedBytes: number;
  readonly receivedBytes: number;

  constructor(input: {
    code: string;
    message: string;
    expectedBytes: number;
    receivedBytes: number;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "ProductImportChunkWriteError";
    this.code = input.code;
    this.expectedBytes = input.expectedBytes;
    this.receivedBytes = input.receivedBytes;
  }
}

export interface ProductImportStagingProvider {
  initialize(input: { batchId: string; originalFilename: string; totalSize: number; totalChunks: number; chunkSize: number }): Promise<ProductImportUploadSession>;
  writeChunk(input: { batchId: string; uploadId: string; chunkIndex: number; body: ReadableStream<Uint8Array>; contentLength: number | null }): Promise<{ state: "UPLOADED" | "ALREADY_UPLOADED"; sizeBytes: number }>;
  getUploadStatus(input: { batchId: string; uploadId: string }): Promise<ProductImportUploadSession>;
  finalize(input: { batchId: string; uploadId: string }): Promise<{ filePath: string; sizeBytes: number; sha256: string }>;
  inspectFinalizedFile(input: { batchId: string }): Promise<{ filePath: string; sizeBytes: number; sha256: string } | null>;
  withFinalizedFile<T>(input: { batchId: string; callback: (file: { filePath: string; sizeBytes: number; sha256: string }) => Promise<T> }): Promise<T>;
  deleteBatch(batchId: string): Promise<void>;
}
