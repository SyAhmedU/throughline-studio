import functools,threading,re,sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
root=Path.cwd();out=root.parent/'output/studio-visual-polish';out.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',5321),functools.partial(Quiet,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='chrome',headless=True)
  page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce',service_workers='block')
  page.goto('https://throughline-studio.vercel.app/' if '--live' in sys.argv else 'http://127.0.0.1:5321/',wait_until='networkidle')
  if page.locator('#syed-gate-i').count():
   fixture=(root.parent/'output/research-completion/smoke.py').read_text(encoding='utf-8')
   page.locator('#syed-gate-i').fill(re.search(r"gate.fill\('([^']+)'\)",fixture).group(1));page.keyboard.press('Enter')
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':900})
   page.locator('.studio-library-menu > summary').click()
   expect(page.get_by_role('link',name='Literature library')).to_be_visible()
   page.get_by_role('button',name='Check latest reference data').click()
   expect(page.get_by_role('dialog')).to_be_visible()
   page.get_by_role('button',name='Close latest data').click()
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
   page.screenshot(path=str(out/f'home-{width}.png'))
  page.locator('summary').filter(has_text='Research Kitchen').click()
  expect(page.locator('.kitchen-welcome')).to_be_visible()
  for theme in ['dark','light']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   for width in [390,1440]:
    page.set_viewport_size({'width':width,'height':1000})
    page.locator('.kitchen-welcome').scroll_into_view_if_needed()
    page.evaluate("scrollTo(0,document.querySelector('.kitchen-welcome').getBoundingClientRect().top+scrollY-90)")
    page.screenshot(path=str(out/f'kitchen-{theme}-{width}.png'))
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  browser.close()
  print('PASS integrated header/menu/reference dialog, desktop/mobile reflow, Kitchen dark/light screenshots')
finally:server.shutdown();server.server_close()
