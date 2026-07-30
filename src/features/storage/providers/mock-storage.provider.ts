import "server-only";

import type { StorageObjectProvider, UploadObjectInput } from "../storage.types";

interface MockObject {
  bucket: string;
  key: string;
  mimeType: string;
  data: Uint8Array;
  metadata: Record<string, unknown>;
  createdAt: string;
}

type MockStorageGlobal = typeof globalThis & {
  __ofissioMockStorageObjects?: Map<string, MockObject>;
};

const mockGlobal = globalThis as MockStorageGlobal;
const objects =
  mockGlobal.__ofissioMockStorageObjects ??
  (mockGlobal.__ofissioMockStorageObjects = new Map<string, MockObject>());

function objectId(bucket: string, key: string) {
  return `${bucket}/${key}`;
}

export const mockStorageProvider: StorageObjectProvider = {
  name: "mock",

  async uploadObject(input: UploadObjectInput) {
    objects.set(objectId(input.bucket, input.key), {
      bucket: input.bucket,
      key: input.key,
      mimeType: input.mimeType,
      data: input.data,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    });
    return { publicUrl: null };
  },

  async getSignedUrl(input) {
    const object = objects.get(objectId(input.bucket, input.key));
    if (!object) throw new Error("Object storage mock tidak menemukan file.");
    const expiresAt = new Date(
      Date.now() + input.expiresInSeconds * 1000,
    ).toISOString();
    const signedUrl = `data:${object.mimeType};base64,${Buffer.from(
      object.data,
    ).toString("base64")}`;
    return { signedUrl, expiresAt };
  },

  async deleteObject(input) {
    objects.delete(objectId(input.bucket, input.key));
  },

  async fileExists(input) {
    return objects.has(objectId(input.bucket, input.key));
  },

  async getFileMetadata(input) {
    const object = objects.get(objectId(input.bucket, input.key));
    return {
      exists: Boolean(object),
      sizeBytes: object?.data.byteLength ?? null,
      contentType: object?.mimeType ?? null,
    };
  },
};
