'use strict';
// CSV/XLSX parser for monthly category data.
// Supports EnSoGo v2 templates (Month + Year columns), legacy v1 (Start Date), generic CSV/XLSX.
//
// V2 validation (throws on errors — caller surfaces as popup):
//   1. Invalid month format  => "Enter correct month format"
//   2. Invalid year format   => "Invalid year format. Data cannot be added."
//   3. Multiple years in file => "Different years cannot be uploaded together."
//   - Water/Waste: subfields optional.
//   - All other templates: every data column mandatory; rows with missing fields skipped.

const fs      = require('fs');
const path    = require('path');
const { parse: parseCsv } = require('csv-parse/sync');
const ExcelJS = require('exceljs');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const norm = (s) => String(s == null ? '' : s).toLowerCase().trim().replace(/[\s\-_]+/g, '');

function defaultUnitFor(cat) {
  const map = { electricity: 'kWh', water: 'KL', fuel: 'litres', waste: 'kg', refrigerants: 'kg', transport: 'tonne-km' };
  return map[cat] || null;
}

function numVal(raw) {
  if (raw === null || raw === undefined || raw === '') return NaN;
  return parseFloat(String(raw).replace(/[,\s]/g, ''));
}

// Returns true when a cell has content but that content cannot be parsed as a
// finite number — i.e. the user put text ("N/A", "TBD", "#REF!") in a numeric
// calculation field.  Empty / null / undefined cells are NOT invalid.
function isInvalidValue(raw) {
  if (raw === null || raw === undefined || raw === '') return false;
  const s = String(raw).trim();
  if (!s) return false;
  return !Number.isFinite(parseFloat(s.replace(/[,\s]/g, '')));
}

// ---------------------------------------------------------------------------
// Strict month / year parsers (v2 templates)
// ---------------------------------------------------------------------------
// "Sept" valid for September; "Sep" intentionally excluded.
const STRICT_MONTH_MAP = {
  january:1, jan:1, february:2, feb:2, march:3, mar:3,
  april:4, apr:4, may:5, june:6, jun:6, july:7, jul:7,
  august:8, aug:8, september:9, sept:9,
  october:10, oct:10, november:11, nov:11, december:12, dec:12,
};

// { value: 1-12, invalid:false } | { value:null, invalid:false } blank | { value:null, invalid:true } bad format
function parseMonthStrict(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null, invalid: false };
  const str = String(raw).trim();
  if (!str) return { value: null, invalid: false };
  const n = STRICT_MONTH_MAP[str.toLowerCase()];
  if (n !== undefined) return { value: n, invalid: false };
  return { value: null, invalid: true };
}

// { value: yyyy, invalid:false } | blank | bad format
function parseYearStrict(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null, invalid: false };
  const str = String(raw).trim();
  if (!str) return { value: null, invalid: false };
  if (/^\d{4}$/.test(str)) {
    const n = parseInt(str, 10);
    if (n >= 1000 && n <= 9999) return { value: n, invalid: false };
  }
  return { value: null, invalid: true };
}

// ---------------------------------------------------------------------------
// V2 template detection
// ---------------------------------------------------------------------------
function detectV2Template(headerRow) {
  const cells = headerRow.map((c) => String(c || '').trim().toLowerCase());
  const has = (kw) => cells.some((c) => c.includes(kw));
  if (has('monthly kwh'))             return 'electricity';
  if (has('monthly kl by source'))    return 'water';
  if (has('monthly kg by type'))      return 'waste';
  if (has('fleet fuel consumption'))  return 'transport';
  if (has('annual refrigerant type') || has('refrigerant type')) return 'refrigerants';
  if (has('monthly diesel litres'))   return 'fuel';
  return null;
}

// ---------------------------------------------------------------------------
// V2 template row parser — sub-functions
// ---------------------------------------------------------------------------

/**
 * Locate the V2 header row (containing 'month' and 'year'), detect template type,
 * resolve column positions and any sub-header row (Water/Waste).
 * Returns null if this is not a V2 template or does not match `category`.
 * Returns { ttype, monthCol, yearCol, cols, dataStart } on success.
 */
function findV2HeaderInfo(rows2d, category) {
  let headerIdx = -1;
  for (let i = 0; i < rows2d.length; i++) {
    const row      = rows2d[i];
    const hasMonth = row.some((c) => String(c || '').trim().toLowerCase() === 'month');
    const hasYear  = row.some((c) => String(c || '').trim().toLowerCase() === 'year');
    if (hasMonth && hasYear) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return null;

  const header = rows2d[headerIdx];
  const ttype  = detectV2Template(header);
  if (!ttype) return null;
  if (category && ttype !== category) return null;

  let monthCol = -1, yearCol = -1;
  for (let i = 0; i < header.length; i++) {
    const lc = String(header[i] || '').trim().toLowerCase();
    if (lc === 'month') monthCol = i;
    if (lc === 'year')  yearCol  = i;
  }

  // Sub-header row detection: Water/Waste templates have a row of sub-column names
  // immediately after the header row. The EnSoGo templates repeat the literal labels
  // "Month" and "Year" in the sub-header's first two cells — so we treat those as
  // equivalent to empty (i.e. the cell is a label, not a data value).
  const subMap = {};
  const probeRow       = rows2d[headerIdx + 1] || [];
  const probeMonthStr  = String(probeRow[monthCol] || '').trim().toLowerCase();
  const probeYearStr   = String(probeRow[yearCol]  || '').trim().toLowerCase();
  const probeMonthIsLabel = probeMonthStr === '' || probeMonthStr === 'month';
  const probeYearIsLabel  = probeYearStr  === '' || probeYearStr  === 'year';
  if (probeMonthIsLabel && probeYearIsLabel) {
    probeRow.forEach((cell, i) => {
      if (i === monthCol || i === yearCol) return;  // skip the label columns
      const cellValue = String(cell || '').trim();
      if (cellValue) subMap[i] = cellValue.toLowerCase();
    });
  }
  const hasSub    = Object.keys(subMap).length > 0;
  const dataStart = hasSub ? headerIdx + 2 : headerIdx + 1;

  // Data column definitions: [{colIdx, name}]
  const cols = [];
  if (hasSub) {
    Object.keys(subMap).forEach((ci) => cols.push({ colIdx: parseInt(ci, 10), name: subMap[ci] }));
  } else {
    header.forEach((cell, i) => {
      if (i === monthCol || i === yearCol) return;
      const name = String(cell || '').trim().toLowerCase();
      if (name) cols.push({ colIdx: i, name });
    });
  }

  return { ttype, monthCol, yearCol, cols, dataStart };
}

/**
 * First-pass validation over data rows: parse month/year, skip blanks,
 * and throw on invalid month format, invalid year format, or multi-year upload.
 * Returns array of { row, month, year } for valid rows.
 */
function validateV2DataRows(rows2d, dataStart, monthCol, yearCol) {
  let hasInvalidMonth = false;
  let hasInvalidYear  = false;
  const parsed = [];

  for (let r = dataStart; r < rows2d.length; r++) {
    const row = rows2d[r];
    if (!row || !row.length) continue;
    if (row.every((c) => c === null || c === undefined || c === '')) continue;
    // Skip any repeated header/label row (e.g. "Month" | "Year" | sub-column names)
    if (String(row[monthCol] || '').trim().toLowerCase() === 'month') continue;

    const mr = parseMonthStrict(row[monthCol]);
    const yr = parseYearStrict(String(row[yearCol] == null ? '' : row[yearCol]));

    if (mr.invalid) { hasInvalidMonth = true; continue; }
    if (yr.invalid) { hasInvalidYear  = true; continue; }
    if (mr.value === null || yr.value === null) continue;

    parsed.push({ row, month: mr.value, year: yr.value });
  }

  if (hasInvalidMonth) { const e = new Error('Enter correct month format'); e.status = 400; throw e; }
  if (hasInvalidYear)  { const e = new Error('Invalid year format. Data cannot be added.'); e.status = 400; throw e; }
  const uniqueYears = [...new Set(parsed.map((p) => p.year))];
  if (uniqueYears.length > 1) { const e = new Error('Different years cannot be uploaded together.'); e.status = 400; throw e; }

  return parsed;
}

/**
 * Build one record for optional-column templates (water, waste) where multiple
 * columns are summed into a single total. Returns null to skip the row.
 */
function buildV2OptionalRecord(row, month, year, cols, ttype, invalidValueRows) {
  let total = 0;
  const parts = [];
  let rowHasInvalid = false;

  for (const { colIdx: ci, name } of cols) {
    const raw = row[ci];
    if (raw === null || raw === undefined || String(raw).trim() === '') continue;
    if (isInvalidValue(raw)) {
      if (invalidValueRows) invalidValueRows.push({ month, year, column: name, rawValue: String(raw).trim() });
      rowHasInvalid = true;
    } else {
      const n = numVal(raw);
      if (isFinite(n)) { total += n; parts.push(name + ': ' + n); }
    }
  }

  if (rowHasInvalid || !parts.length) return null;
  return { month, year, value: Math.round(total * 100) / 100, unit: defaultUnitFor(ttype), notes: parts.join('; ') };
}

/**
 * Build one record for strict-column templates (electricity, fuel, refrigerants,
 * transport). Returns null to skip the row.
 * Transport rows may have only some sub-columns filled — partial rows are allowed.
 */
function buildV2DataRecord(row, month, year, cols, ttype, invalidValueRows) {
  // Strict completeness check — all columns must be filled, except for transport
  if (ttype !== 'transport') {
    const allFilled = cols.every(({ colIdx: ci }) => {
      const v = row[ci];
      return v !== null && v !== undefined && String(v).trim() !== '';
    });
    if (!allFilled) return null;
  }

  const fNum = (kw) => { const col = cols.find((c) => c.name.includes(kw)); return col ? numVal(row[col.colIdx]) : NaN; };
  const fStr = (kw) => { const col = cols.find((c) => c.name.includes(kw)); return col ? String(row[col.colIdx] || '').trim() : ''; };
  const fRaw = (kw) => { const col = cols.find((c) => c.name.includes(kw)); return col !== undefined ? row[col.colIdx] : undefined; };

  if (ttype === 'electricity') {
    const rawKwh = fRaw('kwh');
    if (rawKwh !== undefined && isInvalidValue(rawKwh)) {
      if (invalidValueRows) invalidValueRows.push({ month, year, column: 'kWh', rawValue: String(rawKwh).trim() });
      return null;
    }
    const kwh = fNum('kwh');
    if (!isFinite(kwh)) return null;
    const rec = { month, year, value: Math.round(kwh * 100) / 100, unit: 'kWh' };
    const cost = fNum('cost');          if (isFinite(cost)) rec.cost         = cost;
    const peak = fNum('peak');          if (isFinite(peak)) rec.peakDemandKva = peak;
    const pf   = fNum('power factor');  if (isFinite(pf))   rec.powerFactor   = pf;
    const meter = fStr('meter');        if (meter) rec.notes = meter;
    return rec;
  }

  if (ttype === 'fuel') {
    const rawDiesel = fRaw('diesel');
    if (rawDiesel !== undefined && isInvalidValue(rawDiesel)) {
      if (invalidValueRows) invalidValueRows.push({ month, year, column: 'Diesel litres', rawValue: String(rawDiesel).trim() });
      return null;
    }
    const dieselLitres = fNum('diesel');
    // PNG/CNG — accept several common column-header variants
    let pngCngLitres = fNum('png');
    if (!isFinite(pngCngLitres)) pngCngLitres = fNum('cng');
    if (!isFinite(pngCngLitres)) pngCngLitres = fNum('natural gas');
    if (!isFinite(pngCngLitres)) pngCngLitres = fNum('gas');
    if (!isFinite(pngCngLitres)) pngCngLitres = fNum('lng');

    const dieselVal = isFinite(dieselLitres) ? Math.round(dieselLitres * 100) / 100 : 0;
    const pngCngVal = isFinite(pngCngLitres) ? Math.round(pngCngLitres * 100) / 100 : 0;
    if (dieselVal === 0 && pngCngVal === 0) return null;

    const rec = { month, year, value: dieselVal, unit: 'litres' };
    if (pngCngVal > 0) rec.pngCng = pngCngVal;
    const runtime = fNum('runtime');
    if (isFinite(runtime)) rec.notes = 'Runtime hours: ' + runtime;
    const cost = fNum('cost'); if (isFinite(cost)) rec.cost = cost;
    return rec;
  }

  if (ttype === 'refrigerants') {
    const rawQty = fRaw('quantity') !== undefined ? fRaw('quantity') : fRaw('kg');
    if (rawQty !== undefined && isInvalidValue(rawQty)) {
      if (invalidValueRows) invalidValueRows.push({ month, year, column: 'Refrigerant quantity', rawValue: String(rawQty).trim() });
      return null;
    }
    let qty = fNum('quantity');
    if (!isFinite(qty)) qty = fNum('kg');
    if (!isFinite(qty)) return null;
    const rec = { month, year, value: Math.round(qty * 100) / 100, unit: 'kg' };
    const refType = fStr('refrigerant type') || fStr('annual');
    if (refType) rec.source = refType;
    return rec;
  }

  if (ttype === 'transport') {
    const rawVkm = fRaw('vehicle km') !== undefined ? fRaw('vehicle km') : fRaw(' km');
    if (rawVkm !== undefined && isInvalidValue(rawVkm)) {
      if (invalidValueRows) invalidValueRows.push({ month, year, column: 'Vehicle km', rawValue: String(rawVkm).trim() });
      return null;
    }
    let vehicleKm = fNum('vehicle km'); if (!isFinite(vehicleKm)) vehicleKm = fNum(' km');
    let fleetFuel = fNum('fleet fuel'); if (!isFinite(fleetFuel)) fleetFuel = fNum('fuel');
    let cargo     = fNum('cargo');      if (!isFinite(cargo))     cargo     = fNum('logistics');

    // At least one subcategory must have a valid numeric value
    if (!isFinite(vehicleKm) && !isFinite(fleetFuel) && !isFinite(cargo)) return null;

    const vkmVal      = isFinite(vehicleKm) ? Math.round(vehicleKm * 100) / 100 : 0;
    const fleetFuelVal = isFinite(fleetFuel) ? Math.round(fleetFuel * 100) / 100 : 0;
    const cargoVal    = isFinite(cargo)     ? Math.round(cargo     * 100) / 100 : 0;

    const rec = { month, year, value: vkmVal, unit: 'tonne-km' };
    if (fleetFuelVal > 0) rec.fleetFuel = fleetFuelVal;
    if (cargoVal     > 0) rec.cargo     = cargoVal;
    const noteParts = [];
    if (fleetFuelVal > 0) noteParts.push('Fleet fuel: ' + fleetFuelVal + ' L');
    if (cargoVal     > 0) noteParts.push('Cargo: '      + cargoVal     + ' t-km');
    if (noteParts.length) rec.notes = noteParts.join('; ');
    return rec;
  }

  return null;
}

/**
 * V2 template row parser — orchestrator.
 * Returns array of records, null if not recognised, or throws on validation errors.
 */
function parseV2TemplateRows(rows2d, category, invalidValueRows) {
  const headerInfo = findV2HeaderInfo(rows2d, category);
  if (!headerInfo) return null;

  const { ttype, monthCol, yearCol, cols, dataStart } = headerInfo;
  const validRows  = validateV2DataRows(rows2d, dataStart, monthCol, yearCol);
  const isOptional = ttype === 'water' || ttype === 'waste';
  const records    = [];

  for (const { row, month, year } of validRows) {
    const record = isOptional
      ? buildV2OptionalRecord(row, month, year, cols, ttype, invalidValueRows)
      : buildV2DataRecord(row, month, year, cols, ttype, invalidValueRows);
    if (record) records.push(record);
  }

  return records;
}

// ---------------------------------------------------------------------------
// Legacy v1 template parser (Start Date column) — shared helpers
// ---------------------------------------------------------------------------
const MONTH_NAMES = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function parseMonth(s) {
  if (s === null || s === undefined || s === '') return null;
  const str = String(s).trim();
  const n = parseInt(str, 10);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
  const m = str.toLowerCase().slice(0, 3);
  const i = MONTH_NAMES.indexOf(m);
  return i === -1 ? null : i + 1;
}

// ---------------------------------------------------------------------------
// ExcelJS helper utilities (replace XLSX.utils.sheet_to_json / XLSX.SSF)
// ---------------------------------------------------------------------------

/**
 * Convert an Excel date serial number (e.g. 44927) to { y, m }.
 * Mirrors XLSX.SSF.parse_date_code — uses the 1900 epoch (1899-12-30 UTC).
 */
function parseExcelDateSerial(serial) {
  if (typeof serial !== 'number' || !Number.isFinite(serial) || serial <= 0) return null;
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  if (isNaN(date.getTime())) return null;
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1 };
}

/**
 * Convert an ExcelJS Worksheet to a 2-D array of plain values.
 * Replaces: XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
 */
function worksheetToRows2d(worksheet) {
  const rows2d = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    // row.values is 1-indexed; slice(1) gives a 0-indexed array
    const rawValues = Array.isArray(row.values) ? row.values.slice(1) : [];
    const cells = rawValues.map((v) => {
      if (v === null || v === undefined) return '';
      if (v instanceof Date) return v;
      if (typeof v === 'object') {
        // Formula cell — use the cached result
        if (v.formula !== undefined || v.sharedFormula !== undefined) {
          const r = v.result;
          return (r === null || r === undefined) ? '' : r;
        }
        // Rich-text cell
        if (v.richText !== undefined) return v.richText.map((rt) => rt.text || '').join('');
        // Hyperlink cell
        if (v.hyperlink !== undefined) return v.text || v.hyperlink || '';
        // Error cell
        if (v.error !== undefined) return '';
      }
      return v;
    });
    // Trim trailing empty cells
    while (cells.length > 0 && (cells[cells.length - 1] === '' || cells[cells.length - 1] === null || cells[cells.length - 1] === undefined)) cells.pop();
    rows2d.push(cells);
  });
  return rows2d;
}

/**
 * Convert a 2-D rows array to an array of header-keyed objects.
 * Replaces: XLSX.utils.sheet_to_json(ws, { defval: '' })
 */
function rows2dToObjects(rows2d) {
  if (rows2d.length < 2) return [];
  const headers = rows2d[0].map((h) => (h === null || h === undefined ? '' : String(h)));
  return rows2d.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h !== '') obj[h] = (row[i] === undefined || row[i] === null) ? '' : row[i];
    });
    return obj;
  });
}

function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return { year: s.getFullYear(), month: s.getMonth() + 1 };
  if (typeof s === 'number') {
    const d = parseExcelDateSerial(s);
    if (d) return { year: d.y, month: d.m };
    return null;
  }
  const str = String(s).trim();
  let m;
  m = str.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
  if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
  m = str.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (m) return { year: parseInt(m[3], 10), month: parseInt(m[1], 10) };
  m = str.match(/^(\d{1,2})[-](\d{1,2})[-](\d{4})/);
  if (m) return { year: parseInt(m[3], 10), month: parseInt(m[2], 10) };
  m = str.match(/^([A-Za-z]{3,9})[\s,-]+(\d{4})$/);
  if (m) { const month = parseMonth(m[1]); if (month) return { year: parseInt(m[2], 10), month }; }
  return null;
}

function toStandardUnit(category, value, unitRaw) {
  if (!Number.isFinite(value)) return NaN;
  const u = norm(unitRaw || '');
  if (!u) return value;
  if (category === 'electricity') {
    if (u==='kwh'||u==='kilowatthour'||u==='kilowatthours') return value;
    if (u==='mwh'||u==='megawatthour') return value * 1000;
    if (u==='gwh') return value * 1000000;
    if (u==='mj') return value / 3.6;
    if (u==='gj') return (value * 1000) / 3.6;
    return value;
  }
  if (category === 'water') {
    if (u==='kl'||u==='kilolitre'||u==='kilolitres'||u==='m3'||u==='cubicmetre'||u==='cubicmeters') return value;
    if (u==='l'||u==='litre'||u==='litres'||u==='liter'||u==='liters') return value / 1000;
    return value;
  }
  if (category === 'fuel') {
    if (u==='l'||u==='litre'||u==='litres'||u==='liter'||u==='liters') return value;
    if (u==='gal'||u==='gallon'||u==='gallons') return value * 3.78541;
    if (u==='kg'||u==='kilograms') return value;
    return value;
  }
  if (category === 'waste') {
    if (u==='kg'||u==='kilograms'||u==='kilogram') return value;
    if (u==='tonne'||u==='tonnes'||u==='mt'||u==='t') return value * 1000;
    if (u==='g'||u==='gram'||u==='grams') return value / 1000;
    return value;
  }
  if (category === 'refrigerants') {
    if (u==='kg') return value; if (u==='g') return value / 1000; return value;
  }
  if (category === 'transport') {
    if (u==='km'||u==='kilometre'||u==='kilometres') return value;
    if (u==='mi'||u==='mile'||u==='miles') return value * 1.60934;
    if (u==='tonnekm'||u==='tkm') return value;
    return value;
  }
  return value;
}

function buildRowGetter(headerRow) {
  const idx = new Map();
  headerRow.forEach((h, i) => { if (h !== null && h !== undefined && h !== '') idx.set(norm(h), i); });
  return (row, ...candidates) => {
    for (const c of candidates) {
      const i = idx.get(norm(c));
      if (i !== undefined && row[i] !== undefined && row[i] !== null && row[i] !== '') return row[i];
    }
    return undefined;
  };
}

function detectLegacyTemplate(headerRow) {
  const set = new Set(headerRow.filter(Boolean).map(norm));
  if (set.has('energyconsumption')) return 'electricity';
  if (set.has('waterwithdrawal'))   return 'water';
  if (set.has('fuelconsumption'))   return 'fuel';
  if (set.has('wastequantity'))     return 'waste';
  if (set.has('leakageamount'))     return 'refrigerants';
  if (set.has('distancetravelled')) return 'transport';
  return null;
}

function parseLegacyTemplateRows(rows2d, category, invalidValueRows) {
  let headerIdx = 0;
  while (headerIdx < rows2d.length) {
    const first = rows2d[headerIdx][0];
    if (first !== null && first !== undefined && first !== '') break;
    headerIdx++;
  }
  const header   = rows2d[headerIdx] || [];
  const detected = detectLegacyTemplate(header);
  if (!detected) return null;
  const get = buildRowGetter(header);
  const monthlyAgg = new Map();
  const skipIdx    = headerIdx + 1;

  for (let r = headerIdx + 1; r < rows2d.length; r++) {
    const row = rows2d[r];
    if (!row || !row.length) continue;
    if (r === skipIdx && typeof row[0] === 'string' && row[0].startsWith('Format:')) continue;
    if (row.every((c) => c === null || c === undefined || c === '')) continue;

    const dRaw = get(row, 'Start Date','StartDate','Res_Date','End Date','EndDate','Date','Period');
    const d = parseDate(dRaw);
    if (!d) continue;

    let valueRaw, unitRaw, extra = {};
    if (detected === 'electricity') {
      valueRaw = get(row, 'Energy Consumption'); unitRaw = get(row, 'Energy Unit');
    } else if (detected === 'water') {
      valueRaw = get(row, 'Water Withdrawal'); unitRaw = get(row, 'Unit');
      extra.dischargedTreated   = parseFloat(get(row, 'Total Water Discharged Treated'))   || 0;
      extra.dischargedUntreated = parseFloat(get(row, 'Total Water Discharged Untreated')) || 0;
      extra.source = get(row, 'Water Source');
    } else if (detected === 'fuel') {
      valueRaw = get(row, 'Fuel Consumption'); unitRaw = get(row, 'Fuel Unit');
      extra.fuelType = get(row, 'Fuel Type');
    } else if (detected === 'waste') {
      valueRaw = get(row, 'Waste Quantity'); unitRaw = get(row, 'Waste Unit');
      extra.wasteType = get(row, 'Waste Type'); extra.disposalMethod = get(row, 'Disposal Method');
    } else if (detected === 'refrigerants') {
      valueRaw = get(row, 'Leakage Amount'); unitRaw = get(row, 'Leakage Unit');
      extra.refrigerantType = get(row, 'Refrigerant Type');
    } else if (detected === 'transport') {
      valueRaw = get(row, 'Distance Travelled'); unitRaw = get(row, 'Distance Unit');
      extra.transportMode = get(row, 'Transport Mode');
      extra.fuelType = get(row, 'Fuel Type');
      extra.fuelConsumed = parseFloat(get(row, 'Fuel Consumed')) || 0;
    }

    const value = parseFloat(String(valueRaw == null ? '' : valueRaw).replace(/[,\s]/g, ''));
    if (!Number.isFinite(value)) {
      if (invalidValueRows && isInvalidValue(valueRaw))
        invalidValueRows.push({ year: d.year, month: d.month, column: detected, rawValue: String(valueRaw).trim() });
      continue;
    }
    const std = toStandardUnit(detected, value, unitRaw);
    const key = d.year + '-' + String(d.month).padStart(2, '0');

    if (!monthlyAgg.has(key)) {
      monthlyAgg.set(key, { year: d.year, month: d.month, value: 0, unit: defaultUnitFor(detected), rowsAggregated: 0,
        extras: Object.assign({}, extra, { dischargedTreated:0, dischargedUntreated:0, fuelConsumed:0 }) });
    }
    const slot = monthlyAgg.get(key);
    slot.value += std; slot.rowsAggregated++;
    if (Number.isFinite(extra.dischargedTreated))   slot.extras.dischargedTreated   += extra.dischargedTreated;
    if (Number.isFinite(extra.dischargedUntreated)) slot.extras.dischargedUntreated += extra.dischargedUntreated;
    if (Number.isFinite(extra.fuelConsumed))        slot.extras.fuelConsumed        += extra.fuelConsumed;
    if (extra.fuelType        && !slot.extras.fuelType)        slot.extras.fuelType        = extra.fuelType;
    if (extra.wasteType       && !slot.extras.wasteType)       slot.extras.wasteType       = extra.wasteType;
    if (extra.disposalMethod  && !slot.extras.disposalMethod)  slot.extras.disposalMethod  = extra.disposalMethod;
    if (extra.refrigerantType && !slot.extras.refrigerantType) slot.extras.refrigerantType = extra.refrigerantType;
    if (extra.source          && !slot.extras.source)          slot.extras.source          = extra.source;
    if (extra.transportMode   && !slot.extras.transportMode)   slot.extras.transportMode   = extra.transportMode;
  }

  const out = [];
  monthlyAgg.forEach((slot) => {
    const rec = { month: slot.month, year: slot.year, value: Math.round(slot.value * 100) / 100, unit: slot.unit,
      notes: 'Aggregated from ' + slot.rowsAggregated + ' row(s).' +
        (slot.extras.refrigerantType ? ' Type: ' + slot.extras.refrigerantType + '.' : '') +
        (slot.extras.wasteType ? ' Type: ' + slot.extras.wasteType + '.' : '') };
    const src = slot.extras.refrigerantType || slot.extras.wasteType || slot.extras.fuelType || slot.extras.transportMode;
    if (src) rec.source = src;
    out.push(rec);
  });
  return out;
}

// ---------------------------------------------------------------------------
// Generic fallback
// ---------------------------------------------------------------------------
const VALUE_COL_KEYWORDS = ['value','consumption','amount','qty','quantity','units','kwh','mwh','kl','litres','liters','kg','reading','meter','total'];

function pickValueGeneric(row) {
  for (const kw of VALUE_COL_KEYWORDS) {
    for (const key of Object.keys(row)) {
      if (norm(key) === kw) { const n = parseFloat(String(row[key]).replace(/[,\s]/g, '')); if (Number.isFinite(n)) return n; }
    }
  }
  return NaN;
}

function genericLongRow(row, defaultUnit, invalidValueRows) {
  let month, year;
  for (const k of Object.keys(row)) {
    if (norm(k) === 'month') month = parseMonth(row[k]);
    if (norm(k) === 'year')  year  = parseInt(row[k], 10);
  }
  if (!month || !year) {
    for (const k of Object.keys(row)) {
      if (['period','date','startdate','monthyear'].includes(norm(k))) {
        const d = parseDate(row[k]); if (d) { month = d.month; year = d.year; break; }
      }
    }
  }
  const value = pickValueGeneric(row);
  if (!month || !year) return null;
  if (!Number.isFinite(value)) {
    // Check if a value-keyword column has a non-empty non-numeric entry
    if (invalidValueRows) {
      for (const kw of VALUE_COL_KEYWORDS) {
        for (const key of Object.keys(row)) {
          if (norm(key) === kw && isInvalidValue(row[key])) {
            invalidValueRows.push({ month, year, column: key, rawValue: String(row[key]).trim() });
            break;
          }
        }
      }
    }
    return null;
  }
  return { month, year, value, unit: defaultUnit || null };
}

function parseGenericRows(rows, defaultUnit, invalidValueRows) {
  const out = [];
  for (const r of rows) { const n = genericLongRow(r, defaultUnit, invalidValueRows); if (n) out.push(n); }
  return out;
}

// ---------------------------------------------------------------------------
// PDF heuristic extractor
// ---------------------------------------------------------------------------
function parsePdfText(text, category) {
  const lines = text.split(/\r?\n/);
  const monthly = new Map();

  function pushMatch(year, month, valueRaw) {
    if (!Number.isInteger(year) || year < 1990 || year > 2100) return;
    if (!Number.isInteger(month) || month < 1 || month > 12) return;
    const value = parseFloat(String(valueRaw).replace(/[,\s]/g, ''));
    if (!Number.isFinite(value) || value <= 0 || value > 1e10) return;
    const k = year + '-' + String(month).padStart(2, '0');
    if (!monthly.has(k)) monthly.set(k, { year, month, value: 0, count: 0 });
    const slot = monthly.get(k); slot.value += value; slot.count++;
  }

  for (const ln of lines) {
    if (!ln || !ln.trim()) continue;
    let m, match, nm;
    m = [...ln.matchAll(/\b([A-Za-z]{3,9})\s+(\d{4})\b/g)];
    for (match of m) { nm = ln.slice(match.index + match[0].length).match(/[-+]?[0-9][0-9,]*\.?\d*/); if (nm) pushMatch(parseInt(match[2],10), parseMonth(match[1]), nm[0]); }
    m = [...ln.matchAll(/\b(\d{4})[-/](\d{1,2})\b/g)];
    for (match of m) { nm = ln.slice(match.index + match[0].length).match(/[-+]?[0-9][0-9,]*\.?\d*/); if (nm) pushMatch(parseInt(match[1],10), parseInt(match[2],10), nm[0]); }
    m = [...ln.matchAll(/\b(\d{1,2})\/(\d{4})\b/g)];
    for (match of m) { nm = ln.slice(match.index + match[0].length).match(/[-+]?[0-9][0-9,]*\.?\d*/); if (nm) pushMatch(parseInt(match[2],10), parseInt(match[1],10), nm[0]); }
  }

  const out = [];
  monthly.forEach((slot) => {
    out.push({ month: slot.month, year: slot.year, value: Math.round(slot.value*100)/100, unit: defaultUnitFor(category),
      notes: 'Extracted from PDF (' + slot.count + ' match' + (slot.count!==1?'es':'') + ' on the page).' });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
// Returns { records: MonthlyRecord[], invalidValueRows: InvalidRow[] }
// invalidValueRows: rows that had a valid month+year but a non-numeric value in a
// calculation column — callers should surface these as "Invalid data entered" errors.
async function parseFile(filePath, category) {
  const ext    = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  const invalidValueRows = []; // shared accumulator passed into every sub-parser

  if (ext === '.xlsx' || ext === '.xls' || ext === '.xlsm') {
    const workbook = new ExcelJS.Workbook();
    try {
      if (ext === '.xlsx' || ext === '.xlsm') {
        await workbook.xlsx.load(buffer);
      } else {
        // .xls (legacy binary format) — ExcelJS does not support it natively;
        // attempt xlsx load as a graceful fallback (some .xls are actually xlsx).
        try { await workbook.xlsx.load(buffer); }
        catch (_xlsErr) { return { records: [], invalidValueRows }; }
      }
    } catch (_loadErr) {
      return { records: [], invalidValueRows };
    }
    for (const worksheet of workbook.worksheets) {
      const rows2d = worksheetToRows2d(worksheet);
      const v2 = parseV2TemplateRows(rows2d, category, invalidValueRows); // may throw
      if (v2 !== null) return { records: v2, invalidValueRows };
      const v1 = parseLegacyTemplateRows(rows2d, category, invalidValueRows);
      if (v1 && v1.length) return { records: v1, invalidValueRows };
      const generic = parseGenericRows(rows2dToObjects(rows2d), defaultUnitFor(category), invalidValueRows);
      if (generic.length) return { records: generic, invalidValueRows };
    }
    return { records: [], invalidValueRows };
  }

  if (ext === '.csv' || ext === '.txt') {
    const rows = parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true });
    const gen  = parseGenericRows(rows, defaultUnitFor(category), invalidValueRows);
    if (gen.length) return { records: gen, invalidValueRows };
    const hl = parseCsv(buffer, { columns: false, to_line: 1, trim: true });
    if (hl.length && detectLegacyTemplate(hl[0])) {
      const r2d  = parseCsv(buffer, { columns: false, skip_empty_lines: true, trim: true });
      const tmpl = parseLegacyTemplateRows(r2d, category, invalidValueRows);
      if (tmpl) return { records: tmpl, invalidValueRows };
    }
    return { records: [], invalidValueRows };
  }

  if (ext === '.pdf') {
    try {
      // eslint-disable-next-line global-require
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      const recs = parsePdfText(data.text || '', category);
      if (recs.length) return { records: recs, invalidValueRows };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[fileParser] PDF parse failed:', err.message);
    }
    return { records: [], invalidValueRows };
  }

  return { records: [], invalidValueRows };
}

module.exports = { parseFile, parseMonth, parseDate, toStandardUnit, defaultUnitFor, parseMonthStrict, parseYearStrict, STRICT_MONTH_MAP };
