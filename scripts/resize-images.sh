#!/usr/bin/env bash
# resize-images.sh
# Converts images to JPEG, resizes to max 1920px longest edge, 85% quality,
# uploads to Supabase storage, then prints SQL to update admin_vehicles.
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

# ── Load .env ─────────────────────────────────────────────────────────────────
ENV_FILE="$(dirname "$0")/../.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env not found at $ENV_FILE" >&2
  exit 1
fi

read_env() {
  grep -E "^${1}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"
}

SUPABASE_URL="$(read_env VITE_SUPABASE_URL)"
ANON_KEY="$(read_env VITE_SUPABASE_ANON_KEY)"
ADMIN_EMAIL="$(read_env VITE_ADMIN_EMAIL)"
ADMIN_PASSWORD="$(read_env VITE_ADMIN_PASSWORD)"

for var in SUPABASE_URL ANON_KEY ADMIN_EMAIL ADMIN_PASSWORD; do
  eval "val=\$$var"
  if [[ -z "$val" ]]; then
    echo "Error: ${var} not set in .env" >&2
    exit 1
  fi
done

STORAGE_BASE="${SUPABASE_URL}/storage/v1/object/public/vehicle-images"

mkdir -p "$OUTPUT_DIR"

# ── Convert and resize ────────────────────────────────────────────────────────
echo "Converting images: $INPUT_DIR → $OUTPUT_DIR"

converted=0
while IFS= read -r -d '' src; do
  ext="$(echo "${src##*.}" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in
    jpg|jpeg|png|webp|heic|heif|tiff|tif|bmp) ;;
    *) continue ;;
  esac

  base="$(basename "$src")"
  stem="${base%.*}"
  out="$OUTPUT_DIR/${stem}.jpg"

  if [[ -f "$out" ]]; then
    echo "  Skipping ${stem}.jpg (already converted)"
    continue
  fi

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

if [[ $converted -eq 0 ]]; then
  echo "No images converted — nothing to upload."
  exit 0
fi

# ── Authenticate ──────────────────────────────────────────────────────────────
echo "Authenticating as $ADMIN_EMAIL ..."

auth_response="$(curl -sf \
  -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")"

BEARER_TOKEN="$(echo "$auth_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)"

if [[ -z "$BEARER_TOKEN" ]]; then
  echo "Error: authentication failed. Check VITE_ADMIN_EMAIL / VITE_ADMIN_PASSWORD." >&2
  echo "$auth_response" >&2
  exit 1
fi

echo "Authenticated."
echo ""

# ── Upload to Supabase storage ────────────────────────────────────────────────
echo "Uploading to vehicle-images bucket ..."

upload_ok=0
upload_fail=0

for f in "$OUTPUT_DIR"/*.jpg; do
  [[ -f "$f" ]] || continue
  fname="$(basename "$f")"

  http_code="$(curl -s -o /tmp/_upload_resp.json -w "%{http_code}" \
    -X POST \
    "${SUPABASE_URL}/storage/v1/object/vehicle-images/${fname}" \
    -H "Authorization: Bearer ${BEARER_TOKEN}" \
    -H "apikey: ${ANON_KEY}" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@${f}")"

  if [[ "$http_code" == "200" ]]; then
    echo "  ✓ $fname"
    upload_ok=$(( upload_ok + 1 ))
  else
    echo "  ✗ $fname (HTTP $http_code: $(cat /tmp/_upload_resp.json))"
    upload_fail=$(( upload_fail + 1 ))
  fi
done

echo ""
echo "Uploaded: $upload_ok  Failed: $upload_fail"
echo ""

# ── Build SQL block ───────────────────────────────────────────────────────────
vehicle_ids="$(
  for f in "$OUTPUT_DIR"/*.jpg; do
    [[ -f "$f" ]] || continue
    stem="$(basename "${f%.jpg}")"
    [[ "$stem" == *"__"* ]] || continue
    echo "${stem%%__*}"
  done | sort -u
)"

if [[ -z "$vehicle_ids" ]]; then
  exit 0
fi

echo "-- ─────────────────────────────────────────────────────────────────────"
echo "-- Image URLs — paste into Supabase SQL editor"
echo "-- Storage base: $STORAGE_BASE"
echo "-- ─────────────────────────────────────────────────────────────────────"
echo ""

while IFS= read -r vehicle_id; do
  [[ -z "$vehicle_id" ]] && continue

  cover_col="NULL"
  cover_file="$OUTPUT_DIR/${vehicle_id}__cover.jpg"
  if [[ -f "$cover_file" ]]; then
    cover_col="'${STORAGE_BASE}/${vehicle_id}__cover.jpg'"
  fi

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

  [[ "$cover_col" == "NULL" && "$gallery_col" == "NULL" ]] && continue

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
