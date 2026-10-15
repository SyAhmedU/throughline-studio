"""Product release QA using isolated, explicitly simulated studies."""
import functools, hashlib, io, json, re, sys, threading, zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'output/studio-product-release'
OUT.mkdir(parents=True, exist_ok=True)
LIVE = '--live' in sys.argv
BASE = 'https://throughline-studio.vercel.app/' if LIVE else 'http://127.0.0.1:5319/'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
server = None
if not LIVE:
    server = ThreadingHTTPServer(('127.0.0.1', 5319), functools.partial(Quiet, directory=str(ROOT/'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce', service_workers='block')
        page = context.new_page(); errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE, wait_until='networkidle')
        if page.locator('#syed-gate-i').count():
            fixture = (ROOT.parent/'output/research-completion/smoke.py').read_text(encoding='utf-8')
            page.locator('#syed-gate-i').fill(re.search(r"gate.fill\('([^']+)'\)",fixture).group(1)); page.keyboard.press('Enter')
        page.get_by_role('button',name='New research project',exact=True).click()
        page.locator('#np-title').fill('SIMULATED QA — research expedition')
        page.locator('#np-field').fill('Product verification only')
        page.get_by_role('button',name='Create & open').click()
        expect(page.locator('#stage-title')).to_contain_text('Discover')
        project_id = page.url.split('#/p/')[1].split('/')[0]
        def stage(name):
            page.goto(BASE+'#/p/'+project_id+'/'+name, wait_until='networkidle')
            expect(page.locator('#stage-title')).to_be_visible()
        stage('write')
        intro = page.locator('#draft-intro textarea')
        intro.fill('SIMULATED QA original introduction — preserve exact words.')
        page.locator('#draft-methods textarea').fill('PLANNED METHOD — SIMULATED QA plan')
        page.locator('#draft-results textarea').fill('SIMULATED QA authored results; no empirical claim.')
        page.locator('.manuscript-history summary').click()
        page.get_by_label('Version name').fill('Before supervisor feedback')
        page.get_by_role('button',name='Save manuscript version',exact=True).click()
        expect(page.locator('.manuscript-history-row')).to_have_count(1)
        intro.fill('SIMULATED QA changed introduction')
        page.once('dialog', lambda d: d.accept())
        page.locator('.manuscript-history-row').get_by_role('button',name='Restore',exact=True).click()
        expect(intro).to_have_value('SIMULATED QA original introduction — preserve exact words.')
        expect(page.locator('.manuscript-history-row')).to_have_count(2)
        page.reload(wait_until='networkidle')
        expect(intro).to_have_value('SIMULATED QA original introduction — preserve exact words.')
        page.get_by_role('navigation',name='Manuscript sections').get_by_role('button',name=re.compile('Results')).click()
        expect(page.locator('#draft-results textarea')).to_be_focused()
        page.evaluate("document.documentElement.dataset.theme='dark'; scrollTo(0,0)")
        page.screenshot(path=str(OUT/'writing-desktop.png'),full_page=True)
        stage('publish')
        page.locator('.delivery-checks summary').click()
        expect(page.locator('.delivery-checks')).to_contain_text('Methods still contain planning labels')
        expect(page.locator('.delivery-checks')).to_contain_text('Results have no captured analysis attached')
        page.get_by_role('button',name='Add reviewer comment',exact=True).click()
        item = page.locator('.revision-item').first
        expect(item.locator('option[value=addressed]')).to_have_attribute('disabled', '')
        item.get_by_label('Reviewer / round').fill('SIMULATED Reviewer 1 · round 1')
        item.get_by_label('Reviewer comment',exact=True).fill('SIMULATED exact reviewer comment')
        item.get_by_label('Author response',exact=True).fill('SIMULATED exact author response')
        item.get_by_label('Manuscript location / no-change rationale').fill('Methods, paragraph 2')
        item.get_by_label('Response status').select_option('addressed')
        expect(page.locator('.delivery-section-head')).to_contain_text('1/1 addressed')
        item.get_by_label('Author response',exact=True).fill('SIMULATED revised author response')
        expect(item.get_by_label('Response status')).to_have_value('drafted')
        item.get_by_label('Response status').select_option('addressed')
        page.reload(wait_until='networkidle')
        expect(item.get_by_label('Author response',exact=True)).to_have_value('SIMULATED revised author response')
        with page.expect_download() as download:
            page.get_by_role('button',name='Download study package (.zip)',exact=True).click()
        raw = Path(download.value.path()).read_bytes()
        (OUT/'simulated-study-package.zip').write_bytes(raw)
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            manifest=json.loads(archive.read('manifest.json'))
            for f in manifest['files']:
                content=archive.read(f['name'])
                assert hashlib.sha256(content).hexdigest()==f['sha256']
                assert len(content)==f['bytes']
            backup=archive.read('study.throughline.json')
            record=json.loads(backup)
            assert record['stages']['write']['data']['intro']=='SIMULATED QA original introduction — preserve exact words.'
            assert len(record['stages']['write']['data']['versions'])==2
            assert 'SIMULATED revised author response' in archive.read('reviewer-responses.md').decode()
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Publish mobile overflow'
        page.screenshot(path=str(OUT/'delivery-mobile.png'),full_page=True)
        stage('analyze')
        page.locator('.kitchen-story summary').click()
        expect(page.locator('.kitchen-story ol > li')).to_have_count(7)
        expect(page.locator('.kitchen-story')).to_contain_text('Serve, listen and refine')
        page.locator('.k-recipes button').filter(has_text='Reflexive thematic analysis').click()
        expect(page.locator('.recipe-story')).to_contain_text('Before you serve')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Kitchen mobile overflow'
        page.screenshot(path=str(OUT/'kitchen-mobile.png'),full_page=True)
        page.get_by_role('link',name='Plate the manuscript').click()
        expect(intro).to_have_value('SIMULATED QA original introduction — preserve exact words.')
        page.goto(BASE,wait_until='networkidle')
        page.locator('.rh-import input').set_input_files({'name':'study.throughline.json','mimeType':'application/json','buffer':backup})
        expect(page.locator('#stage-title')).to_be_visible()
        restored=page.evaluate("JSON.parse(localStorage.getItem('tls_projects'))")
        assert len(restored)==2
        assert len({r['id'] for r in restored})==2
        page.goto(BASE,wait_until='networkidle')
        page.set_viewport_size({'width':1440,'height':1000})
        for theme in ['dark','light']:
            page.evaluate('(t)=>{document.documentElement.dataset.theme=t;scrollTo(0,0)}',theme)
            page.screenshot(path=str(OUT/f'home-{theme}.png'),full_page=True)
        page.locator('summary').filter(has_text='Research Kitchen').click()
        expect(page.locator('.kitchen-welcome .recipe-story')).to_be_visible()
        page.locator('.kitchen-welcome .kitchen-story summary').click()
        expect(page.locator('.kitchen-welcome .kitchen-story ol > li')).to_have_count(7)
        page.screenshot(path=str(OUT/'recipe-book-desktop.png'),full_page=True)
        assert not errors, errors
        browser.close()
        print('PASS '+('LIVE' if LIVE else 'LOCAL')+': manuscript history/restore, outline focus, honest handoff checks, reviewer lifecycle, exact ZIP and SHA-256 hashes, restore-copy import, kitchen narrative and writing handoff, dark/light/mobile; zero page errors.')
finally:
    if server: server.shutdown(); server.server_close()
