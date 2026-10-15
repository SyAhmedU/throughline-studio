"""Isolated browser QA. All created studies are explicitly simulated."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'output/studio-home-upgrade'
OUT.mkdir(parents=True, exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 5317), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:5317/'
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle')
        gate = page.locator('#syed-gate-i')
        if gate.count():
            # Existing site gate, read from the existing QA fixture.
            import re
            fixture = (ROOT.parent / 'output/research-completion/smoke.py').read_text(encoding='utf-8')
            gate.fill(re.search(r"gate.fill\('([^']+)'\)", fixture).group(1))
            page.keyboard.press('Enter')
        expect(page.locator('main h1')).to_have_count(1)
        expect(page.get_by_role('heading', name='A question worth pursuing.')).to_be_visible()
        page.screenshot(path=str(OUT / 'empty-desktop.png'), full_page=True)
        create = page.get_by_role('button', name='New research project', exact=True)
        create.click()
        page.locator('#np-title').fill('SIMULATED QA — workplace study')
        page.locator('#np-title').focus()
        page.keyboard.press('Shift+Tab')
        expect(page.get_by_role('button', name='Create & open')).to_be_focused()
        page.keyboard.press('Tab')
        expect(page.locator('#np-title')).to_be_focused()
        page.locator('#np-field').fill('Organizational Behavior')
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(create).to_be_focused()
        create.click()
        page.locator('#np-title').fill('SIMULATED QA — workplace study')
        page.locator('#np-field').fill('Organizational Behavior')
        page.get_by_role('button', name='Create & open').click()
        expect(page.locator('#stage-title')).to_contain_text('Discover')
        page.get_by_label('Working notes', exact=True).fill('SIMULATED QA navigation evidence')
        page.get_by_role('button', name='Jump to').click()
        expect(page.get_by_role('dialog', name='Find your place')).to_be_visible()
        page.get_by_role('searchbox', name='Search this study').fill('navigation evidence')
        expect(page.locator('.ws-nav-result')).to_have_count(1)
        page.get_by_role('searchbox', name='Search this study').press('Enter')
        expect(page.get_by_role('dialog')).to_have_count(0)
        page.keyboard.press('Control+k')
        page.get_by_role('searchbox', name='Search this study').fill('exclusions')
        page.get_by_role('searchbox', name='Search this study').press('Enter')
        expect(page.locator('#stage-title')).to_contain_text('Collect')
        page.get_by_role('button', name='Review requirements').click()
        expect(page.locator('#stage-checkpoint')).to_be_focused()
        page.locator('.journey-overview summary').click()
        expect(page.locator('.journey-review-list li')).to_have_count(7)
        page.set_viewport_size({'width': 390, 'height': 844})
        for stage in ['discover', 'frame', 'measure', 'collect', 'analyze', 'write', 'publish']:
            page.get_by_label('Current stage', exact=True).select_option(stage)
            expect(page.locator('#stage-title')).to_contain_text(stage.capitalize())
            expect(page.locator('.stage-loading')).to_have_count(0, timeout=30000)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{stage} mobile overflow'
        page.screenshot(path=str(OUT / 'workspace-mobile.png'), full_page=True)
        page.get_by_label('Current stage', exact=True).select_option('frame')
        page.get_by_label('Detailed design plan').fill('SIMULATED QA persistent study design')
        page.reload(wait_until='networkidle')
        expect(page.get_by_label('Detailed design plan')).to_have_value('SIMULATED QA persistent study design')
        expect(page.locator('.status-pill')).to_contain_text('In progress')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.evaluate('scrollTo(0,0)')
        page.screenshot(path=str(OUT / 'workspace-desktop.png'), full_page=True)
        page.goto(URL, wait_until='networkidle')
        expect(page.get_by_role('heading', name='Move your research forward.')).to_be_visible()
        expect(page.locator('.rh-next')).to_contain_text('Record the evidence synthesis / gap')
        expect(page.locator('.rh-review-count')).to_contain_text('0 / 7')
        page.get_by_role('button', name='Duplicate SIMULATED QA — workplace study', exact=True).click()
        expect(page.locator('.rh-card')).to_have_count(2)
        page.get_by_role('searchbox', name='Find a study').fill('(copy)')
        expect(page.locator('.rh-card')).to_have_count(1)
        page.get_by_role('searchbox', name='Find a study').fill('no matching study')
        expect(page.get_by_role('heading', name='No studies match this view.')).to_be_visible()
        page.get_by_role('button', name='Clear filters').click()
        page.get_by_label('Checkpoint status').select_option('reviewed')
        expect(page.locator('.rh-card')).to_have_count(0)
        page.get_by_role('button', name='Clear filters').click()
        expect(page.locator('.rh-card')).to_have_count(2)
        page.get_by_role('button', name='Continue to Discover', exact=True).click()
        expect(page.locator('#stage-title')).to_contain_text('Discover')
        page.goto(URL, wait_until='networkidle')
        page.locator('summary').filter(has_text='Research Kitchen').click()
        expect(page.locator('main h1')).to_have_count(1)
        expect(page.locator('.k-today button').first).to_contain_text('Continue to Discover')
        page.locator('summary').filter(has_text='Research Kitchen').click()
        page.locator('summary').filter(has_text='Prepared working papers').click()
        page.get_by_role('button', name='Continue selected study').click()
        expect(page.locator('#stage-title')).to_contain_text('Discover', timeout=30000)
        page.goto(URL, wait_until='networkidle')
        count = page.locator('.rh-card').count()
        page.locator('summary').filter(has_text='Prepared working papers').click()
        page.get_by_role('button', name='Continue selected study').click()
        expect(page.locator('#stage-title')).to_contain_text('Discover')
        page.goto(URL, wait_until='networkidle')
        expect(page.locator('.rh-card')).to_have_count(count)
        # Restore as a separate copy and prove bad imports are visible.
        saved = page.evaluate("JSON.parse(localStorage.getItem('tls_projects'))")
        upload = page.locator('.rh-import input')
        upload.set_input_files({'name': 'bad.json', 'mimeType': 'application/json', 'buffer': b'{}'})
        expect(page.get_by_role('alert')).to_contain_text('Could not import')
        upload.set_input_files({'name': 'study.json', 'mimeType': 'application/json', 'buffer': json.dumps(saved[0]).encode()})
        expect(page.locator('#stage-title')).to_be_visible()
        page.goto(URL, wait_until='networkidle')
        expect(page.locator('.rh-card')).to_have_count(count + 1)
        for theme in ['dark', 'light']:
            page.evaluate('(theme) => document.documentElement.dataset.theme = theme', theme)
            page.evaluate('scrollTo(0, 0)')
            page.screenshot(path=str(OUT / f'home-{theme}-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow'
            page.screenshot(path=str(OUT / f'home-{theme}-mobile.png'), full_page=True)
            page.locator('summary').filter(has_text='Research Kitchen').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Kitchen mobile overflow'
            page.screenshot(path=str(OUT / f'kitchen-{theme}-mobile.png'), full_page=True)
            page.locator('summary').filter(has_text='Research Kitchen').click()
            page.set_viewport_size({'width': 1440, 'height': 1000})
        page.reload(wait_until='networkidle')
        expect(page.locator('.rh-card')).to_have_count(count + 1)
        assert not errors, errors
        # Deliberately fail a lazy stage download: the project backup must survive.
        recovery = browser.new_context(storage_state=context.storage_state(), service_workers='block')
        broken = recovery.new_page()
        broken.route('**/WriteBody-*.js', lambda route: route.abort())
        simulated = next(p for p in saved if p['title'].startswith('SIMULATED'))
        broken.goto(URL + '#/p/' + simulated['id'] + '/write', wait_until='networkidle')
        expect(broken.get_by_role('heading', name='This stage could not open.')).to_be_visible()
        with broken.expect_download() as download:
            broken.get_by_role('button', name='Export', exact=True).click()
        exported = json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
        assert exported['id'] == simulated['id'], 'Stage failure broke project export'
        recovery.close()
        browser.close()
        print('PASS home, seven mobile stages, local navigator search/keyboard, review focus, correct recorded-work status, persistence, archives, imports, dark/light reflow and failed-stage backup recovery; zero unexpected page errors.')
finally:
    server.shutdown()
    server.server_close()
