import json
import re
from pathlib import Path

def html_to_text(html: str) -> str:
    html = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', html, flags=re.IGNORECASE)
    html = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', html, flags=re.IGNORECASE)
    html = re.sub(r'<!--[\s\S]*?-->', '', html)
    html = re.sub(r'</(p|div|li|h[1-6]|tr|br|section|article|header|footer)>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'<br\s*/?>', '\n', html, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', html)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    return text.strip()

for site_file, label in [
    ('/home/z/my-project/download/site1.json', 'SITE 1: listingoptimization.ai'),
    ('/home/z/my-project/download/site2.json', 'SITE 2: phot.ai'),
]:
    print(f"\n{'='*70}\n{label}\n{'='*70}")
    with open(site_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    d = data.get('data', data) if isinstance(data, dict) else data
    if isinstance(d, dict):
        title = d.get('title') or (d.get('data') or {}).get('title')
        url = d.get('url') or (d.get('data') or {}).get('url')
        html = d.get('html') or (d.get('data') or {}).get('html') or ''
        print("TITLE:", title)
        print("URL:", url)
        print("\n--- EXTRACTED TEXT (first 6000 chars) ---\n")
        text = html_to_text(html)
        print(text[:6000])
        print(f"\n[total extracted text length: {len(text)} chars]")
