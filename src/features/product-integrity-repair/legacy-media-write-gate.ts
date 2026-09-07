import "server-only";

type WriteLease = { release: () => void };
type QueueEntry = { operation: string; enqueuedAt: number; resolve: (lease: WriteLease) => void };
type WriteGateState = {
  activeProducts: number;
  maxObserved: number;
  maxConcurrency: number;
  queue: QueueEntry[];
};

const WRITE_GATE_KEY = Symbol.for("ofissio.legacy-media-write-gate");

function configuredLimit() {
  const parsed = Number.parseInt(process.env.LEGACY_MEDIA_WRITE_CONCURRENCY ?? "1", 10);
  // LocalWP media writes are intentionally serialized. Keep the env key so
  // deployments are explicit, but do not permit an accidental value > 1 to
  // defeat the safety invariant of this repair workflow.
  return Number.isFinite(parsed) && parsed === 1 ? parsed : 1;
}

function gateState() {
  const holder = globalThis as typeof globalThis & { [WRITE_GATE_KEY]?: WriteGateState };
  const desired = configuredLimit();
  if (!holder[WRITE_GATE_KEY]) {
    holder[WRITE_GATE_KEY] = {
      activeProducts: 0,
      maxObserved: 0,
      maxConcurrency: desired,
      queue: [],
    };
  }
  const state = holder[WRITE_GATE_KEY];
  if (state.activeProducts === 0 && state.queue.length === 0) state.maxConcurrency = desired;
  return state;
}

async function acquireSlot(operation: string): Promise<WriteLease> {
  const state = gateState();
  const enqueuedAt = Date.now();
  if (state.activeProducts < state.maxConcurrency) return grantSlot(state, operation, enqueuedAt);
  return new Promise((resolve) => state.queue.push({ operation, enqueuedAt, resolve }));
}

function grantSlot(state: WriteGateState, operation: string, enqueuedAt: number): WriteLease {
  state.activeProducts += 1;
  state.maxObserved = Math.max(state.maxObserved, state.activeProducts);
  const waitMs = Date.now() - enqueuedAt;
  if (waitMs > 0) {
    console.info("LEGACY_MEDIA_WRITE_QUEUE", {
      operation,
      activeProducts: state.activeProducts,
      queuedProducts: state.queue.length,
      maxConcurrency: state.maxConcurrency,
      waitMs,
    });
  }
  let released = false;
  return {
    release: () => {
      if (released) return;
      released = true;
      state.activeProducts = Math.max(0, state.activeProducts - 1);
      const next = state.queue.shift();
      if (next) next.resolve(grantSlot(state, next.operation, next.enqueuedAt));
    },
  };
}

export async function withLegacyMediaWriteSlot<T>(operation: string, task: () => Promise<T>): Promise<T> {
  const lease = await acquireSlot(operation);
  try {
    return await task();
  } finally {
    lease.release();
  }
}

export function getLegacyMediaWriteGateSnapshot() {
  const state = gateState();
  return {
    activeProducts: state.activeProducts,
    queuedProducts: state.queue.length,
    maxConcurrency: state.maxConcurrency,
    maxObserved: state.maxObserved,
  };
}

export function resetLegacyMediaWriteGateForTests() {
  const holder = globalThis as typeof globalThis & { [WRITE_GATE_KEY]?: WriteGateState };
  if (holder[WRITE_GATE_KEY]?.activeProducts || holder[WRITE_GATE_KEY]?.queue.length) {
    throw new Error("Cannot reset an active Legacy Media write gate.");
  }
  delete holder[WRITE_GATE_KEY];
}
