# Option Packs — VARIANT row model

Option packs are represented as **VARIANT rows**. There are no dedicated pack columns on `admin_vehicles`. A BASE row represents a trim as sold; each VARIANT row under it represents a specific pack configuration with a full `price_aud`.

---

## Data model

Packs use the same fields as any other VARIANT row:

| Column | Type | Description |
|---|---|---|
| `row_type` | `TEXT` | `VARIANT` for pack configurations |
| `base_id` | `TEXT` | ID of the BASE trim this pack belongs to |
| `variant_code` | `TEXT` | Short code identifying the pack combination (e.g. `_msport`) |
| `id` | `TEXT` | Derived as `base_id + variant_code` |
| `price_aud` | `NUMERIC` | **Full price** for this configuration (not a delta) |
| `specs` | `JSONB` | Only overridden specs — null fields inherit from BASE at render time |

**Inheritance rule:**
- VARIANT null spec fields → inherit from BASE at render time
- VARIANT non-null spec fields → override BASE

---

## CSV serialisation

Pack VARIANT rows appear in the same CSV as BASE rows, using the same column layout.

```
row_type,base_id,variant_code,id,make,model,year,body_type,status,price_aud,...
BASE,bmw-320i-2024,,bmw-320i-2024,BMW,3 Series,2024,Sedan,live,69900,...
VARIANT,bmw-320i-2024,_msport,bmw-320i-2024_msport,,,,,,73900,...
VARIANT,bmw-320i-2024,_msport_tech,bmw-320i-2024_msport_tech,,,,,,78900,...
```

### Key points

1. **BASE row** defines the canonical trim with all required spec fields.
2. **VARIANT rows** set `variant_code` (must be non-empty), `price_aud`, and any overridden specs.
3. VARIANT rows leave most spec fields blank — they inherit from BASE at render time.
4. `price_aud` on each VARIANT is the **full price** for that configuration, not a delta.
5. Blank in CSV = `null` in DB = inherit from BASE.

---

## Blank field behaviour

| Context | Blank field | Result |
|---|---|---|
| BASE import | blank in CSV | Preserve existing DB value |
| VARIANT import | blank in CSV | Store `null` → inherit from BASE at render time |

---

## Admin UI

- **Cars list** → "Show variants" toggle reveals VARIANT rows with Type badge and Base/Code columns.
- **Car edit (BASE)** → "Variants" section lists all VARIANT rows with Edit/Archive actions and "Add variant" button.
- **Car edit (VARIANT)** → "Show resolved" button previews the merged BASE+VARIANT record.
