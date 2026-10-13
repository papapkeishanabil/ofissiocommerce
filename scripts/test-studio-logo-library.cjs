const assert = require('node:assert/strict');
require('tsx/cjs');
const {
  loadCompanyLogoChoices, resolveCompanyLogoChoice,
} = require('../src/features/company-assets/company-logo-picker.client.ts');

const session = {
  company: { id: 'company-a', companyName: 'A' },
  user: { id: 'user-a', email: 'a@example.test', fullName: 'A', role: 'customer_admin' },
};
const logo = {
  id: 'registration-a', fileId: 'file-a', companyId: 'company-a',
  label: 'Logo A', originalFilename: 'a.png', mimeType: 'image/png',
  extension: 'png', sizeBytes: 1000, status: 'used', fileType: 'company_logo',
  previewUrl: 'https://storage.example.test/expired',
};
const freshUrl = 'https://storage.example.test/fresh';
const signal = () => new AbortController().signal;
const dimensions = async () => ({ width: 600, height: 300 });
const json = (body, status = 200) => Response.json(body, { status });

async function main() {
  let reads = 0;
  const choices = await loadCompanyLogoChoices({ session, signal: signal(), fetcher: async (url, options) => {
    reads++;
    assert.equal(url, '/api/company/logos');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.method, undefined);
    return json({ ok: true, logos: [logo,
      { ...logo, id: 'other', companyId: 'company-b' },
      { ...logo, id: 'deleted', status: 'deleted' },
      { ...logo, id: 'rejected', status: 'rejected' },
      { ...logo, id: 'pending', status: 'pending' },
      { ...logo, id: 'document', fileType: 'invoice_document' },
      { ...logo, id: 'pdf', mimeType: 'application/pdf' }, null,
    ] });
  } });
  assert.equal(reads, 1);
  assert.deepEqual(choices, [logo]);
  assert.deepEqual(await loadCompanyLogoChoices({ session, signal: signal(), fetcher: async () => json({ ok: true, logos: [] }) }), []);
  console.log('PASS: company-owned image logos only; deleted/rejected/pending/foreign/non-logo files excluded; empty library supported.');

  const requests = [];
  const selected = await resolveCompanyLogoChoice({ logo, session, signal: signal(),
    fetcher: async (url, options) => {
      requests.push([url, options.method]);
      assert.equal(options.credentials, 'same-origin');
      return json({ ok: true, fileId: logo.fileId, signedUrl: freshUrl });
    },
    readDimensions: async (url) => { assert.equal(url, freshUrl); return dimensions(); },
  });
  assert.deepEqual(requests, [['/api/files/file-a/signed-url?preview=1', undefined]]);
  assert.deepEqual(selected, { fileId: 'file-a', fileName: 'a.png', previewUrl: freshUrl, aspectRatio: 2 });
  // Registration id and persisted file id deliberately differ. No upload occurs.
  console.log('PASS: fresh signed URL, actual file id and image proportions reused; selection makes no upload or write request.');

  for (const response of [json({ ok: false }, 401), json({ ok: false }, 500), json({ ok: false, logos: [] }), json({ ok: true }), new Response('invalid JSON')]) {
    await assert.rejects(loadCompanyLogoChoices({ session, signal: signal(), fetcher: async () => response }));
  }
  await assert.rejects(loadCompanyLogoChoices({ session, signal: signal(), fetcher: async () => { throw new Error('offline'); } }));
  for (const response of [json({ ok: false }, 401), json({ ok: false }, 404), json({ ok: false }), json({ ok: true, fileId: 'foreign', signedUrl: freshUrl }), json({ ok: true, fileId: logo.fileId }), new Response('invalid JSON')]) {
    await assert.rejects(resolveCompanyLogoChoice({ logo, session, signal: signal(), fetcher: async () => response, readDimensions: dimensions }));
  }
  for (const changed of [{ companyId: 'company-b' }, { status: 'deleted' }, { fileType: 'artwork' }]) {
    await assert.rejects(resolveCompanyLogoChoice({ logo: { ...logo, ...changed }, session, signal: signal(), fetcher: async () => { throw new Error('must not fetch'); } }), /akun Anda/);
  }
  for (const size of [{ width: 0, height: 1 }, { width: 1, height: 0 }, { width: NaN, height: 1 }, { width: Infinity, height: 1 }]) {
    await assert.rejects(resolveCompanyLogoChoice({ logo, session, signal: signal(), fetcher: async () => json({ ok: true, fileId: logo.fileId, signedUrl: freshUrl }), readDimensions: async () => size }), /Dimensi/);
  }
  console.log('PASS: HTTP/JSON/network errors, wrong-file responses and invalid image dimensions cannot create a placement.');

  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(loadCompanyLogoChoices({ session, signal: cancelled.signal, fetcher: async () => { throw new Error('must not fetch'); } }), { name: 'AbortError' });
  const duringRead = new AbortController();
  await assert.rejects(resolveCompanyLogoChoice({ logo, session, signal: duringRead.signal,
    fetcher: async () => json({ ok: true, fileId: logo.fileId, signedUrl: freshUrl }),
    readDimensions: async () => { duringRead.abort(); return dimensions(); },
  }), { name: 'AbortError' });

  const originalImage = global.Image;
  let image;
  global.Image = class {
    naturalWidth = 400; naturalHeight = 200;
    constructor() { image = this; }
    set src(value) { if (value) queueMicrotask(() => this.onload?.()); }
  };
  try {
    const decoded = await resolveCompanyLogoChoice({ logo, session, signal: signal(), fetcher: async () => json({ ok: true, fileId: logo.fileId, signedUrl: freshUrl }) });
    assert.equal(decoded.aspectRatio, 2);
    assert.equal(image.crossOrigin, 'anonymous');
    assert.equal(image.onload, null);
    assert.equal(image.onerror, null);
  } finally {
    global.Image = originalImage;
  }
  console.log('PASS: cancelled list/selection cannot return stale data; image reader checks CORS and releases callbacks.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
