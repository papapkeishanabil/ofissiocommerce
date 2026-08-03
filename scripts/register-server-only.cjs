// Next.js treats `server-only` as a compile-time boundary. Standalone tsx
// smoke tests do not run through the Next compiler, so provide a no-op module
// only inside those server-side test processes.
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyShim(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
