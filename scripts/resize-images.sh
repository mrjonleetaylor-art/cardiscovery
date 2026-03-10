#!/usr/bin/env bash
# resize-images.sh
# Converts images to JPEG, resizes to max 1920px longest edge, 85% quality.
#
# Filename convention (double-underscore separator):
#   <vehicle-id>__cover.<ext>        → cover_image_url
#   <vehicle-id>__gallery_N.<ext>    → gallery_image_urls (appended in N order)
#
# Usage:
#   bash scripts/resize-images.sh ./raw-images ./output-images

set -euo pipefail

INPUT_DIR="${1:?Usage: $0 <input-dir> <output-dir>}"
OUTPUT_DIR="${2:?Usage: $0 <input-dir> <output-dir>}"

# ── Load VITE_SUPABASE_URL from .env ─────────────────────────────────────────
ENV_FILE="$(dirname "$0")/../.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env not found at $ENV_FILE" >&2
  exit 1
fi
VITE_SUPABASE_URL="$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'")"
if [[ -z "$VITE_SUPABASE_URL" ]]; then
  echo "Error: VITE_SUPABASE_URL not set in .env" >&2
  exit 1
fi
STORAGE_BASE="${VITE_SUPABASE_URL}/storage/v1/object/public/vehicle-images"

mkdir -p "$OUTPUT_DIR"

# ── Convert and resize ────────────────────────────────────────────────────────
echo "Converting images: $INPUT_DIR → $OUTPUT_DIR"

converted=0

# Use find + process substitution (bash 3 compatible, handles spaces and mixed case)
while IFS= read -r -d '' src; do
  ext="$(echo "${src##*.}" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in
    jpg|jpeg|png|webp|heic|heif|tiff|tif|bmp) ;;
    *) continue ;;
  esac

  base="$(basename "$src")"
  stem="${base%.*}"
  out="$OUTPUT_DIR/${stem}.jpg"

  sips \
    --resampleHeightWidthMax 1920 \
    --setProperty format jpeg \
    --setProperty formatOptions 85 \
    "$src" \
    --out "$out" \
    > /dev/null 2>&1

  echo "  ✓ $base → ${stem}.jpg"
  converted=$(( converted + 1 ))
done < <(find "$INPUT_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.heic" \) -print0)

echo "Done. $converted image(s) converted."
echo ""

# ── Build SQL block ───────────────────────────────────────────────────────────
# Collect unique vehicle ids from output filenames (bash 3: no associative arrays).
vehicle_ids="$(
  for f in "$OUTPUT_DIR"/*.jpg; do
    [[ -f "$f" ]] || continue
    stem="$(basename "${f%.jpg}")"
    [[ "$stem" == *"__"* ]] || continue
    echo "${stem%%__*}"
  done | sort -u
)"

if [[ -z "$vehicle_ids" ]]; then
  echo "No vehicle images found in $OUTPUT_DIR — no SQL generated."
  exit 0
fi

echo "-- ─────────────────────────────────────────────────────────────────────"
echo "-- Image URLs — paste into Supabase SQL editor"
echo "-- Storage base: $STORAGE_BASE"
echo "-- ─────────────────────────────────────────────────────────────────────"
echo ""

while IFS= read -r vehicle_id; do
  [[ -z "$vehicle_id" ]] && continue

  # Cover: exact match <vehicle_id>__cover.jpg
  cover_file="$OUTPUT_DIR/${vehicle_id}__cover.jpg"
  cover_col="NULL"
  if [[ -f "$cover_file" ]]; then
    cover_col="'${STORAGE_BASE}/${vehicle_id}__cover.jpg'"
  fi

  # Gallery: all <vehicle_id>__gallery_*.jpg sorted by filename
  gallery_col="NULL"
  gallery_parts=""
  while IFS= read -r gf; do
    [[ -z "$gf" ]] && continue
    fname="$(basename "$gf")"
    part="'${STORAGE_BASE}/${fname}'"
    if [[ -z "$gallery_parts" ]]; then
      gallery_parts="$part"
    else
      gallery_parts="${gallery_parts},${part}"
    fi
  done < <(find "$OUTPUT_DIR" -maxdepth 1 -name "${vehicle_id}__gallery_*.jpg" | sort)

  if [[ -n "$gallery_parts" ]]; then
    gallery_col="ARRAY[${gallery_parts}]"
  fi

  # Skip vehicle if no images found
  if [[ "$cover_col" == "NULL" && "$gallery_col" == "NULL" ]]; then
    continue
  fi

  echo "UPDATE admin_vehicles SET"
  if [[ "$cover_col" != "NULL" && "$gallery_col" != "NULL" ]]; then
    echo "  cover_image_url    = ${cover_col},"
    echo "  gallery_image_urls = ${gallery_col},"
  elif [[ "$cover_col" != "NULL" ]]; then
    echo "  cover_image_url    = ${cover_col},"
  else
    echo "  gallery_image_urls = ${gallery_col},"
  fi
  echo "  updated_at = now()"
  echo "WHERE id = '${vehicle_id}';"
  echo ""
done <<< "$vehicle_ids"
