"""Minimal live connectivity check; no study data or research generation."""
import requests
payload = {'prompt': 'Connection test only. Return a JSON object with the single field status set to ok. Do not generate research content.', 'schema_hint': '{"status":"ok"}', 'temperature': 0}
urls = ['https://throughline-studio.vercel.app/api/generate', 'https://researchflow-syahmedus-projects.vercel.app/api/generate']
for url in urls:
    try:
        response = requests.post(url, json=payload, timeout=65)
        print(f'{url}: HTTP {response.status_code}', flush=True)
        if response.ok:
            body = response.json()
            data = body.get('data', body.get('result'))
            print('Structured response available:', data is not None, flush=True)
            break
    except requests.RequestException as error:
        print(type(error).__name__, flush=True)
else:
    raise SystemExit('Both AI routes failed the connectivity check; deterministic research workflows remain available.')
