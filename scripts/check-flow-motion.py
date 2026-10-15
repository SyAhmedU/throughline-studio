import functools,threading,re,sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
root=Path.cwd();out=root.parent/'output/studio-flow-motion';out.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',5323),functools.partial(Quiet,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='chrome',headless=True)
  page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference',service_workers='block')
  page.goto('https://throughline-studio.vercel.app/' if '--live' in sys.argv else 'http://127.0.0.1:5323/',wait_until='networkidle')
  if page.locator('#syed-gate-i').count():
   fixture=(root.parent/'output/research-completion/smoke.py').read_text(encoding='utf-8')
   page.locator('#syed-gate-i').fill(re.search(r"gate.fill\('([^']+)'\)",fixture).group(1));page.keyboard.press('Enter')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.evaluate("""() => { window.motionCalls=[]; const original=Element.prototype.animate; Element.prototype.animate=function(frames,options) { window.motionCalls.push({target:this.className,frames}); return original.call(this,frames,options) }; }""")
  page.locator('.rh-start').hover()
  page.wait_for_function("document.querySelector('.rh-start').style.getPropertyValue('--spotlight')==='1'")
  page.get_by_role('button',name='New research project',exact=True).click()
  page.locator('#np-title').fill('SIMULATED motion verification')
  page.get_by_role('button',name='Create & open').click()
  expect(page.locator('#stage-title')).to_contain_text('Discover')
  page.locator('.spine-node-btn').filter(has_text='Write').focus()
  page.wait_for_function("performance.getEntriesByType('resource').some(r=>r.name.includes('/WriteBody-'))")
  page.locator('.spine-node-btn').filter(has_text='Write').click()
  intro=page.locator('#draft-intro textarea');intro.fill('SIMULATED preserved draft during focus and transitions.')
  page.evaluate("window.draftElement=document.querySelector('#draft-intro textarea')")
  page.get_by_role('button',name='Focus mode',exact=True).click()
  expect(page.locator('.workspace')).to_have_class(re.compile('is-focused'))
  assert page.evaluate("window.draftElement===document.querySelector('#draft-intro textarea')")
  expect(intro).to_have_value('SIMULATED preserved draft during focus and transitions.')
  page.get_by_role('button',name='Review requirements').click()
  expect(page.locator('#stage-checkpoint')).to_be_focused()
  page.evaluate('scrollTo(0,0)')
  page.screenshot(path=str(out/'focus-desktop.png'))
  page.locator('#workspace-stage-select').select_option('frame')
  expect(page.locator('#stage-title')).to_contain_text('Frame')
  page.locator('#workspace-stage-select').select_option('analyze')
  expect(page.locator('#stage-title')).to_contain_text('Analyze')
  page.locator('#workspace-stage-select').select_option('write')
  expect(intro).to_have_value('SIMULATED preserved draft during focus and transitions.')
  assert len(page.evaluate('window.motionCalls')) >= 4
  page.emulate_media(reduced_motion='reduce')
  count=page.evaluate('window.motionCalls.length')
  page.locator('#workspace-stage-select').select_option('publish')
  expect(page.locator('#stage-title')).to_contain_text('Publish')
  assert page.evaluate('window.motionCalls.length')==count
  assert page.evaluate("getComputedStyle(document.documentElement).scrollBehavior")=='auto'
  page.set_viewport_size({'width':390,'height':844})
  page.get_by_role('button',name='Exit focus',exact=True).click()
  expect(page.locator('.study-journey')).to_be_visible()
  page.get_by_role('button',name='Focus mode',exact=True).click()
  page.locator('#workspace-stage-select').select_option('write')
  expect(intro).to_have_value('SIMULATED preserved draft during focus and transitions.')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/'focus-mobile.png'))
  assert not errors,errors
  browser.close()
  print('PASS normal/reduced motion, live preference change, intent preload, focus preserves editor identity/drafts, stage navigation and review access, mobile reflow')
finally:server.shutdown();server.server_close()
