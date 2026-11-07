"""Real admin/customer UI with synthetic data. Every API request is intercepted."""
import atexit
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
out = Path(os.environ.get('OFISSIO_COLOR_SELLING_TEST_OUT', str(root / 'artifacts/color-selling-status')))
out.mkdir(parents=True, exist_ok=True)
base = os.environ.get('OFISSIO_COLOR_SELLING_TEST_BASE', 'http://localhost:8031')
route_file = root / 'src/app/product/color-selling-fixture/page.tsx'
template = 'export { default } from "@/../test-fixtures/product-variants/color-selling-page";\n'
remote = os.environ.get('OFISSIO_COLOR_SELLING_TEST_READY') == '1'
if not remote:
    assert not route_file.exists(), 'Refusing to replace an existing route'
    route_file.parent.mkdir(parents=True, exist_ok=True)
    route_file.write_text(template, encoding='utf-8')

def cleanup():
    if remote:
        return
    if route_file.exists() and route_file.read_text(encoding='utf-8') == template:
        route_file.unlink()
        route_file.parent.rmdir()

atexit.register(cleanup)
errors = []
captured = []
server_product = None

def api(route):
    global server_product
    req = route.request
    path = urlparse(req.url).path
    if req.method not in ['GET', 'HEAD']:
        captured.append({'url': path, 'method': req.method, 'body': req.post_data_json})
    if path.endswith('/woocommerce/990901'):
        if req.method == 'PATCH':
            assert req.post_data_json['inactiveColors'] == ['Apricot']
            assert req.post_data_json['colors'] == ['Apricot', 'Pink'], 'keep full parent color attributes'
            # This intentional rejection avoids fabricating a provider save; unit tests
            # separately exercise the real admin service against an in-memory provider.
            route.fulfill(status=409, json={'ok': False, 'message': 'Payload pengujian ditangkap. Tidak ada data asli diubah.'})
        else:
            route.fulfill(status=404, json={'ok': False})
        return
    if '/size-stock' in path:
        route.fulfill(json={'ok': True, 'stock': {'color': 'Pink', 'source': 'woocommerce', 'checkedAt': '2026-11-06T00:00:00Z', 'rows': [{'size': size, 'sku': f'SN-PINK-{size}', 'availableQty': 7} for size in ['S', 'M']]}})
        return
    route.fulfill(json={'ok': True, 'session': None, 'notifications': [], 'promotions': [], 'items': []})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/**', api)
    page.route('https://images.example/**', lambda route: route.fulfill(content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect x="100" y="45" width="200" height="400" rx="35" fill="#eab6c6"/></svg>'))
    for legacy in [False, True]:
        for width in [1440, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000 if width > 500 else 844})
            page.goto(base + '/product/color-selling-fixture' + ('?legacy=1' if legacy else ''), wait_until='networkidle', timeout=120000)
            if not page.locator('input[role=switch]').count():
                page.screenshot(path=str(out / 'missing-switch.png'))
                print(json.dumps({'body': page.locator('body').inner_text()[:4500], 'errors': errors}), flush=True)
            try:
                page.wait_for_function("Array.from(document.querySelectorAll('input[role=switch]')).some(e => Object.keys(e).some(k => k.startsWith('__reactProps') && typeof e[k]?.onChange === 'function'))")
            except Exception:
                page.screenshot(path=str(out / 'hydration-failure.png'))
                print(json.dumps({'body': page.locator('body').inner_text()[:4500], 'errors': errors, 'switches': page.locator('input[role=switch]').evaluate_all('els => els.map(e => ({keys: Object.keys(e), html: e.outerHTML}))')}), flush=True)
                raise
            group = page.get_by_role('group', name='Status penjualan warna', exact=True)
            apricot = page.get_by_role('switch', name='Aktif dijual — Apricot', exact=True)
            pink = page.get_by_role('switch', name='Aktif dijual — Pink', exact=True)
            expect(apricot).to_be_checked()
            apricot.uncheck(force=True)
            expect(apricot).not_to_be_checked()
            expect(pink).to_be_checked()
            expect(group.get_by_text('Nonaktif · seluruh ukuran', exact=True)).to_be_visible()
            pink.uncheck(force=True)
            expect(group.get_by_role('status')).to_contain_text('Semua warna nonaktif')
            pink.check(force=True)
            apricot.check(force=True)
            expect(group.get_by_text('2 dari 2 warna aktif.', exact=False)).to_be_visible()
            # Keyboard access and restoration work without any data deletion.
            apricot.focus()
            page.keyboard.press('Space')
            expect(apricot).not_to_be_checked()
            group.scroll_into_view_if_needed()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'admin overflow {legacy} {width}'
            group.screenshot(path=str(out / f'admin-{"legacy" if legacy else "generic"}-{width}.png'))
            count = len(captured)
            page.get_by_role('button', name='Simpan Perubahan', exact=True).click()
            expect(page.get_by_text('Payload pengujian ditangkap.', exact=False).first).to_be_visible()
            assert len(captured) == count + 1, 'toggle does not delete or upload any variant'
    for width in [1440, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 1000 if width > 500 else 844})
        page.goto(base + '/product/color-selling-fixture?view=detail&inactive=apricot', wait_until='networkidle', timeout=120000)
        expect(page.get_by_role('button', name='Pilih warna Pink', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Pilih warna Apricot', exact=True)).to_have_count(0)
        expect(page.get_by_role('button', name='Pilih warna Pink', exact=True)).to_have_attribute('aria-pressed', 'true')
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'detail overflow {width}'
        page.get_by_role('button', name='Pilih warna Pink', exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(out / f'detail-{width}.png'))
    page.goto(base + '/product/color-selling-fixture?inactive=apricot', wait_until='networkidle', timeout=120000)
    expect(page.get_by_role('switch', name='Aktif dijual — Apricot', exact=True)).not_to_be_checked()
    page.get_by_role('switch', name='Aktif dijual — Apricot', exact=True).check(force=True)
    expect(page.get_by_role('switch', name='Aktif dijual — Apricot', exact=True)).to_be_checked()
    assert not errors, errors
    result = {'status': 'passed', 'checks': ['generic and legacy admin at 1440/390/320', 'toggle and keyboard reactivation', 'all-inactive guidance', 'save payload retains full colors', 'inactive saved state reload', 'customer hides Apricot and defaults to Pink despite old variant link', 'no horizontal overflow'], 'browserErrors': errors, 'realWrites': 0}
    (out / 'browser-verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result), flush=True)
    browser.close()
