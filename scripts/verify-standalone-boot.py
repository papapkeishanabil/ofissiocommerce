"""Local Chromium simulation, not an Android/WebAPK device test.
Run: python scripts/verify-standalone-boot.py
"""
from pathlib import Path
import json
import os
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / (sys.argv[2] if len(sys.argv) > 2 else os.environ.get("BOOT_ARTIFACT_DIR", "standalone-boot"))
OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("BOOT_BASE_URL", "http://localhost:8000")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 360, "height": 780}, device_scale_factor=3,
                                  record_video_dir=str(OUT / 'video'), record_video_size={"width": 360, "height": 780})
    page = context.new_page()
    errors = []
    console_errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == 'error' else None)
    page.goto(BASE + "/login?next=%2Fdashboard", wait_until="networkidle")
    boot = page.locator('[aria-hidden="true"][inert]').filter(has=page.locator('[class*="emblem"]'))
    assert boot.count() == 1
    assert not boot.is_visible(), "Regular tab must not show boot"
    manifest_url = page.locator('link[rel="manifest"]').get_attribute('href')
    manifest = context.request.get(BASE + manifest_url).json()
    assert manifest['background_color'] == manifest['theme_color'] == '#091629'
    assert manifest['display'] == 'standalone'
    for icon in manifest['icons']:
        response = context.request.get(BASE + icon['src'])
        assert response.ok and response.headers['content-type'].startswith('image/png')

    # CDP cannot emulate display-mode on every Chromium version. In that case,
    # replace only the media condition in served CSS, retaining all real rules.
    cdp = context.new_cdp_session(page)
    cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'display-mode', 'value': 'standalone'}]})
    native_emulation = page.evaluate('matchMedia("(display-mode: standalone)").matches')
    if not native_emulation:
        css_cache = {}
        for href in page.locator('link[rel="stylesheet"]').evaluate_all('(links) => links.map(link => link.href)'):
            css_cache[href] = context.request.get(href).text()
        def standalone_css(route):
            if route.request.url not in css_cache:
                route.continue_()
                return
            css = css_cache[route.request.url].replace('(display-mode:standalone)', '(min-width:0px)').replace('(display-mode: standalone)', '(min-width: 0px)')
            route.fulfill(status=200, content_type='text/css', body=css)
        context.route('**/*.css*', standalone_css)

    # Delay hydration to inspect the SSR overlay and its bounded animation.
    delayed = [False]
    def delay_js(route):
        if not delayed[0]:
            delayed[0] = True
            page.wait_for_timeout(1600)
        route.continue_()
    context.route('**/_next/static/**/*.js*', delay_js)
    page.goto(BASE + '/login?next=%2Fdashboard', wait_until='commit')
    boot.wait_for(state='visible')
    assert boot.locator('[class*="loading"], [class*="orbit"], [class*="wordmark"]').count() == 0, 'Only the animated symbol should be shown'
    assert page.locator('[class*="symbol"]').evaluate('(el) => getComputedStyle(el, "::after").animationName') != 'none'
    page.screenshot(path=str(OUT / 'mobile-boot.png'))
    boot.wait_for(state='hidden', timeout=15000)
    page.wait_for_load_state('networkidle')
    assert 'next=%2Fdashboard' in page.url
    assert boot.get_attribute('hidden') is not None, 'Hydrated shell must close overlay'
    page.screenshot(path=str(OUT / 'mobile-ready.png'))
    context.unroute('**/_next/static/**/*.js*', delay_js)

    # Actual internal Next Link navigation must preserve the root boot instance.
    page.evaluate('window.__bootNode = document.querySelector("[inert][aria-hidden]")')
    links = page.locator('a[href="/forgot-password"]')
    assert links.count(), 'Internal navigation must actually be exercised'
    links.first.click()
    page.wait_for_url('**/forgot-password')
    page.wait_for_load_state('networkidle')
    assert page.evaluate('window.__bootNode === document.querySelector("[inert][aria-hidden]")')
    assert not boot.is_visible()
    page.evaluate('window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted:true})); document.dispatchEvent(new Event("visibilitychange"))')
    assert not boot.is_visible()

    # Capture normal console output separately from intentional aborted scripts.
    normal_console_errors = list(console_errors)
    assert not errors, errors
    assert not [error for error in normal_console_errors if 'hydration' in error.lower() or 'react.dev/errors' in error.lower()], normal_console_errors

    # Prevent hydration entirely: CSS must uncover the recovery/error UI.
    context.route('**/_next/static/**/*.js*', lambda route: route.abort())
    page.emulate_media(reduced_motion='reduce')
    page.goto(BASE + '/login?deep=preserved', wait_until='domcontentloaded')
    boot.wait_for(state='visible')
    assert page.locator('[class*="symbol"]').evaluate('(el) => getComputedStyle(el).animationName') == 'none'
    assert page.locator('[class*="symbol"]').evaluate('(el) => getComputedStyle(el, "::after").display') == 'none'
    page.screenshot(path=str(OUT / 'mobile-reduced-motion.png'))
    boot.wait_for(state='hidden', timeout=7500)
    assert page.url.endswith('/login?deep=preserved')
    page.screenshot(path=str(OUT / 'hydration-failed-recovered.png'))

    # Small viewport and desktop inspect the same SSR surface without hydration.
    for width, height, name in [(280, 568, 'small'), (1280, 800, 'desktop')]:
        page.set_viewport_size({'width': width, 'height': height})
        page.goto(BASE + '/login', wait_until='domcontentloaded')
        boot.wait_for(state='visible')
        box = boot.bounding_box()
        assert box and box['x'] == 0 and box['width'] == width
        symbol_box = page.locator('[class*="symbol"]').bounding_box()
        assert symbol_box and symbol_box['x'] >= 0 and symbol_box['x'] + symbol_box['width'] <= width
        page.screenshot(path=str(OUT / f'{name}-boot.png'))

    # Reference document is visual evidence, never an application route.
    reference_file = ROOT / 'Ofissio-Boot-Preview.html'
    if reference_file.is_file():
        reference = context.new_page()
        reference.goto(reference_file.as_uri())
        reference.get_by_role('button').click()
        reference.wait_for_timeout(500)
        reference.screenshot(path=str(OUT / 'reference.png'))
    result = {'base_url': BASE, 'manifest': manifest_url, 'standalone_simulation': 'CDP' if native_emulation else 'CSS media-condition substitution', 'checks': ['regular browser excluded', 'manifest and icon responses', 'SSR overlay', 'shell-ready dismissal', 'deep-link preserved', 'internal navigation no replay', 'resume no replay', 'reduced motion', 'hydration-failure safety timeout', '280px and desktop fit'], 'page_errors': errors, 'normal_console_errors': normal_console_errors}
    (OUT / 'results.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))
    video = page.video
    context.close()
    video.save_as(str(OUT / 'boot-verification.webm'))
    browser.close()
