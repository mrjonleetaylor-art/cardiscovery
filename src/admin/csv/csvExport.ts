/**
 * CSV export — produces a roundtrip-safe CSV file from admin_vehicles.
 *
 * Column order: ALL_COLUMNS (required identity columns then all spec columns).
 * gallery_image_urls are pipe-separated. Array narrative fields are pipe-separated.
 */

import { AdminVehicle } from '../adminTypes';
import { ALL_COLUMNS, PIPE_SEPARATOR } from './specSchema';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value);
  // Quote fields containing commas, double-quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildRow(vehicle: AdminVehicle): string {
  const cells: string[] = [];

  for (const col of ALL_COLUMNS) {
    switch (col) {
      case 'row_type':
        cells.push(csvCell(vehicle.row_type));
        break;
      case 'base_id':
        cells.push(csvCell(vehicle.base_id));
        break;
      case 'variant_code':
        cells.push(csvCell(vehicle.variant_code ?? ''));
        break;
      case 'id':
        cells.push(csvCell(vehicle.id));
        break;
      case 'make':
        cells.push(csvCell(vehicle.make));
        break;
      case 'model':
        cells.push(csvCell(vehicle.model));
        break;
      case 'year':
        cells.push(csvCell(vehicle.year));
        break;
      case 'body_type':
        cells.push(csvCell(vehicle.body_type));
        break;
      case 'status':
        cells.push(csvCell(vehicle.status));
        break;
      case 'price_aud':
        cells.push(csvCell(vehicle.price_aud ?? ''));
        break;
      case 'cover_image_url':
        cells.push(csvCell(vehicle.cover_image_url ?? ''));
        break;
      case 'gallery_image_urls':
        cells.push(csvCell(vehicle.gallery_image_urls.join(PIPE_SEPARATOR)));
        break;
      case 'image_source':
        cells.push(csvCell(vehicle.image_source ?? ''));
        break;
      case 'license_note':
        cells.push(csvCell(vehicle.license_note ?? ''));
        break;

      default:
        // Spec / narrative / admin columns
        // admin_variant_kind defaults to 'variant' when not set, so blank in CSV reads as 'variant'
        if (col === 'admin_variant_kind') {
          cells.push(csvCell(vehicle.specs[col] ?? 'variant'));
        } else {
          cells.push(csvCell(vehicle.specs[col] ?? ''));
        }
        break;
    }
  }

  return cells.join(',');
}

// ─── Public export function ───────────────────────────────────────────────────

/**
 * Converts an array of AdminVehicle rows to a UTF-8 CSV string.
 *
 * Rows are expected to be pre-sorted (e.g. BASE rows first, then VARIANTs).
 * The caller decides which records to include (all statuses, or live-only, etc.).
 */
export function buildCsvContent(vehicles: AdminVehicle[]): string {
  const header = ALL_COLUMNS.join(',');
  const rows = vehicles.map(buildRow);
  return [header, ...rows].join('\n');
}

/**
 * Triggers a browser download of the given CSV string.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sorts vehicles so that BASE rows appear before their VARIANTs, then
 * alphabetically by base_id and variant_code.
 */
export function sortVehiclesForExport(vehicles: AdminVehicle[]): AdminVehicle[] {
  return [...vehicles].sort((a, b) => {
    // Primary: base_id
    const baseCompare = a.base_id.localeCompare(b.base_id);
    if (baseCompare !== 0) return baseCompare;
    // Secondary: BASE before VARIANT
    if (a.row_type !== b.row_type) return a.row_type === 'BASE' ? -1 : 1;
    // Tertiary: variant_code
    return (a.variant_code ?? '').localeCompare(b.variant_code ?? '');
  });
}
