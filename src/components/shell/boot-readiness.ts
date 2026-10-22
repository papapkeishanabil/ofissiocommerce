// A persistent document-level signal, separate from noncritical media/data.
let initialShellReady = false;
const listeners = new Set<() => void>();

export function markInitialShellReady() {
  if (initialShellReady) return;
  initialShellReady = true;
  for (const listener of listeners) listener();
  listeners.clear();
}

export function subscribeToInitialShellReady(listener: () => void) {
  if (initialShellReady) listener();
  else listeners.add(listener);
  return () => { listeners.delete(listener); };
}
