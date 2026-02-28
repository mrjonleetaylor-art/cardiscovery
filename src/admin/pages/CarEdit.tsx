import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Archive, RotateCcw, Pencil, Eye, EyeOff } from 'lucide-react';
import { AdminVehicle, AdminVehicleStatus } from '../adminTypes';
import {
  getVehicle,
  getVariantsForBase,
  createVehicle,
  updateVehicle,
  archiveVehicle,
  restoreVehicle,
} from '../lib/adminVehicles';
import { resolveAdminVehicle } from '../lib/adminResolver';
import { SPEC_COLUMN_DEFS, SPEC_COLUMNS } from '../csv/specSchema';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  BODY_TYPES,
  DRIVETRAINS,
  FUEL_TYPES,
  TRANSMISSIONS,
  EnumOption,
  allowedEnumLabels,
  isValidEnum,
  labelFor,
  normalizeEnum,
} from '../lib/enums';

interface CarEditProps {
  vehicleId: string | null; // null = new
  listQuery?: string;
  onNavigate: (path: string) => void;
}

type FormData = Omit<AdminVehicle, 'created_at' | 'updated_at'>;

const EMPTY_FORM: FormData = {
  id: '',
  row_type: 'BASE',
  base_id: '',
  variant_code: null,
  status: 'draft',
  archived_at: null,
  last_import_id: null,
  make: '',
  model: '',
  year: new Date().getFullYear(),
  body_type: '',
  price_aud: null,
  cover_image_url: null,
  gallery_image_urls: [],
  image_source: null,
  license_note: null,
  specs: Object.fromEntries(SPEC_COLUMNS.map((k) => [k, null])),
};

// Form section accordion
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

// Text field row
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-500 pt-2.5 leading-tight">{label}</span>
      <div>{children}</div>
    </div>
  );
}

const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors';
const TEXTAREA = `${INPUT} resize-y min-h-[80px]`;

const CONTROLLED_SPEC_ENUMS: Record<string, EnumOption[]> = {
  spec_overview_fuel_type: FUEL_TYPES,
  spec_overview_drivetrain: DRIVETRAINS,
  spec_overview_transmission: TRANSMISSIONS,
};

function EnumSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: EnumOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const isCustom = !!value && !isValidEnum(value, options);
  return (
    <>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {isCustom && <option value={value}>Custom: {value}</option>}
      </select>
      {isCustom && (
        <p className="text-xs text-amber-600 mt-1">
          Non-standard value, please choose a standard option.
        </p>
      )}
    </>
  );
}

export function CarEdit({ vehicleId, listQuery = '', onNavigate }: CarEditProps) {
  const returnToList = `/admin/cars${listQuery}`;
  const isNew = vehicleId === null;
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [baseVehicle, setBaseVehicle] = useState<AdminVehicle | null>(null);
  const [variants, setVariants] = useState<AdminVehicle[]>([]);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  // Add pack dialog state
  const [showAddPack, setShowAddPack] = useState(false);
  const [addPackCode, setAddPackCode] = useState('');
  const [addPackName, setAddPackName] = useState('');
  const [addPackError, setAddPackError] = useState<string | null>(null);
  const [addPackSaving, setAddPackSaving] = useState(false);

  const [showResolved, setShowResolved] = useState(false);
  const resolved = baseVehicle && form.row_type === 'VARIANT'
    ? resolveAdminVehicle(baseVehicle, form as AdminVehicle)
    : null;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNew) return;
    loadVehicle();
  }, [vehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const v = await getVehicle(vehicleId!);
      if (!v) { onNavigate(returnToList); return; }

      const specs = Object.fromEntries(
        SPEC_COLUMNS.map((k) => [k, v.specs[k] ?? null])
      );
      setForm({ ...v, specs });

      if (v.row_type === 'BASE') {
        const vars = await getVariantsForBase(v.id);
        setVariants(vars);
      } else {
        // Load base for resolution preview
        const base = await getVehicle(v.base_id);
        setBaseVehicle(base);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setField = (key: keyof FormData, value: unknown) => {
    setSaveSuccess(false);
    setSaveError(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setSpec = (key: string, value: string) => {
    setSaveSuccess(false);
    setSaveError(null);
    setForm((prev) => ({
      ...prev,
      specs: { ...prev.specs, [key]: value || null },
    }));
  };

  // ── ID derivation ─────────────────────────────────────────────────────────
  const derivedId =
    form.row_type === 'BASE'
      ? form.base_id || ''
      : form.base_id && form.variant_code
        ? `${form.base_id}${form.variant_code}`
        : '';

  const effectiveId = form.id || derivedId;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);

    try {
      const payload: FormData = {
        ...form,
        id: effectiveId || form.id,
        base_id: form.row_type === 'BASE' ? (effectiveId || form.base_id) : form.base_id,
      };

      const normalizedBodyType = normalizeEnum(payload.body_type, BODY_TYPES);
      if (payload.body_type.trim() && !normalizedBodyType) {
        setSaveError(`body_type "${payload.body_type}" is not standard. Allowed: ${allowedEnumLabels(BODY_TYPES)}`);
        return;
      }
      payload.body_type = normalizedBodyType ?? '';

      for (const [specKey, enumList] of Object.entries(CONTROLLED_SPEC_ENUMS)) {
        const current = payload.specs[specKey];
        const normalized = normalizeEnum(current, enumList);
        if (current && current.trim() && !normalized) {
          setSaveError(`${specKey} "${current}" is not standard. Allowed: ${allowedEnumLabels(enumList)}`);
          return;
        }
        payload.specs[specKey] = normalized ?? null;
      }

      if (!payload.id) { setSaveError('ID is required.'); return; }
      if (!payload.make) { setSaveError('Make is required.'); return; }
      if (!payload.model) { setSaveError('Model is required.'); return; }
      if (!payload.year) { setSaveError('Year is required.'); return; }
      if (!payload.body_type) { setSaveError('Body type is required.'); return; }

      if (isNew) {
        await createVehicle(payload);
        onNavigate(returnToList);
      } else {
        await updateVehicle(vehicleId!, {
          ...payload,
          // For BASE rows, ensure id == base_id
          base_id: payload.row_type === 'BASE' ? payload.id : payload.base_id,
        });
        onNavigate(returnToList);
      }
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Archive/Restore ───────────────────────────────────────────────────────
  const handleArchiveVariant = async () => {
    if (!confirmArchiveId) return;
    await archiveVehicle(confirmArchiveId);
    setConfirmArchiveId(null);
    if (form.row_type === 'BASE') {
      const vars = await getVariantsForBase(form.id);
      setVariants(vars);
    }
  };

  const handleRestoreVariant = async (id: string) => {
    await restoreVehicle(id);
    if (form.row_type === 'BASE') {
      const vars = await getVariantsForBase(form.id);
      setVariants(vars);
    }
  };

  // ── Add pack ──────────────────────────────────────────────────────────────
  const handleAddPack = async () => {
    if (!addPackCode.trim()) return;
    setAddPackError(null);
    setAddPackSaving(true);
    try {
      const code = addPackCode.trim();
      const newId = `${form.id}${code}`;
      await createVehicle({
        id: newId,
        row_type: 'VARIANT',
        base_id: form.id,
        variant_code: code,
        status: 'draft',
        archived_at: null,
        last_import_id: null,
        // Copy identity fields from base so DB constraints are satisfied;
        // resolver will use base values at render time.
        make: form.make,
        model: form.model,
        year: form.year,
        body_type: form.body_type,
        price_aud: null,
        cover_image_url: null,
        gallery_image_urls: [],
        image_source: null,
        license_note: null,
        specs: {
          ...Object.fromEntries(SPEC_COLUMNS.map((k) => [k, null])),
          admin_variant_kind: 'pack',
          pack_name: addPackName.trim() || null,
        },
      });
      setShowAddPack(false);
      setAddPackCode('');
      setAddPackName('');
      onNavigate(`/admin/cars/${encodeURIComponent(newId)}${listQuery}`);
    } catch (e: unknown) {
      setAddPackError(String(e));
    } finally {
      setAddPackSaving(false);
    }
  };

  // ── Derived: split variants into packs and non-packs ─────────────────────
  const packRows = variants.filter((v) => v.specs?.['admin_variant_kind'] === 'pack');
  const nonPackRows = variants.filter((v) => v.specs?.['admin_variant_kind'] !== 'pack');

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  const pageTitle = isNew ? 'New vehicle' : `Edit: ${form.make} ${form.model} ${form.year}`;
  const isPackRow = form.row_type === 'VARIANT' && form.specs['admin_variant_kind'] === 'pack';
  const hasSuspiciousPackPrice =
    isPackRow &&
    form.price_aud != null &&
    baseVehicle?.price_aud != null &&
    form.price_aud > baseVehicle.price_aud;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate(returnToList)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">{pageTitle}</h1>
          {!isNew && (
            <p className="text-xs text-slate-400 font-mono mt-0.5">{form.id}</p>
          )}
        </div>
        {!isNew && form.row_type === 'VARIANT' && baseVehicle && (
          <button
            onClick={() => onNavigate(`/admin/cars/${encodeURIComponent(baseVehicle.id)}${listQuery}`)}
            className="text-xs text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Base: {baseVehicle.id}
          </button>
        )}
        {!isNew && form.row_type === 'VARIANT' && (
          <button
            onClick={() => setShowResolved((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showResolved ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showResolved ? 'Hide resolved' : 'Show resolved'}
          </button>
        )}
        {!isNew && (
          <button
            onClick={() => onNavigate(
              `/admin/preview/${encodeURIComponent(form.row_type === 'BASE' ? form.id : form.base_id)}${listQuery}`
            )}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            title="Preview in public Profile UI"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        )}
        {!isNew && (
          <StatusBadge status={form.status} />
        )}
      </div>

      {/* Resolved preview banner for variants */}
      {showResolved && resolved && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
          <p className="font-semibold text-slate-700 mb-2">Resolved preview (base + variant merged)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <span>Make: <strong className="text-slate-900">{resolved.make}</strong></span>
            <span>Model: <strong className="text-slate-900">{resolved.model}</strong></span>
            <span>Year: <strong className="text-slate-900">{resolved.year}</strong></span>
            <span>Body: <strong className="text-slate-900">{resolved.body_type}</strong></span>
            <span>Price: <strong className="text-slate-900">{resolved.price_aud != null ? `$${resolved.price_aud.toLocaleString()}` : '—'}</strong></span>
          </div>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* ── Core info ────────────────────────────────────────────────────── */}
        <Section title="Core info">
          <Field label="Row type">
            <select
              value={form.row_type}
              onChange={(e) => setField('row_type', e.target.value)}
              disabled={!isNew}
              className={INPUT}
            >
              <option value="BASE">BASE</option>
              <option value="VARIANT">VARIANT</option>
            </select>
          </Field>
          <Field label="Base ID">
            <input
              type="text"
              value={form.base_id}
              onChange={(e) => setField('base_id', e.target.value)}
              placeholder={form.row_type === 'BASE' ? 'e.g. toyota-camry-2024' : 'Parent BASE id'}
              className={INPUT}
              required
            />
          </Field>
          {form.row_type === 'VARIANT' && (
            <Field label="Variant code">
              <input
                type="text"
                value={form.variant_code ?? ''}
                onChange={(e) => setField('variant_code', e.target.value || null)}
                placeholder="e.g. C (results in id = base_id + C)"
                className={INPUT}
                required
              />
            </Field>
          )}
          {form.row_type === 'VARIANT' && (
            <Field label="Variant kind">
              <select
                value={form.specs['admin_variant_kind'] ?? 'variant'}
                onChange={(e) => setSpec('admin_variant_kind', e.target.value)}
                className={INPUT}
              >
                <option value="variant">Variant</option>
                <option value="pack">Pack</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Pack rows appear in Option Packs; Variant rows appear in Variants.</p>
            </Field>
          )}
          {form.row_type === 'VARIANT' && form.specs['admin_variant_kind'] === 'pack' && (
            <Field label="Pack name">
              <input
                type="text"
                value={form.specs['pack_name'] ?? ''}
                onChange={(e) => setSpec('pack_name', e.target.value)}
                placeholder="M Sport Package"
                className={INPUT}
              />
              <p className="text-xs text-slate-400 mt-1">Display name shown in Option Packs list. Falls back to variant code.</p>
            </Field>
          )}
          <Field label="ID">
            <input
              type="text"
              value={form.id}
              onChange={(e) => setField('id', e.target.value)}
              placeholder={derivedId ? `Auto: ${derivedId}` : 'Derived from base_id + variant_code'}
              className={INPUT}
              disabled={!isNew}
            />
            {derivedId && !form.id && (
              <p className="text-xs text-slate-400 mt-1">Will be derived as: <code>{derivedId}</code></p>
            )}
          </Field>
          <Field label="Make">
            <input type="text" value={form.make} onChange={(e) => setField('make', e.target.value)} placeholder="Toyota" className={INPUT} required />
          </Field>
          <Field label="Model">
            <input type="text" value={form.model} onChange={(e) => setField('model', e.target.value)} placeholder="Camry" className={INPUT} required />
          </Field>
          <Field label="Year">
            <input type="number" value={form.year} onChange={(e) => setField('year', parseInt(e.target.value) || 0)} placeholder="2024" className={INPUT} required min={1900} max={2100} />
          </Field>
          <Field label="Body type">
            <EnumSelect
              value={form.body_type}
              options={BODY_TYPES}
              placeholder="Select body type"
              onChange={(value) => setField('body_type', value)}
            />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setField('status', e.target.value as AdminVehicleStatus)} className={INPUT}>
              <option value="draft">draft</option>
              <option value="live">live</option>
              <option value="archived">archived</option>
            </select>
          </Field>
          <Field label={isPackRow ? 'Pack price delta (AUD)' : 'Price (AUD)'}>
            <input
              type="number"
              value={form.price_aud ?? ''}
              onChange={(e) => setField('price_aud', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="49990"
              className={INPUT}
              min={0}
            />
            {isPackRow ? (
              <p className="text-xs text-slate-400 mt-1">
                Pack rows use delta pricing: this amount is added on top of the selected trim.
              </p>
            ) : form.row_type === 'VARIANT' && !form.price_aud && baseVehicle?.price_aud ? (
              <p className="text-xs text-slate-400 mt-1">Inherits from base: ${baseVehicle.price_aud.toLocaleString()}</p>
            ) : null}
            {hasSuspiciousPackPrice && (
              <p className="text-xs text-amber-600 mt-1">
                Warning: pack delta (${form.price_aud?.toLocaleString()}) is greater than base price (${baseVehicle?.price_aud?.toLocaleString()}).
              </p>
            )}
          </Field>
        </Section>

        {/* ── Images ───────────────────────────────────────────────────────── */}
        <Section title="Images">
          <Field label="Cover image URL">
            <input type="url" value={form.cover_image_url ?? ''} onChange={(e) => setField('cover_image_url', e.target.value || null)} placeholder="https://..." className={INPUT} />
          </Field>
          <Field label="Gallery URLs">
            <textarea
              value={form.gallery_image_urls.join('\n')}
              onChange={(e) => setField('gallery_image_urls', e.target.value.split('\n').map((u) => u.trim()).filter(Boolean))}
              placeholder="One URL per line"
              className={TEXTAREA}
            />
            <p className="text-xs text-slate-400 mt-1">One URL per line. Exported as pipe-separated in CSV.</p>
          </Field>
          <Field label="Image source">
            <input type="text" value={form.image_source ?? ''} onChange={(e) => setField('image_source', e.target.value || null)} className={INPUT} />
          </Field>
          <Field label="License note">
            <input type="text" value={form.license_note ?? ''} onChange={(e) => setField('license_note', e.target.value || null)} className={INPUT} />
          </Field>
          {form.cover_image_url && (
            <div className="mt-3">
              <img
                src={form.cover_image_url}
                alt="Cover preview"
                className="h-24 w-auto rounded-lg border border-slate-200 object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </Section>

        {/* ── Spec sections — generated from schema ────────────────────────── */}
        {(['overview', 'efficiency', 'performance', 'connectivity', 'safety', 'narrative'] as const).map((cat) => {
          const cols = SPEC_COLUMN_DEFS.filter((d) => d.category === cat);
          const catTitle = cat.charAt(0).toUpperCase() + cat.slice(1);
          return (
            <Section key={cat} title={catTitle} defaultOpen={false}>
              {cols.map((def) => {
                const val = form.specs[def.key] ?? '';
                const inheritedVal = baseVehicle && form.row_type === 'VARIANT'
                  ? baseVehicle.specs[def.key]
                  : null;
                const enumList = CONTROLLED_SPEC_ENUMS[def.key];
                return (
                  <Field key={def.key} label={def.label}>
                    {enumList ? (
                      <>
                        <EnumSelect
                          value={val}
                          options={enumList}
                          placeholder={`Select ${def.label.toLowerCase()}`}
                          onChange={(value) => setSpec(def.key, value)}
                        />
                        {inheritedVal && !val && (
                          <p className="text-xs text-slate-400 mt-1">
                            Inherits: {labelFor(inheritedVal, enumList)}
                          </p>
                        )}
                      </>
                    ) : def.multiline ? (
                      <textarea
                        value={val}
                        onChange={(e) => setSpec(def.key, e.target.value)}
                        className={TEXTAREA}
                        placeholder={inheritedVal ? `Inherits: ${inheritedVal}` : undefined}
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setSpec(def.key, e.target.value)}
                        className={INPUT}
                        placeholder={inheritedVal ? `Inherits: ${inheritedVal}` : undefined}
                      />
                    )}
                  </Field>
                );
              })}
            </Section>
          );
        })}

        {/* ── Save bar ─────────────────────────────────────────────────────── */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 -mx-6 flex items-center justify-between gap-3">
          {saveError && <p className="text-xs text-red-600 flex-1">{saveError}</p>}
          {saveSuccess && <p className="text-xs text-emerald-600 flex-1">Saved</p>}
          {!saveError && !saveSuccess && <div className="flex-1" />}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate(returnToList)}
              className="h-9 px-4 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Option Packs section (BASE only) ────────────────────────────── */}
      {!isNew && form.row_type === 'BASE' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Option Packs</h2>
            <button
              onClick={() => { setAddPackCode(''); setAddPackName(''); setAddPackError(null); setShowAddPack(true); }}
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add pack
            </button>
          </div>

          {packRows.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center bg-white border border-slate-200 rounded-xl">No packs</p>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Code</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Price</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Updated</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {packRows.map((p) => {
                    const packName = p.specs['pack_name'] || p.license_note || p.variant_code || p.id;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">{p.variant_code}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">{packName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {p.price_aud != null ? `$${p.price_aud.toLocaleString()}` : <span className="text-slate-400">Inherited</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(p.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => onNavigate(`/admin/cars/${encodeURIComponent(p.id)}${listQuery}`)}
                              title="Edit"
                              className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {p.status === 'archived' ? (
                              <button
                                onClick={() => handleRestoreVariant(p.id)}
                                title="Restore"
                                className="p-1.5 rounded border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmArchiveId(p.id)}
                                title="Archive"
                                className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Variants section (BASE only, excludes packs) ──────────────────── */}
      {!isNew && form.row_type === 'BASE' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Variants</h2>
            <button
              onClick={() => onNavigate(`/admin/cars/new?base=${encodeURIComponent(form.id)}${listQuery ? `&${listQuery.slice(1)}` : ''}`)}
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add variant
            </button>
          </div>

          {nonPackRows.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center bg-white border border-slate-200 rounded-xl">No variants</p>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">ID</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Code</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Price</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Updated</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nonPackRows.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.id}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{v.variant_code}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {v.price_aud != null ? `$${v.price_aud.toLocaleString()}` : <span className="text-slate-400">Inherited</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(v.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => onNavigate(`/admin/cars/${encodeURIComponent(v.id)}${listQuery}`)}
                            title="Edit"
                            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {v.status === 'archived' ? (
                            <button
                              onClick={() => handleRestoreVariant(v.id)}
                              title="Restore"
                              className="p-1.5 rounded border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmArchiveId(v.id)}
                              title="Archive"
                              className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {confirmArchiveId && (
        <ConfirmDialog
          title="Archive?"
          message="The row will be moved to the graveyard. You can restore it at any time."
          confirmLabel="Archive"
          confirmDestructive
          onConfirm={handleArchiveVariant}
          onCancel={() => setConfirmArchiveId(null)}
        />
      )}

      {/* ── Add pack dialog ───────────────────────────────────────────────── */}
      {showAddPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddPack(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Add option pack</h2>
            <p className="text-sm text-slate-500 mb-4">
              Creates a VARIANT row with <code className="text-xs bg-slate-100 px-1 rounded">admin_variant_kind=pack</code>. The variant code is appended to the base ID.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Variant code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addPackCode}
                  onChange={(e) => { setAddPackCode(e.target.value); setAddPackError(null); }}
                  placeholder="_msport"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  autoFocus
                />
                {addPackCode.trim() && (
                  <p className="text-xs text-slate-400 mt-1">
                    ID: <code className="text-xs">{form.id}{addPackCode.trim()}</code>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pack name</label>
                <input
                  type="text"
                  value={addPackName}
                  onChange={(e) => setAddPackName(e.target.value)}
                  placeholder="M Sport Package"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
            {addPackError && <p className="text-xs text-red-600 mt-3">{addPackError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowAddPack(false)}
                disabled={addPackSaving}
                className="h-9 px-4 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPack}
                disabled={!addPackCode.trim() || addPackSaving}
                className="h-9 px-4 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {addPackSaving ? 'Creating…' : 'Create & edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
