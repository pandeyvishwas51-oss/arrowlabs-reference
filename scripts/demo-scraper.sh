#!/usr/bin/env bash
# ArrowLabs demo scraper tunnel.
#
# Runs the scraper-service on THIS machine (your residential IP, so Amazon AND
# Flipkart/Myntra are not bot-walled), exposes it with a cloudflared quick tunnel,
# and points the live site (arrowlabs.art) at it for BOTH Amazon and marketplace
# scraping. This is what makes scraping reliable during the demo.
#
# Usage:   bash scripts/demo-scraper.sh    (or: npm run demo:scraper)
# Leave this terminal open. Press Ctrl+C to stop (reverts the site cleanly).

set -eo pipefail

ZONE="asia-south1-a"
VM="arrowlabs"
PORT=8071
HERE="$(cd "$(dirname "$0")/.." && pwd)"
CF_LOG="/tmp/al-cf.log"
SCRAPER_LOG="/tmp/al-scraper.log"
VM_LOCAL="http://127.0.0.1:8071"   # the VM's own scraper (Amazon fallback on revert)
SCRAPER_PID=""
CF_PID=""

say() { printf "\n\033[1;35m▸ %s\033[0m\n" "$1"; }

cleanup() {
  say "Reverting the live site to its own scraper..."
  gcloud compute ssh "$VM" --zone "$ZONE" --command \
    "cd ~/app && sed -i 's#^SCRAPER_SERVICE_URL=.*#SCRAPER_SERVICE_URL=$VM_LOCAL#' .env && sed -i 's#^MARKETPLACE_SCRAPER_URL=.*#MARKETPLACE_SCRAPER_URL=#' .env && sudo systemctl restart arrowlabs.service" >/dev/null 2>&1 || true
  [ -n "$CF_PID" ] && kill "$CF_PID" 2>/dev/null || true
  [ -n "$SCRAPER_PID" ] && kill "$SCRAPER_PID" 2>/dev/null || true
  pkill -f "waitress.*app:app" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url" 2>/dev/null || true
  say "Stopped. Site reverted to the VM scraper."
  exit 0
}
trap cleanup INT TERM

# 1) Local scraper-service on your residential IP
say "Starting the local scraper on port $PORT ..."
pkill -f "waitress.*app:app" 2>/dev/null || true
sleep 1
cd "$HERE/scraper-service"
python3 -m waitress --host=127.0.0.1 --port="$PORT" app:app > "$SCRAPER_LOG" 2>&1 &
SCRAPER_PID=$!
cd "$HERE"
sleep 4
if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null; then echo "  local scraper up."; else echo "  scraper failed - see $SCRAPER_LOG"; cat "$SCRAPER_LOG"; exit 1; fi

# 2) cloudflared quick tunnel
say "Opening a public tunnel (cloudflared) ..."
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
sleep 1
cloudflared tunnel --url "http://localhost:$PORT" > "$CF_LOG" 2>&1 &
CF_PID=$!

URL=""
for i in $(seq 1 25); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done
if [ -z "$URL" ]; then echo "  tunnel URL not found - see $CF_LOG"; cat "$CF_LOG"; exit 1; fi
echo "  tunnel: $URL"
sleep 5
curl -sf "$URL/health" >/dev/null && echo "  tunnel reaches the scraper." || echo "  (tunnel warming up; continuing)"

# 3) Point the live site at the tunnel for BOTH Amazon + marketplaces
say "Pointing arrowlabs.art at your residential scraper (Amazon + marketplaces) ..."
gcloud compute ssh "$VM" --zone "$ZONE" --command \
  "cd ~/app && sed -i 's#^SCRAPER_SERVICE_URL=.*#SCRAPER_SERVICE_URL=$URL#' .env && (grep -q '^MARKETPLACE_SCRAPER_URL=' .env && sed -i 's#^MARKETPLACE_SCRAPER_URL=.*#MARKETPLACE_SCRAPER_URL=$URL#' .env || echo 'MARKETPLACE_SCRAPER_URL=$URL' >> .env) && sudo systemctl restart arrowlabs.service" >/dev/null 2>&1
echo "  done."

say "READY. All scraping (Amazon, Flipkart, Myntra) now runs through your residential IP."
echo "   Live: https://arrowlabs.art/studio"
echo "   Keep this terminal open during the demo. Press Ctrl+C when done."
echo ""
wait "$CF_PID"
