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

shopt -s nullglob
converted=0
for src in "$INPUT_DIR"/*.{jpg,jpeg,png,webp,heic,heif,tiff,tif,bmp}; do
  [[ -f "$src" ]] || continue
  base="$(basename "$src")"
  # Strip original extension, force .jpg output
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
  (( converted++ )) || true
done

echo "Done. $converted image(s) converted."
echo ""

# ── Build SQL block ───────────────────────────────────────────────────────────
# Collect cover and gallery filenames per vehicle id.
declare -A cover_map    # vehicle_id → filename
declare -A gallery_map  # vehicle_id → space-separated ordered filenames

for out_file in "$OUTPUT_DIR"/*.jpg; do
  [[ -f "$out_file" ]] || continue
  fname="$(basename "$out_file")"
  stem="${fname%.jpg}"

  # Must contain __ separator
  if [[ "$stem" != *"__"* ]]; then
    continue
  fi

  vehicle_id="${stem%%__*}"
  field="${stem#*__}"

  if [[ "$field" == "cover" ]]; then
    cover_map["$vehicle_id"]="$fname"
  elif [[ "$field" == gallery_* ]]; then
    # Append; will sort later
    gallery_map["$vehicle_id"]+="$fname "
  fi
done

# Collect all vehicle ids
declare -A all_ids
for vid in "${!cover_map[@]}"; do all_ids["$vid"]=1; done
for vid in "${!gallery_map[@]}"; do all_ids["$vid"]=1; done

if [[ ${#all_ids[@]} -eq 0 ]]; then
  echo "No vehicle images found in $OUTPUT_DIR — no SQL generated."
  exit 0
fi

echo "-- ─────────────────────────────────────────────────────────────────────"
echo "-- Image URLs — paste into Supabase SQL editor"
echo "-- Storage base: $STORAGE_BASE"
echo "-- ─────────────────────────────────────────────────────────────────────"
echo ""

for vehicle_id in $(echo "${!all_ids[@]}" | tr ' ' '\n' | sort); do
  cover_col="NULL"
  gallery_col="NULL"

  if [[ -n "${cover_map[$vehicle_id]:-}" ]]; then
    cover_col="'${STORAGE_BASE}/${cover_map[$vehicle_id]}'"
  fi

  if [[ -n "${gallery_map[$vehicle_id]:-}" ]]; then
    # Sort gallery files by filename (gallery_1, gallery_2, …)
    IFS=' ' read -r -a gallery_files <<< "$(echo "${gallery_map[$vehicle_id]}" | tr ' ' '\n' | sort | tr '\n' ' ')"
    parts=()
    for gf in "${gallery_files[@]}"; do
      [[ -z "$gf" ]] && continue
      parts+=("'${STORAGE_BASE}/${gf}'")
    done
    if [[ ${#parts[@]} -gt 0 ]]; then
      gallery_col="ARRAY[$(IFS=,; echo "${parts[*]}")]"
    fi
  fi

  echo "UPDATE admin_vehicles SET"
  [[ "$cover_col"   != "NULL" ]] && echo "  cover_image_url    = ${cover_col},"
  [[ "$gallery_col" != "NULL" ]] && echo "  gallery_image_urls = ${gallery_col},"
  # Remove trailing comma from last SET line
  echo "  updated_at = now()"
  echo "WHERE id = '${vehicle_id}';"
  echo ""
done
