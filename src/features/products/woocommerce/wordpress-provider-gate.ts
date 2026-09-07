import "server-only";

type ProviderLease = { waitMs: number; release: () => void };
type QueueEntry = { operation: string; enqueuedAt: number; resolve: (lease: ProviderLease) => void };
type ProviderGateState = {
  activeRequests: number;
  maxObserved: number;
  maxConcurrency: number;
  queue: QueueEntry[];
};

const GATE_KEY = Symbol.for("ofissio.wordpress-provider-gate");

function configuredLimit() {
  const parsed = Number.parseInt(process.env.WORDPRESS_PROVIDER_MAX_CONCURRENCY ?? "2", 10);
  return Number.isFinite(parsed) ? Math.min(32, Math.max(1, parsed)) : 2;
}

function gateState() {
  const holder = globalThis as typeof globalThis & { [GATE_KEY]?: ProviderGateState };
  const desired = configuredLimit();
  if (!holder[GATE_KEY]) holder[GATE_KEY] = { activeRequests: 0, maxObserved: 0, maxConcurrency: desired, queue: [] };
  const state = holder[GATE_KEY];
  if (state.activeRequests === 0 && state.queue.length === 0) state.maxConcurrency = desired;
  return state;
}

async function acquireWordPressProviderSlot(operation: string): Promise<ProviderLease> {
  const state = gateState();
  const enqueuedAt = Date.now();
  if (state.activeRequests < state.maxConcurrency) return grantSlot(state, operation, enqueuedAt);
  return new Promise((resolve) => state.queue.push({ operation, enqueuedAt, resolve }));
}

function grantSlot(state: ProviderGateState, operation: string, enqueuedAt: number): ProviderLease {
  state.activeRequests += 1;
  state.maxObserved = Math.max(state.maxObserved, state.activeRequests);
  const waitMs = Date.now() - enqueuedAt;
  if (waitMs > 0) console.info("WORDPRESS_PROVIDER_QUEUE", { provider: "wordpress", operation, activeRequests: state.activeRequests, queuedRequests: state.queue.length, maxConcurrency: state.maxConcurrency, waitMs });
  let released = false;
  return {
    waitMs,
    release: () => {
      if (released) return;
      released = true;
      state.activeRequests = Math.max(0, state.activeRequests - 1);
      const next = state.queue.shift();
      if (next) next.resolve(grantSlot(state, next.operation, next.enqueuedAt));
    },
  };
}

export async function withWordPressProviderSlot<T>(operation: string, task: () => Promise<T>): Promise<T> {
  const lease = await acquireWordPressProviderSlot(operation);
  const startedAt = Date.now();
  try {
    return await task();
  } finally {
    const state = gateState();
    lease.release();
    console.info("WORDPRESS_PROVIDER_REQUEST", { provider: "wordpress", operation, activeRequests: state.activeRequests, queuedRequests: state.queue.length, maxConcurrency: state.maxConcurrency, waitMs: lease.waitMs, elapsedMs: Date.now() - startedAt });
  }
}

export function getWordPressProviderGateSnapshot() {
  const state = gateState();
  return { activeRequests: state.activeRequests, queuedRequests: state.queue.length, maxConcurrency: state.maxConcurrency, maxObserved: state.maxObserved };
}

export function resetWordPressProviderGateForTests() {
  const holder = globalThis as typeof globalThis & { [GATE_KEY]?: ProviderGateState };
  if (holder[GATE_KEY]?.activeRequests || holder[GATE_KEY]?.queue.length) throw new Error("Cannot reset an active WordPress provider gate.");
  delete holder[GATE_KEY];
}
