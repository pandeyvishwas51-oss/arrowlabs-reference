import json
import os
from collections import Counter

files = [
    '/home/z/my-project/download/search_amazon_listing.json',
    '/home/z/my-project/download/search_ad_creative.json',
    '/home/z/my-project/download/search_product_photo.json',
    '/home/z/my-project/download/search_d2c_creative.json',
    '/home/z/my-project/download/search_amazon_seller.json',
    '/home/z/my-project/download/search_video_ads.json',
]

all_results = []
for fp in files:
    with open(fp) as f:
        data = json.load(f)
    # The CLI returns either list directly or wrapped in data
    items = data if isinstance(data, list) else data.get('data', [])
    if isinstance(items, dict):
        items = items.get('results', [])
    for r in (items or []):
        all_results.append({
            'name': r.get('name', ''),
            'url': r.get('url', ''),
            'host': r.get('host_name', ''),
            'snippet': r.get('snippet', ''),
        })

# Deduplicate by host
seen = {}
deduped = []
for r in all_results:
    h = r['host']
    if h and h not in seen and not any(skip in h for skip in ['google.', 'youtube.', 'reddit.', 'linkedin.', 'twitter.', 'facebook.', 'instagram.', 'medium.com', 'quora.', 'wikipedia.']):
        seen[h] = True
        deduped.append(r)

print(f"Total unique domains discovered: {len(deduped)}\n")
print("="*100)
for i, r in enumerate(deduped, 1):
    print(f"\n[{i}] {r['name']}")
    print(f"    URL: {r['url']}")
    print(f"    Snippet: {r['snippet'][:280]}")
