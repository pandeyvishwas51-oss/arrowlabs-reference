#!/usr/bin/env bash
# Curate + web-optimize real D2C catalog images (Mimi + House of Tarasha) into
# public/showcase/. Resizes to max 1400px and converts to JPEG for fast loads.
set -e

ROOT="/Users/vishwaspandey/Desktop/e-comm-mafia"
MIMI="/Users/vishwaspandey/Downloads/mimicore/web/public/catalog"
HOT="/Users/vishwaspandey/Desktop/HOT/theme_export__houseoftaraasha-com-hot-website__01JUL2026-0824pm/assets"
OUT="$ROOT/public/showcase"
mkdir -p "$OUT/mimi" "$OUT/hot"

resize() { # src dest
  sips -s format jpeg -Z 1400 "$1" --out "$2" >/dev/null 2>&1 && echo "  ✓ $(basename "$2")"
}

echo "Mimi (D2C innerwear):"
resize "$MIMI/women-periods-panty-prinium-wine/1.png" "$OUT/mimi/periods-panty-wine.jpg"
resize "$MIMI/women-feeding-bra-mouse/1.png"          "$OUT/mimi/feeding-bra.jpg"
resize "$MIMI/women-cotton-panty/1.png"               "$OUT/mimi/cotton-panty.jpg"
resize "$MIMI/baby-diapers-yellow/1.png"              "$OUT/mimi/baby-diapers.jpg"
resize "$MIMI/men-mens-t-shirt-white/1.png"           "$OUT/mimi/mens-tshirt.jpg"
resize "$MIMI/adult-adult-diaper-wine/2.png"          "$OUT/mimi/adult-care.jpg"

echo "House of Tarasha (home + craft):"
resize "$HOT/hero_home.jpg"               "$OUT/hot/hero-home.jpg"
resize "$HOT/craft_hero.jpg"              "$OUT/hot/craft.jpg"
resize "$HOT/collection_brass_atelier.jpg" "$OUT/hot/brass-atelier.jpg"
resize "$HOT/brand_story_artisan.jpg"    "$OUT/hot/artisan.jpg"
resize "$HOT/collection_linen_room.jpg"  "$OUT/hot/linen-room.jpg"
resize "$HOT/collection_still_light.jpg" "$OUT/hot/still-light.jpg"

echo "done"
