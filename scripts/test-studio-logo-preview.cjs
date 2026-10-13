// No credentials or external requests: exercise the real API handler with a scoped repository fixture.
const assert = require('node:assert/strict');
const Module = require('node:module');
require('./register-server-only.cjs');
require('tsx/cjs');
const { createApiError } = require('../src/lib/security/safe-error-response.ts');
let session = { companyId: 'company-a', userId: 'user-a', role: 'customer_admin' };
let provider = 'supabase';
const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const originalFile = { id: 'file-a', companyId: 'company-a', fileType: 'company_logo',
  status: 'used', mimeType: 'image/png', sizeBytes: bytes.length };
let file = { ...originalFile };
let signedCalls = 0;
let remoteCalls = 0;
let upstream = () => new Response(bytes, { headers: { 'Content-Length': String(bytes.length) } });
const upstreamUrl = 'https://storage.example.invalid/private.png?token=fixture';
const originalLoad = Module._load;
const originalFetch = global.fetch;
Module._load = function(request, parent, main) {
  if (request === '@/features/storage/storage.service') return { storageService: {
    getFileById: async input => { assert.equal(input.companyId, session.companyId); assert.equal(input.fileId, 'file-a'); return file; },
    getSignedFileUrl: async input => { signedCalls++; assert.equal(input.companyId, session.companyId);
      return { fileId: input.fileId, signedUrl: upstreamUrl, expiresAt: '2030-01-01' }; },
  } };
  if (request === '@/lib/security/auth-guard') return { requireAuth: () => {
    if (!session) throw createApiError('UNAUTHORIZED', 'Login diperlukan.', 401);
    return session;
  } };
  if (request === '@/features/auth/auth.config') return { getAuthRuntimeConfig: () => ({ provider }) };
  return originalLoad.call(this, request, parent, main);
};
global.fetch = async (url, options) => {
  remoteCalls++;
  assert.equal(url, upstreamUrl);
  assert.equal(options.redirect, 'error');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.headers['Accept-Encoding'], 'identity');
  assert.equal(options.headers.Authorization, undefined);
  return upstream();
};

async function main() {
  const { GET } = require('../src/app/api/files/[id]/signed-url/route.ts');
  const invoke = query => GET(new Request('http://localhost:18000/api/files/file-a/signed-url' + query),
    { params: Promise.resolve({ id: 'file-a' }) });
  let response = await invoke('?preview=1');
  let result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.fileId, 'file-a');
  assert.equal(result.signedUrl, '/api/files/file-a/signed-url?content=1');
  assert(!JSON.stringify(result).includes('token=fixture'));
  assert.equal(remoteCalls, 0);
  response = await invoke('?content=1');
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('vary'), 'Cookie');
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('location'), null);
  assert.equal(remoteCalls, 1);
  console.log('PASS: private logo bytes are returned from the app origin even when upstream has no CORS headers; no redirect/token or public cache.');

  response = await invoke('');
  assert.equal((await response.json()).signedUrl, upstreamUrl, 'Existing document/download API remains compatible');
  provider = 'mock';
  response = await invoke('?preview=1');
  assert.equal((await response.json()).signedUrl, upstreamUrl, 'Mock header-based development keeps its direct URL');
  provider = 'supabase';
  console.log('PASS: normal signed URLs and mock development behavior are preserved.');

  const beforeSigned = signedCalls;
  const beforeRemote = remoteCalls;
  session = null;
  assert.equal((await invoke('?content=1')).status, 401);
  session = { companyId: 'company-a', userId: 'user-a', role: 'no_permission' };
  assert.equal((await invoke('?content=1')).status, 403);
  session.role = 'customer_admin';
  for (const changed of [null, { companyId: 'company-b' }, { fileType: 'invoice_document' },
    { status: 'deleted' }, { status: 'rejected' }, { status: 'pending' },
    { mimeType: 'text/html' }, { sizeBytes: 0 }, { sizeBytes: 10 * 1024 * 1024 + 1 }]) {
    file = changed === null ? null : { ...originalFile, ...changed };
    for (const query of ['?content=1', '?preview=1']) assert.equal((await invoke(query)).status, 404);
  }
  assert.equal(signedCalls, beforeSigned);
  assert.equal(remoteCalls, beforeRemote);
  file = { ...originalFile };
  console.log('PASS: anonymous, missing permission, foreign company, rejected/deleted/pending/non-logo/non-image/oversized records cannot obtain an image or signed URL.');

  for (const make of [
    () => new Response(null, { status: 404 }),
    () => new Response(bytes, { headers: { 'content-length': '99' } }),
    () => new Response(bytes.slice(0, 3)),
    () => new Response(new Uint8Array(bytes.length + 1)),
  ]) {
    upstream = make;
    assert.equal((await invoke('?content=1')).status, 502);
  }
  // In particular, a streamed response without Content-Length is still bounded.
  let cancelled = false;
  upstream = () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(bytes.length + 1)); },
    cancel() { cancelled = true; },
  }));
  assert.equal((await invoke('?content=1')).status, 502);
  assert.equal(cancelled, true);
  console.log('PASS: upstream failures, truncated images, dishonest size and oversized chunked responses fail safely and cancel the download.');

  const { resolveCompanyLogoChoice, requestCompanyLogoPreview } = require('../src/features/company-assets/company-logo-picker.client.ts');
  const browserSession = { company: { id: 'company-a', companyName: 'A' },
    user: { id: 'user-a', role: 'customer_admin', fullName: 'A', email: 'a@example.invalid' } };
  const imageUrl = '/api/files/file-a/signed-url?content=1';
  const fetcher = async (url, options) => {
    assert.equal(url, '/api/files/file-a/signed-url?preview=1');
    assert.equal(options.credentials, 'same-origin');
    return Response.json({ ok: true, fileId: 'file-a', signedUrl: imageUrl });
  };
  const choice = await resolveCompanyLogoChoice({
    logo: { ...originalFile, fileId: 'file-a', originalFilename: 'logo.png' },
    session: browserSession, signal: new AbortController().signal, fetcher,
    readDimensions: async url => { assert.equal(url, imageUrl); return { width: 512, height: 512 }; },
  });
  assert.equal(choice.previewUrl, imageUrl);
  const reopened = await requestCompanyLogoPreview({ fileId: choice.fileId, session: browserSession,
    signal: new AbortController().signal, fetcher });
  assert.equal(reopened, choice.previewUrl);
  console.log('PASS: library selection and saved-logo reopening both resolve the same authenticated app image path, preserving file identity and proportions.');

  // Exercise the actual restore effect/state update with a minimal hook runner.
  // This tests asynchronous data restoration, not WebGL drawing in a browser.
  let state;
  let effect;
  const saved = { productId: 'test-product', model3dId: 'test-model', color: 'Red',
    activeCamera: 'front', snapshots: {}, updatedAt: '2026-10-09', placements: [
      { zone: 'right_chest', logoFileId: 'file-a', logoFileName: 'logo.png',
        logoPreviewUrl: 'https://storage.example.invalid/old', widthCm: 8, heightCm: 8,
        rotation: 0, technique: 'embroidery', surfacePoint: [-0.2, 0.3, 0.2] },
    ] };
  const routeMockLoader = Module._load;
  Module._load = function(request, parent, main) {
    if (request === '@/hooks/use-auth') return { useAuth: () => ({ session: browserSession }) };
    if (request === 'react' && parent?.filename.includes('use-uniform-3d-config')) return {
      useMemo: callback => callback(), useCallback: callback => callback,
      useState: initial => { state = typeof initial === 'function' ? initial() : initial;
        return [state, change => { state = typeof change === 'function' ? change(state) : change; }]; },
      useEffect: callback => { effect = callback; },
    };
    return routeMockLoader.call(this, request, parent, main);
  };
  global.fetch = fetcher;
  const { useUniform3DConfig } = require('../src/hooks/use-uniform-3d-config.ts');
  useUniform3DConfig(saved.productId, saved.color, saved.model3dId, saved);
  const cleanup = effect();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.placements[0].logoPreviewUrl, imageUrl);
  assert.equal(state.placements[0].logoFileId, 'file-a');
  assert.deepEqual(state.placements[0].surfacePoint, saved.placements[0].surfacePoint);
  cleanup();

  let release;
  global.fetch = () => new Promise(resolve => { release = resolve; });
  const instance = useUniform3DConfig(saved.productId, saved.color, saved.model3dId, saved);
  const cancel = effect();
  instance.removePlacement('right_chest');
  cancel();
  release(Response.json({ ok: true, fileId: 'file-a', signedUrl: imageUrl }));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(state.placements, []);
  console.log('PASS: actual restore effect replaces the old cross-origin URL without changing placement/file identity; a cancelled or removed placement cannot be restored by a late response.');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  Module._load = originalLoad;
  global.fetch = originalFetch;
});
