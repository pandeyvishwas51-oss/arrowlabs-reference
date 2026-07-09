import json
import re

files = {
    'skincare': '/home/z/my-project/download/img_skincare.json',
    'adcreative': '/home/z/my-project/download/img_adcreative.json',
    'ugc': '/home/z/my-project/download/img_ugc.json',
    'dashboard': '/home/z/my-project/download/img_dashboard.json',
    'amazon': '/home/z/my-project/download/img_amazon.json',
    'avatars': '/home/z/my-project/download/img_avatars.json',
}

out = {}
for key, fp in files.items():
    with open(fp) as f:
        raw = f.read()
    # Strip CLI status lines, find the JSON block
    m = re.search(r'\{[\s\S]*\}\s*$', raw)
    if not m:
        print(f"NO JSON FOUND in {key}")
        continue
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        print(f"JSON parse error in {key}: {e}")
        continue
    results = data.get('results', []) if isinstance(data, dict) else []
    urls = [r.get('original_url', '') for r in results if r.get('original_url')]
    out[key] = urls
    print(f"\n{key} ({len(urls)} images):")
    for u in urls:
        print(f"  {u}")

with open('/home/z/my-project/download/images.json', 'w') as f:
    json.dump(out, f, indent=2)
print(f"\n\nSaved {sum(len(v) for v in out.values())} image URLs to /home/z/my-project/download/images.json")
